import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { FeedItem, FeedResponse } from '@/lib/types'

const STATUS_LABELS: Record<string, string> = {
  lead: 'Nouveau lead',
  rdv_booked: 'RDV booké',
  qualification_done: 'Qualifié',
  job_submitted: 'Jobs proposés',
  job_retained: 'Job retenu',
  convention_signed: 'Convention signée',
  payment_pending: 'Paiement en attente',
  payment_received: 'Payé',
  visa_docs_sent: 'Docs visa envoyés',
  visa_submitted: 'Visa soumis',
  visa_in_progress: 'Visa en cours',
  visa_received: 'Visa reçu',
  arrival_prep: 'Prép. arrivée',
  active: 'En stage',
  alumni: 'Alumni',
}

const TODO_STATUSES = ['lead', 'rdv_booked', 'qualification_done', 'payment_pending', 'visa_docs_sent', 'visa_received']
const WAITING_STATUSES = ['job_submitted', 'job_retained', 'convention_signed', 'payment_received', 'visa_submitted', 'arrival_prep']
const ACTIVE_STATUSES = ['active']
const ALUMNI_STATUSES = ['alumni']

const ACTION_LABELS: Record<string, string> = {
  lead: '📞 Appeler et booker un RDV de qualification',
  rdv_booked: "🎯 Mener l'entretien de qualification",
  qualification_done: '💼 Sélectionner et proposer des offres de stage',
  payment_pending: '💳 Relancer le candidat — paiement en attente',
  visa_docs_sent: "🚀 Envoyer le dossier complet à l'agent FAZZA",
  visa_received: "🛫 Organiser la logistique d'arrivée (chauffeur, welcome kit)",
}

const WAIT_LABELS: Record<string, string> = {
  job_submitted: '⏳ En attente — réponse candidat + employeur',
  job_retained: "📝 À faire : envoyer la convention de stage",
  convention_signed: '⏳ En attente — paiement à réception',
  payment_received: '📋 En attente — candidat doit envoyer ses documents visa',
  visa_submitted: "⏳ En attente — réception visa de FAZZA",
  arrival_prep: '✅ Logistique en cours — arrivée prévue bientôt',
}

function getCta(status: string, googleMeetLink: string | null): { label: string; action: string; data?: Record<string, string> } {
  if (status === 'rdv_booked' && googleMeetLink) {
    return { label: 'Ouvrir Meet', action: 'open_meet', data: { url: googleMeetLink } }
  }
  if (status === 'visa_docs_sent') {
    return { label: 'Voir dossier (Visa)', action: 'navigate_case' }
  }
  return { label: 'Voir dossier', action: 'navigate_case' }
}

function computeUrgency(status: string, daysSince: number, internFirstMeetingDate: string | null): 'critical' | 'high' | 'normal' | 'low' {
  if (status === 'lead' && daysSince > 3) return 'critical'
  if (status === 'rdv_booked' && internFirstMeetingDate) {
    const meetDate = new Date(internFirstMeetingDate)
    if (meetDate.getTime() < Date.now()) return 'high'
  }
  if (status === 'payment_pending' && daysSince > 5) return 'high'
  if (status === 'visa_docs_sent' && daysSince > 3) return 'high'
  return 'normal'
}

function computeDaysInfo(
  category: 'todo' | 'waiting' | 'active' | 'alumni',
  status: string,
  daysSince: number,
  daysUntilArrival: number | null,
): string | null {
  if (category === 'todo' && daysSince > 1) return `Depuis ${daysSince}j`
  if (status === 'arrival_prep' && daysUntilArrival !== null && daysUntilArrival < 14) {
    return `Arrive dans ${daysUntilArrival}j`
  }
  if (category === 'waiting') {
    if (status === 'visa_submitted' && daysSince > 0) return `Visa soumis il y a ${daysSince}j`
    if (status === 'convention_signed' && daysSince > 0) return `Convention signée il y a ${daysSince}j`
    if (status === 'payment_received' && daysSince > 0) return `Payé il y a ${daysSince}j`
    if (daysSince > 1) return `Depuis ${daysSince}j`
  }
  if (category === 'active' && daysUntilArrival !== null) {
    const daysLeft = daysUntilArrival
    if (daysLeft > 0) return `Encore ${daysLeft}j`
  }
  return null
}

