import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import {
  calculateRetroplanning,
  calculateStayDuration,
  getRetroPlanningAlerts,
} from '@/lib/retroplanning'

/**
 * POST /api/cases/[id]/retroplanning
 * Computes retroplanning items and upserts them into activity_feed.
 * Returns generated alerts.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  // Fetch case data needed for retroplanning
  const { data: c, error: fetchError } = await supabase
    .from('cases')
    .select('id, first_name, last_name, status, arrival_date, return_date, flight_number')
    .eq('id', id)
    .single()

  if (fetchError || !c) {
    return NextResponse.json({ error: 'Case not found' }, { status: 404 })
  }

  if (!c.arrival_date) {
    return NextResponse.json({ error: 'arrival_date required' }, { status: 422 })
  }

  const arrivalDate = new Date(c.arrival_date)
  const returnDate = c.return_date ? new Date(c.return_date) : null

  const stayDurationDays = returnDate
    ? calculateStayDuration(arrivalDate, returnDate)
    : 0

  const PAYMENT_DONE_STATUSES = [
    'payment_received',
    'visa_in_progress',
    'visa_received',
    'arrival_prep',
    'active',
    'alumni',
    'completed',
  ]

  const alerts = getRetroPlanningAlerts({
    caseId: id,
    arrivalDate,
    hasTicket: !!c.flight_number,
    hasPayment: PAYMENT_DONE_STATUSES.includes(c.status),
    hasFlight: !!c.flight_number,
    stayDurationDays,
  })

  // Generate retroplanning timeline items and write to activity_feed
  const retroItems = calculateRetroplanning(arrivalDate)
  const feedEntries = retroItems.map((item) => ({
    case_id: id,
    action_type: 'retroplanning',
    description: item.label,
    metadata: {
      days_before_arrival: item.daysBeforeArrival,
      target_date: item.date.toISOString(),
      priority: item.type,
    },
    created_by: user.id,
  }))

  try {
    // Delete existing retroplanning entries for this case then re-insert
    await supabase
      .from('activity_feed')
      .delete()
      .eq('case_id', id)
      .eq('action_type', 'retroplanning')

    await supabase.from('activity_feed').insert(feedEntries)
  } catch {
    // activity_feed may not exist yet — non-blocking
  }

  return NextResponse.json({ alerts, retroItems: retroItems.map((i) => ({ ...i, date: i.date.toISOString() })) })
}
