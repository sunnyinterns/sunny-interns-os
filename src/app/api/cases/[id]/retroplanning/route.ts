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
    .select('id, status, actual_start_date, actual_end_date, desired_start_date, flight_number, interns(first_name, last_name)')
    .eq('id', id)
    .single()

  if (fetchError || !c) {
    return NextResponse.json({ error: 'Case not found' }, { status: 404 })
  }

  const startDate = c.actual_start_date || c.desired_start_date
  if (!startDate) {
    return NextResponse.json({ error: 'actual_start_date or desired_start_date required' }, { status: 422 })
  }

  const arrivalDate = new Date(startDate)
  const returnDate = c.actual_end_date ? new Date(c.actual_end_date) : null

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
    type: 'retroplanning',
    title: `Rétro-planning J-${item.daysBeforeArrival}`,
    description: item.label,
    metadata: {
      days_before_arrival: item.daysBeforeArrival,
      target_date: item.date.toISOString(),
      priority: item.type,
    },
  }))

  try {
    // Delete existing retroplanning entries for this case then re-insert
    await supabase
      .from('activity_feed')
      .delete()
      .eq('case_id', id)
      .eq('type', 'retroplanning')

    await supabase.from('activity_feed').insert(feedEntries)
  } catch {
    // activity_feed may not exist yet — non-blocking
  }

  return NextResponse.json({ alerts, retroItems: retroItems.map((i) => ({ ...i, date: i.date.toISOString() })) })
}
