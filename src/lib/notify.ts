import { createAdminClient } from '@/lib/supabase/server'

interface NotifyParams {
  title: string
  message: string
  type: string
  caseId?: string
  actionUrl?: string
  priority?: 'low' | 'normal' | 'high' | 'critical'
}

export async function notify(params: NotifyParams) {
  try {
    const supabase = createAdminClient()
    await supabase.from('admin_notifications').insert({
      title: params.title,
      message: params.message,
      type: params.type,
      case_id: params.caseId ?? null,
      action_url: params.actionUrl ?? null,
      is_read: false,
    })
  } catch {
    // non-blocking — never throw
  }
}