export async function GET() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: cases, error } = await supabase
    .from('cases')
    .select(
      'id, status, created_at, updated_at, desired_start_date, actual_start_date, actual_end_date, google_meet_link, portal_token, payment_amount, payment_date, visa_submitted_to_agent_at, intern_first_meeting_date, discount_percentage, interns(first_name, last_name), schools(name)'
    )
    .not('status', 'in', '(not_interested,not_qualified,no_job_found,lost,archived,completed,on_hold,suspended,visa_refused)')
    .order('updated_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const now = Date.now()
  const todo: FeedItem[] = []
  const waiting: FeedItem[] = []
  const active: FeedItem[] = []
  const alumni: FeedItem[] = []

  let activeCount = 0
  let arrivingSoon = 0
  let revenueMonth = 0

  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()

  for (const c of cases ?? []) {
    const internRaw = c.interns as unknown
    const intern = Array.isArray(internRaw) ? internRaw[0] as { first_name: string; last_name: string } | undefined : internRaw as { first_name: string; last_name: string } | null
    const schoolRaw = c.schools as unknown
    const school = Array.isArray(schoolRaw) ? schoolRaw[0] as { name: string } | undefined : schoolRaw as { name: string } | null
    const internName = intern ? `${intern.first_name} ${intern.last_name}`.trim() : 'Sans nom'
    const daysSince = Math.floor((now - new Date(c.updated_at).getTime()) / 86400000)

    const arrivalDate = c.actual_start_date || c.desired_start_date
    const endDate = c.actual_end_date
    const daysUntilArrival = arrivalDate ? Math.ceil((new Date(arrivalDate).getTime() - now) / 86400000) : null
    const daysUntilEnd = endDate ? Math.ceil((new Date(endDate).getTime() - now) / 86400000) : null

    // Revenue calculation
    if (c.payment_date) {
      const pd = new Date(c.payment_date)
      if (pd.getMonth() === currentMonth && pd.getFullYear() === currentYear && c.payment_amount) {
        const discount = c.discount_percentage ?? 0
        revenueMonth += Math.round(c.payment_amount * (1 - discount / 100))
      }
    }

    const cta = getCta(c.status, c.google_meet_link)

    const item: FeedItem = {
      case_id: c.id,
      intern_name: internName,
      status: c.status,
      status_label: STATUS_LABELS[c.status] ?? c.status,
      action_label: ACTION_LABELS[c.status] ?? '',
      wait_label: WAIT_LABELS[c.status] ?? '',
      cta_label: cta.label,
      cta_action: cta.action,
      cta_data: cta.data ?? null,
      urgency: 'normal',
      days_info: null,
      days_since_status: daysSince,
      google_meet_link: c.google_meet_link ?? null,
      portal_token: c.portal_token ?? null,
      school_name: school?.name ?? null,
      suggest_action: null,
    }

    if (TODO_STATUSES.includes(c.status)) {
      item.urgency = computeUrgency(c.status, daysSince, c.intern_first_meeting_date)
      item.days_info = computeDaysInfo('todo', c.status, daysSince, daysUntilArrival)
      todo.push(item)
    } else if (WAITING_STATUSES.includes(c.status)) {
      item.days_info = computeDaysInfo('waiting', c.status, daysSince, daysUntilArrival)
      // suggest_action for stale waiting items
      if (c.status === 'job_retained' && daysSince > 3) {
        item.suggest_action = 'Envoyer la convention maintenant'
      } else if (c.status === 'convention_signed' && daysSince > 7) {
        item.suggest_action = 'Relancer le candidat par WhatsApp'
      } else if (c.status === 'payment_received' && daysSince > 5) {
        item.suggest_action = 'Contacter le candidat — docs manquants'
      } else if (c.status === 'visa_submitted' && daysSince > 21) {
        item.suggest_action = 'Relancer l\'agent FAZZA'
      }
      if (c.status === 'arrival_prep' && daysUntilArrival !== null && daysUntilArrival <= 7) {
        arrivingSoon++
      }
      waiting.push(item)
    } else if (ACTIVE_STATUSES.includes(c.status)) {
      activeCount++
      item.days_info = computeDaysInfo('active', c.status, daysSince, daysUntilEnd)
      active.push(item)
    } else if (ALUMNI_STATUSES.includes(c.status)) {
      alumni.push(item)
    }
  }

  // Sort todo: critical → high → normal, then by days_since DESC
  const urgencyOrder = { critical: 0, high: 1, normal: 2, low: 3 }
  todo.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency] || b.days_since_status - a.days_since_status)
  waiting.sort((a, b) => b.days_since_status - a.days_since_status)
  active.sort((a, b) => (a.days_info ?? '').localeCompare(b.days_info ?? ''))

  const response: FeedResponse = {
    todo,
    waiting,
    active,
    alumni,
    kpis: {
      todo_count: todo.length,
      active_bali: activeCount,
      arriving_soon: arrivingSoon,
      revenue_month: revenueMonth,
    },
  }

  return NextResponse.json(response)
}
