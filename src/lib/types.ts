export type CaseStatus =
  | 'lead'
  | 'rdv_booked'
  | 'qualification_done'
  | 'job_submitted'
  | 'job_retained'
  | 'convention_signed'
  | 'payment_pending'
  | 'payment_received'
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
