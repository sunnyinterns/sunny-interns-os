import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { ActivityItem, FeedData } from '@/lib/types'
import {
  calculateStayDuration,
  getRetroPlanningAlerts,
} from '@/lib/retroplanning'

const PAYMENT_DONE_STATUSES = [
  'payment_received',
  'visa_in_progress',
  'visa_received',
  'arrival_prep',
  'active',
  'alumni',
  'completed',
]

export async function GET() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const feed: FeedData = {
    today: [],
    todo: [],
    waiting: [],
    completed: [],
  }

  try {
    const { data: cases } = await supabase
      .from('cases')
      .select('id, first_name, last_name, status, arrival_date, return_date, flight_number, created_at')
      .order('created_at', { ascending: false })
      .limit(50)

    if (cases) {
      const now = new Date()
      now.setHours(0, 0, 0, 0)

      for (const c of cases) {
        const returnDate = c.return_date ? new Date(c.return_date) : null
        const stayDurationDays =
          c.arrival_date && returnDate
            ? calculateStayDuration(new Date(c.arrival_date), returnDate)
            : 0

        // Build retroplanning alerts as extra feed items
        if (c.arrival_date) {
          const alerts = getRetroPlanningAlerts({
            caseId: c.id,
            arrivalDate: new Date(c.arrival_date),
            hasTicket: !!c.flight_number,
            hasPayment: PAYMENT_DONE_STATUSES.includes(c.status),
            hasFlight: !!c.flight_number,
            stayDurationDays,
          })

          for (const alert of alerts) {
            const alertItem: ActivityItem = {
              id: `${c.id}-alert-${alert.label}`,
              caseId: c.id,
              internId: c.id,
              internName: `${c.first_name} ${c.last_name}`,
              actionType: 'retro_alert',
              description: alert.label,
              daysUntil: alert.daysUntilArrival,
              priority: alert.type,
              status: c.status,
              createdAt: c.created_at,
              metadata: { action: alert.action },
            }
            feed.todo.push(alertItem)
          }
        }

        const item: ActivityItem = {
          id: c.id,
          caseId: c.id,
          internId: c.id,
          internName: `${c.first_name} ${c.last_name}`,
          actionType: 'status_update',
          description: `Statut: ${c.status}`,
          priority: 'normal',
          status: c.status,
          createdAt: c.created_at,
          metadata: {
            flight_number: c.flight_number ?? undefined,
          },
        }

        if (c.arrival_date) {
          const arrival = new Date(c.arrival_date)
          const daysUntil = Math.floor(
            (arrival.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          )
          item.daysUntil = daysUntil

          if (daysUntil <= 0) {
            feed.today.push({ ...item, priority: 'critical' })
          } else if (daysUntil <= 7) {
            feed.todo.push({ ...item, priority: 'critical' })
          } else if (daysUntil <= 30) {
            feed.todo.push({ ...item, priority: 'attention' })
          } else {
            feed.waiting.push(item)
          }
        } else {
          feed.waiting.push(item)
        }
      }

      // Sort todo by daysUntil asc (most urgent first)
      feed.todo.sort((a, b) => (a.daysUntil ?? 999) - (b.daysUntil ?? 999))
    }
  } catch {
    // Cases table not yet created — return empty feed gracefully
  }

  const isEmpty =
    feed.today.length === 0 &&
    feed.todo.length === 0 &&
    feed.waiting.length === 0 &&
    feed.completed.length === 0

  return NextResponse.json({
    ...feed,
    isEmpty,
    stats: { critical: 0, attention: 0, pending: 0, active: 0 },
  })
}
