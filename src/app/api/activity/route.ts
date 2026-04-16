import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

interface ActivityEvent {
  id: string
  type: string
  title: string
  description: string
  intern_name?: string
  case_id?: string
  created_at: string
  icon_type: string
}

export async function GET() {
  try {
    const supabase = getServiceClient()
    const events: ActivityEvent[] = []

    // 1. case_logs
    const { data: logs } = await supabase
      .from('case_logs')
      .select('id, action, field_label, old_value, new_value, description, created_at, case_id, cases(id, interns(first_name, last_name))')
      .order('created_at', { ascending: false })
      .limit(50)

    for (const log of logs ?? []) {
      const c = log.cases as any
      const intern = Array.isArray(c?.interns) ? c.interns[0] : c?.interns
      const internName = intern ? `${intern.first_name} ${intern.last_name}` : undefined

      let type = 'status_change'
      let iconType = 'status'
      if (log.action === 'field_update') {
        const field = (log.field_label ?? '').toLowerCase()
        if (field.includes('payment') || field.includes('paiement')) { type = 'payment'; iconType = 'payment' }
        else if (field.includes('visa')) { type = 'visa'; iconType = 'visa' }
        else if (field.includes('convention') || field.includes('document')) { type = 'document'; iconType = 'document' }
        else { iconType = 'status' }
      }

      events.push({
        id: `log-${log.id}`,
        type,
        title: log.action === 'status_change'
          ? `Statut: ${log.old_value} → ${log.new_value}`
          : `${log.field_label ?? 'Champ'} mis a jour`,
        description: log.description ?? '',
        intern_name: internName,
        case_id: log.case_id,
        created_at: log.created_at,
        icon_type: iconType,
      })
    }

    // 2. admin_notifications
    const { data: notifs } = await supabase
      .from('admin_notifications')
      .select('id, type, title, message, link, created_at, metadata')
      .order('created_at', { ascending: false })
      .limit(30)

    for (const n of notifs ?? []) {
      let type = 'status_change'
      let iconType = 'status'
      if (n.type === 'payment_received' || n.type === 'payment_notified') { type = 'payment'; iconType = 'payment' }
      else if (n.type === 'visa_received') { type = 'visa'; iconType = 'visa' }
      else if (n.type === 'convention_signed' || n.type === 'engagement_signed') { type = 'document'; iconType = 'document' }
      else if (n.type === 'new_lead') { type = 'status_change'; iconType = 'status' }
      else if (n.type === 'employer_response') { type = 'job_submitted'; iconType = 'job' }

      const meta = n.metadata as Record<string, string> | null
      events.push({
        id: `notif-${n.id}`,
        type,
        title: n.title,
        description: n.message ?? '',
        intern_name: meta?.intern_name,
        case_id: meta?.case_id,
        created_at: n.created_at,
        icon_type: iconType,
      })
    }

    // 3. en_attente (created + resolved)
    const { data: enAttente } = await supabase
      .from('en_attente')
      .select('id, type, waiting_for, created_at, resolved_at, cases(id, interns(first_name, last_name))')
      .order('created_at', { ascending: false })
      .limit(30)

    for (const item of enAttente ?? []) {
      const c = item.cases as any
      const intern = Array.isArray(c?.interns) ? c.interns[0] : c?.interns
      const internName = intern ? `${intern.first_name} ${intern.last_name}` : undefined

      events.push({
        id: `wait-${item.id}`,
        type: 'waiting_created',
        title: `En attente: ${(item.type ?? '').replace(/_/g, ' ')}`,
        description: `Attente de ${item.waiting_for}`,
        intern_name: internName,
        case_id: c?.id,
        created_at: item.created_at,
        icon_type: 'wait',
      })

      if (item.resolved_at) {
        events.push({
          id: `resolved-${item.id}`,
          type: 'waiting_resolved',
          title: `Resolu: ${(item.type ?? '').replace(/_/g, ' ')}`,
          description: `Element resolu`,
          intern_name: internName,
          case_id: c?.id,
          created_at: item.resolved_at,
          icon_type: 'wait',
        })
      }
    }

    // Sort by created_at DESC and limit
    events.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    return NextResponse.json({ events: events.slice(0, 100) })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
