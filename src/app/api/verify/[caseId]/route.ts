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
      .select('status, arrival_date, return_date, destination, interns(first_name, last_name)')
      .eq('id', caseId)
      .single()

    if (!data) return NextResponse.json({ found: false })

    return NextResponse.json({
      found: true,
      isActive: data.status === 'active',
      status: data.status,
      internName: `${(data.interns as unknown as Record<string, string>)?.first_name ?? ''} ${(data.interns as unknown as Record<string, string>)?.last_name ?? ''}`,
      destination: data.destination,
      arrivalDate: data.arrival_date,
      returnDate: data.return_date,
    })
  } catch {
    return NextResponse.json({ found: false })
  }
}
