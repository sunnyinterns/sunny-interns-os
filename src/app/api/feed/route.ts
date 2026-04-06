import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { ActivityItem, FeedData } from '@/lib/types'

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
      .select('id, first_name, last_name, status, arrival_date, created_at')
      .order('created_at', { ascending: false })
      .limit(50)

    if (cases) {
      const now = new Date()
      now.setHours(0, 0, 0, 0)

      for (const c of cases) {
        const item: ActivityItem = {
          id: c.id,
          internId: c.id,
          internName: `${c.first_name} ${c.last_name}`,
          actionType: 'status_update',
          description: `Statut: ${c.status}`,
          priority: 'normal',
          status: c.status,
          createdAt: c.created_at,
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
    }
  } catch {
    // Cases table not yet created — return empty feed gracefully
  }

  return NextResponse.json(feed)
}
