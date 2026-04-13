import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const ICONS: Record<string, string> = {
  case_created: '🌴',
  rdv_booked: '📅',
  status_changed: '🔄',
  job_proposed: '💼',
  job_sent_employer: '📧',
  job_submitted: '📋',
  job_retained: '🤝',
  cv_feedback: '📄',
  cv_status_changed: '📄',
  payment_received: '💳',
  payment_requested: '💰',
  visa_docs_sent: '🛂',
  visa_docs_completed: '📁',
  visa_docs_ready: '📁',
  visa_submitted: '✈️',
  visa_received: '🛂',
  note_added: '💬',
  note: '💬',
  email_sent: '📧',
  email_received: '📩',
  lead_captured: '📋',
  lead_converted: '✅',
  convention_signed: '✍️',
  document_generated: '📄',
  cv_uploaded: '📎',
  doc_uploaded: '📄',
  intern_arrived: '🌴',
  intern_departed: '🎓',
  affiliation_commission: '💎',
  fazza_transfer: '🏦',
  welcome_kit_sent: '🎁',
  driver_booked: '🚗',
  rdv_cancelled: '❌',
}

const COLORS: Record<string, string> = {
  case_created: '#c8a96e',
  rdv_booked: '#1a73e8',
  status_changed: '#8b5cf6',
  job_proposed: '#0d9e75',
  job_sent_employer: '#1a73e8',
  job_submitted: '#6366f1',
  job_retained: '#0d9e75',
  cv_feedback: '#c8a96e',
  cv_status_changed: '#8b5cf6',
  payment_received: '#0d9e75',
  payment_requested: '#d97706',
  visa_docs_sent: '#8b5cf6',
  visa_docs_completed: '#0d9e75',
  visa_docs_ready: '#0d9e75',
  visa_submitted: '#6366f1',
  visa_received: '#0d9e75',
  note_added: '#6b7280',
  note: '#6b7280',
  email_sent: '#1a73e8',
  email_received: '#3b82f6',
  lead_captured: '#f59e0b',
  lead_converted: '#0d9e75',
  convention_signed: '#0d9e75',
  document_generated: '#6366f1',
  cv_uploaded: '#8b5cf6',
  doc_uploaded: '#8b5cf6',
  intern_arrived: '#0d9e75',
  intern_departed: '#8b5cf6',
  affiliation_commission: '#c8a96e',
  fazza_transfer: '#6366f1',
  welcome_kit_sent: '#c8a96e',
  driver_booked: '#3b82f6',
  rdv_cancelled: '#dc2626',
}

const TYPE_GROUPS: Record<string, string[]> = {
  emails: ['job_sent_employer', 'email_sent', 'email_received'],
  payments: ['payment_received', 'payment_requested', 'fazza_transfer'],
  visa: ['visa_docs_completed', 'visa_docs_ready', 'visa_docs_sent', 'visa_submitted', 'visa_received'],
  statuts: ['status_changed', 'rdv_booked', 'case_created'],
  notes: ['note_added', 'note', 'cv_feedback'],
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
    .select('*, cases(id, status, desired_sectors, desired_start_date, intern_first_meeting_date, interns(first_name, last_name))')
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

  if (error) { console.error('[activity-feed]', error.message); return NextResponse.json([], { status: 200 }) }

  const items = (data ?? []).map(item => {
    const caseData = item.cases as { id: string; status: string; desired_sectors: string[] | null; desired_start_date: string | null; intern_first_meeting_date: string | null; interns: { first_name: string; last_name: string } | null } | null
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
      desired_jobs: caseData?.desired_sectors?.slice(0, 3) ?? (item.metadata as Record<string,unknown>)?.desired_jobs as string[] | null ?? null,
      desired_start_date: caseData?.desired_start_date ?? null,
      rdv_date: caseData?.intern_first_meeting_date ?? null,
    }
  })

  return NextResponse.json(items)
}
