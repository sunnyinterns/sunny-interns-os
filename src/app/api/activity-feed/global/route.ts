import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const ICONS: Record<string, string> = {
  status_changed: '🔄',
  email_sent: '📧',
  email_received: '📩',
  visa_docs_completed: '📁',
  visa_docs_ready: '📁',
  cv_uploaded: '📎',
  doc_uploaded: '📄',
  payment_received: '💳',
  payment_requested: '💰',
  visa_submitted: '✈️',
  visa_received: '🛂',
  note_added: '💬',
  note: '💬',
  rdv_booked: '📅',
  job_proposed: '📋',
  job_submitted: '📋',
  job_retained: '🎉',
  convention_signed: '✍️',
  document_generated: '📄',
  intern_arrived: '🌴',
  intern_departed: '🎓',
  affiliation_commission: '💎',
  fazza_transfer: '🏦',
  welcome_kit_sent: '🎁',
  driver_booked: '🚗',
  case_created: '🆕',
}

const COLORS: Record<string, string> = {
  status_changed: '#6366f1',
  email_sent: '#3b82f6',
  email_received: '#3b82f6',
  visa_docs_completed: '#0d9e75',
  visa_docs_ready: '#0d9e75',
  cv_uploaded: '#8b5cf6',
  doc_uploaded: '#8b5cf6',
  payment_received: '#0d9e75',
  payment_requested: '#d97706',
  visa_submitted: '#6366f1',
  visa_received: '#0d9e75',
  note_added: '#d97706',
  note: '#d97706',
  rdv_booked: '#3b82f6',
  job_proposed: '#6366f1',
  job_submitted: '#6366f1',
  job_retained: '#0d9e75',
  convention_signed: '#0d9e75',
  document_generated: '#6366f1',
  intern_arrived: '#0d9e75',
  intern_departed: '#8b5cf6',
  affiliation_commission: '#c8a96e',
  fazza_transfer: '#6366f1',
  welcome_kit_sent: '#c8a96e',
  driver_booked: '#3b82f6',
  case_created: '#c8a96e',
}

const TYPE_GROUPS: Record<string, string[]> = {
  emails: ['email_sent', 'email_received'],
  payments: ['payment_received', 'payment_requested', 'fazza_transfer'],
  visa: ['visa_docs_completed', 'visa_docs_ready', 'visa_submitted', 'visa_received'],
  statuts: ['status_changed', 'case_created'],
  notes: ['note_added', 'note'],
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const caseId = url.searchParams.get('case_id')
  const typeFilter = url.searchParams.get('type')
  const limit = Math.min(Number(url.searchParams.get('limit')) || 50, 200)
  const page = Math.max(Number(url.searchParams.get('page')) || 1, 1)
  const offset = (page - 1) * limit

  let query = supabase
    .from('activity_feed')
    .select('*, cases!inner(id, status, interns(first_name, last_name))')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (caseId) {
    query = query.eq('case_id', caseId)
  }

  if (typeFilter && TYPE_GROUPS[typeFilter]) {
    query = query.in('type', TYPE_GROUPS[typeFilter])
  } else if (typeFilter) {
    query = query.eq('type', typeFilter)
  }

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const items = (data ?? []).map(item => {
    const caseData = item.cases as { id: string; status: string; interns: { first_name: string; last_name: string } | null } | null
    const actType = item.type ?? 'status_changed'
    return {
      id: item.id,
      case_id: item.case_id,
      intern_name: caseData?.interns ? `${caseData.interns.first_name} ${caseData.interns.last_name}` : null,
      type: actType,
      title: item.title ?? item.description,
      description: item.description,
      priority: item.priority ?? 'normal',
      metadata: item.metadata ?? {},
      source: item.source ?? 'system',
      created_at: item.created_at,
      icon: ICONS[actType] ?? '•',
      color: COLORS[actType] ?? '#71717a',
    }
  })

  return NextResponse.json(items)
}
