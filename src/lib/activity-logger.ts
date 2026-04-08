import { createClient } from '@/lib/supabase/server'

type ActivityType =
  | 'status_changed'
  | 'email_sent'
  | 'email_received'
  | 'visa_docs_completed'
  | 'cv_uploaded'
  | 'payment_received'
  | 'payment_requested'
  | 'visa_submitted'
  | 'visa_received'
  | 'note_added'
  | 'rdv_booked'
  | 'job_proposed'
  | 'job_retained'
  | 'convention_signed'
  | 'document_generated'
  | 'intern_arrived'
  | 'intern_departed'
  | 'affiliation_commission'
  | 'fazza_transfer'
  | 'welcome_kit_sent'
  | 'driver_booked'
  | 'case_created'
  | 'cv_uploaded'
  | 'visa_docs_ready'
  | 'doc_uploaded'

interface LogActivityParams {
  caseId: string
  type: ActivityType
  title: string
  description: string
  priority?: 'low' | 'normal' | 'high' | 'critical'
  metadata?: Record<string, unknown>
  source?: string
}

export async function logActivity(params: LogActivityParams) {
  try {
    const supabase = await createClient()
    await supabase.from('activity_feed').insert({
      case_id: params.caseId,
      type: params.type,
      title: params.title,
      description: params.description,
      priority: params.priority ?? 'normal',
      status: 'done',
      source: params.source ?? 'system',
      metadata: params.metadata ?? {},
    })
  } catch {
    // Never throw - logging should be silent
  }
}
