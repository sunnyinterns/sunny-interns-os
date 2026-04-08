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
      .select('id, status, actual_start_date, actual_end_date, desired_start_date, flight_number, created_at, google_meet_link, portal_token, interns(first_name, last_name, email)')
      .not('status', 'in', '(alumni,not_interested,no_job_found,lost)')
      .order('created_at', { ascending: false })
      .limit(50)

    if (cases) {
      const now = new Date()
      now.setHours(0, 0, 0, 0)

      for (const c of cases) {
        const returnDate = c.actual_end_date ? new Date(c.actual_end_date) : null
        const stayDurationDays =
          (c.actual_start_date || c.desired_start_date) && returnDate
            ? calculateStayDuration(new Date((c.actual_start_date || c.desired_start_date)), returnDate)
            : 0

        // Build retroplanning alerts as extra feed items
        if ((c.actual_start_date || c.desired_start_date)) {
          const alerts = getRetroPlanningAlerts({
            caseId: c.id,
            arrivalDate: new Date((c.actual_start_date || c.desired_start_date)),
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
              internName: `${(c.interns as any)?.first_name ?? ""} ${(c.interns as any)?.last_name ?? ""}`,
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
          internName: `${(c.interns as any)?.first_name ?? ""} ${(c.interns as any)?.last_name ?? ""}`,
          actionType: 'status_update',
          description: `Statut: ${c.status}`,
          priority: 'normal',
          status: c.status,
          createdAt: c.created_at,
          metadata: {
            flight_number: c.flight_number ?? undefined,
            google_meet_link: (c as any).google_meet_link ?? undefined,
            portal_token: (c as any).portal_token ?? undefined,
          },
        }

        if ((c.actual_start_date || c.desired_start_date)) {
          const arrival = new Date((c.actual_start_date || c.desired_start_date))
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

  if (isEmpty) {
    const now = new Date().toISOString()
    const demoItems: ActivityItem[] = [
      {
        id: 'demo-1',
        caseId: 'demo',
        internId: 'demo',
        internName: 'Sunny Interns',
        actionType: 'info_new_lead',
        description: 'Créez votre premier dossier stagiaire pour commencer',
        priority: 'normal',
        status: 'active',
        createdAt: now,
        metadata: { isDemo: true, title: 'Bienvenue sur Sunny Interns OS 🌴' },
      },
      {
        id: 'demo-2',
        caseId: 'demo',
        internId: 'demo',
        internName: 'Sunny Interns',
        actionType: 'info_status_changed',
        description: '22 écoles · 30 companies · 22 guesthouses · 28 templates email',
        priority: 'normal',
        status: 'active',
        createdAt: now,
        metadata: { isDemo: true, title: 'Base de données configurée ✅' },
      },
      {
        id: 'demo-3',
        caseId: 'demo',
        internId: 'demo',
        internName: 'Sunny Interns',
        actionType: 'info_new_lead',
        description: 'Allez sur Pipeline → Nouveau dossier pour démarrer',
        priority: 'attention',
        status: 'active',
        createdAt: now,
        metadata: { isDemo: true, title: 'Créer votre premier dossier' },
      },
    ]
    return NextResponse.json({
      ...feed,
      waiting: demoItems,
      isEmpty: true,
      isDemo: true,
      stats: { critical: 0, attention: 1, pending: 2, active: 0 },
    })
  }

  return NextResponse.json({
    ...feed,
    isEmpty,
    stats: { critical: 0, attention: 0, pending: 0, active: 0 },
  })
}
