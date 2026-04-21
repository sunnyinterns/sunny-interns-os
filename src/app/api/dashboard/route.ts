import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const STAGE_LABELS: Record<string, string> = {
  lead: 'Lead',
  rdv_booked: 'RDV booked',
  qualification_done: 'Qualification done',
  job_submitted: 'Job submitted',
  job_retained: 'Job retained',
  convention_signed: 'Convention signed',
  payment_pending: 'Payment pending',
  payment_received: 'Payment received',
  visa_docs_sent: 'Visa docs sent',
  visa_submitted: 'Visa submitted',
  visa_in_progress: 'Visa in progress',
  visa_received: 'Visa received',
  arrival_prep: 'Departure prep',
  active: 'Active',
  alumni: 'Alumni',
  completed: 'Completed',
}

function daysBetween(from: string | null, to: Date): number | null {
  if (!from) return null
  return Math.floor((to.getTime() - new Date(from).getTime()) / 86400000)
}

export async function GET() {
  try {
    const supabase = getServiceClient()
    const now = new Date()

    // Fetch all active cases with interns + jobs
    const { data: cases, error: casesErr } = await supabase
      .from('cases')
      .select(`
        id, status, created_at, updated_at,
        desired_start_date, actual_start_date, actual_end_date,
        payment_date, payment_amount,
        visa_submitted_to_agent_at, flight_number,
        chauffeur_reserve, convention_signee_check,
        assigned_manager_name,
        interns(first_name, last_name, email, main_desired_job),
        schools(name),
        packages(name)
      `)
      .not('status', 'in', '(not_interested,no_job_found,lost)')
      .order('created_at', { ascending: false })

    if (casesErr) return NextResponse.json({ error: casesErr.message }, { status: 500 })
    const allCases = cases ?? []

    // ── Today Actions ──
    const today_actions: {
      case_id: string; intern_name: string; action: string;
      reason: string; priority: 'urgent' | 'today' | 'week';
      case_status: string; days_in_stage: number | null
    }[] = []

    for (const c of allCases) {
      const internRaw = c.interns as any
      const intern = Array.isArray(internRaw) ? internRaw[0] : internRaw
      const name = intern ? `${intern.first_name} ${intern.last_name}` : '—'
      const daysInStage = daysBetween(c.updated_at, now)

      if (c.status === 'convention_signed') {
        const daysSinceUpdate = daysBetween(c.updated_at, now) ?? 0
        if (!c.payment_date || daysSinceUpdate > 2) {
          today_actions.push({
            case_id: c.id, intern_name: name, action: 'Send invoice',
            reason: c.payment_date ? `Invoice sent ${daysSinceUpdate}d ago` : 'Convention signed, no invoice yet',
            priority: 'urgent', case_status: c.status, days_in_stage: daysInStage
          })
        }
      }

      if (c.status === 'payment_received' && !c.visa_submitted_to_agent_at) {
        today_actions.push({
          case_id: c.id, intern_name: name, action: 'Start visa process',
          reason: 'Payment received, visa not started',
          priority: 'today', case_status: c.status, days_in_stage: daysInStage
        })
      }

      if (c.status === 'visa_received' && !c.flight_number) {
        today_actions.push({
          case_id: c.id, intern_name: name, action: 'Confirm flight details',
          reason: 'Visa received, no flight booked',
          priority: 'today', case_status: c.status, days_in_stage: daysInStage
        })
      }

      if (c.status === 'visa_in_progress' && c.visa_submitted_to_agent_at) {
        const daysSince = daysBetween(c.visa_submitted_to_agent_at, now)
        if (daysSince !== null && daysSince > 10) {
          today_actions.push({
            case_id: c.id, intern_name: name, action: 'Follow up with agent',
            reason: `Visa submitted ${daysSince}d ago`,
            priority: 'week', case_status: c.status, days_in_stage: daysInStage
          })
        }
      }

      if (c.status === 'arrival_prep' && c.desired_start_date) {
        const daysUntilStart = daysBetween(now.toISOString(), new Date(c.desired_start_date))
        if (daysUntilStart !== null && daysUntilStart <= 3) {
          today_actions.push({
            case_id: c.id, intern_name: name, action: 'Departure in 3 days',
            reason: `Arriving ${c.desired_start_date}`,
            priority: 'urgent', case_status: c.status, days_in_stage: daysInStage
          })
        }
      }
    }

    // ── En Attente ──
    const { data: enAttenteRaw } = await supabase
      .from('en_attente')
      .select('id, type, waiting_for, due_date, notes, case_id, cases(id, status, interns(first_name, last_name))')
      .is('resolved_at', null)
      .order('due_date', { ascending: true })
      .limit(7)

    const { count: enAttenteTotal } = await supabase
      .from('en_attente')
      .select('id', { count: 'exact', head: true })
      .is('resolved_at', null)

    const en_attente = (enAttenteRaw ?? []).map((item: any) => ({
      id: item.id,
      case_id: item.case_id ?? item.cases?.id,
      type: item.type,
      waiting_for: item.waiting_for,
      due_date: item.due_date,
      notes: item.notes,
      intern_name: item.cases?.interns
        ? `${item.cases.interns.first_name} ${item.cases.interns.last_name}`
        : '—',
    }))

    // ── Notifications ──
    const { data: notifsRaw } = await supabase
      .from('admin_notifications')
      .select('id, type, title, message, link, created_at, is_read')
      .order('created_at', { ascending: false })
      .limit(6)

    const { count: notifsUnread } = await supabase
      .from('admin_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('is_read', false)

    // ── Calendar Events ──
    const in14Days = new Date(now.getTime() + 14 * 86400000).toISOString()
    const { data: calRaw } = await supabase
      .from('calendar_events')
      .select('id, summary, start_datetime, end_datetime, case_id, status')
      .eq('status', 'confirmed')
      .gte('start_datetime', now.toISOString())
      .lte('start_datetime', in14Days)
      .order('start_datetime', { ascending: true })
      .limit(10)

    const calendar_events = (calRaw ?? []).map((e: any) => ({
      id: e.id,
      title: e.summary ?? 'RDV',
      start_time: e.start_datetime,
      end_time: e.end_datetime,
      case_id: e.case_id,
      type: 'rdv',
    }))

    // ── Pipeline ──
    const LEAD_S = ['lead']
    const CANDIDATE_S = ['rdv_booked', 'qualification_done', 'job_submitted', 'job_retained']
    const PROCEDURE_S = ['convention_signed', 'payment_pending', 'payment_received', 'visa_docs_sent', 'visa_submitted', 'visa_in_progress', 'visa_received', 'arrival_prep']
    const ACTIVE_S = ['active']
    const ALUMNI_S = ['alumni', 'completed']

    function mapCase(c: any) {
      const intern = c.interns as { first_name: string; last_name: string } | null
      return {
        case_id: c.id,
        intern_name: intern ? `${intern.first_name} ${intern.last_name}` : '—',
        status: c.status,
        stage_label: STAGE_LABELS[c.status] ?? c.status,
        days_in_stage: daysBetween(c.updated_at, now),
        desired_start_date: c.desired_start_date,
        actual_start_date: c.actual_start_date,
        actual_end_date: c.actual_end_date,
        created_at: c.created_at,
      }
    }

    const pipeline = {
      leads: allCases.filter(c => LEAD_S.includes(c.status)).map(mapCase),
      candidates: allCases.filter(c => CANDIDATE_S.includes(c.status)).map(mapCase),
      procedure: allCases.filter(c => PROCEDURE_S.includes(c.status)).map(c => ({
        ...mapCase(c),
        alert: today_actions.some(a => a.case_id === c.id) ? true : undefined,
      })),
      active: allCases.filter(c => ACTIVE_S.includes(c.status)).map(mapCase),
      alumni: allCases.filter(c => ALUMNI_S.includes(c.status)).map(mapCase),
    }

    // ── Stats ──
    const stats = {
      total_active: allCases.filter(c => !ALUMNI_S.includes(c.status)).length,
      leads: pipeline.leads.length,
      candidates: pipeline.candidates.length,
      procedure: pipeline.procedure.length,
      active_internships: pipeline.active.length,
      alumni: pipeline.alumni.length,
    }

    return NextResponse.json({
      today_actions,
      en_attente,
      en_attente_total: enAttenteTotal ?? 0,
      notifications: notifsRaw ?? [],
      notifications_unread: notifsUnread ?? 0,
      calendar_events,
      pipeline,
      stats,
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
