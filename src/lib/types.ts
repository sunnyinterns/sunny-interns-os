export type CaseStatus =
  | 'lead'
  | 'rdv_booked'
  | 'qualification_done'
  | 'job_submitted'
  | 'job_retained'
  | 'convention_signed'
  | 'payment_pending'
  | 'payment_received'
  | 'visa_docs_sent'
  | 'visa_submitted'
  | 'visa_in_progress'
  | 'visa_received'
  | 'arrival_prep'
  | 'active'
  | 'alumni'
  | 'not_interested'
  | 'not_qualified'
  | 'on_hold'
  | 'suspended'
  | 'visa_refused'
  | 'archived'
  | 'completed'
  | 'no_job_found'
  | 'lost'

export interface ActivityItem {
  id: string
  caseId: string
  internId: string
  internName: string
  internAvatar?: string
  actionType: string
  description: string
  daysUntil?: number
  priority: 'critical' | 'attention' | 'normal' | 'completed'
  status: CaseStatus
  createdAt: string
  metadata?: Record<string, unknown>
}

export interface FeedData {
  today: ActivityItem[]
  todo: ActivityItem[]
  waiting: ActivityItem[]
  completed: ActivityItem[]
  isEmpty?: boolean
  stats?: {
    critical: number
    attention: number
    pending: number
    active: number
  }
}

// === New Feed types ===

export interface FeedItem {
  case_id: string
  intern_name: string
  status: string
  status_label: string
  action_label: string
  wait_label: string
  cta_label: string | null
  cta_action: string | null
  cta_data: Record<string, string> | null
  urgency: 'critical' | 'high' | 'normal' | 'low'
  days_info: string | null
  days_since_status: number
  google_meet_link: string | null
  portal_token: string | null
  school_name: string | null
  suggest_action?: string | null
}

export interface FeedResponse {
  todo: FeedItem[]
  waiting: FeedItem[]
  active: FeedItem[]
  alumni: FeedItem[]
  kpis: {
    todo_count: number
    active_bali: number
    arriving_soon: number
    revenue_month: number
  }
}
