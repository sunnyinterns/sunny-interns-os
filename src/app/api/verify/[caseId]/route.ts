import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ caseId: string }> }
) {
  // Public route — no auth required
  const supabase = await createClient()
  const { caseId } = await params

  try {
    const { data } = await supabase
      .from('cases')
      .select('status, actual_start_date, actual_end_date, desired_start_date, interns(first_name, last_name)')
      .eq('id', caseId)
      .single()

    if (!data) return NextResponse.json({ found: false })

    return NextResponse.json({
      found: true,
      isActive: data.status === 'active',
      status: data.status,
      internName: `${(data.interns as unknown as Record<string, string>)?.first_name ?? ''} ${(data.interns as unknown as Record<string, string>)?.last_name ?? ''}`,
      arrivalDate: data.actual_start_date || data.desired_start_date,
      returnDate: data.actual_end_date,
    })
  } catch {
    return NextResponse.json({ found: false })
  }
}
