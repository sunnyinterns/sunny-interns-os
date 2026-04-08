import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('affiliate_codes')
    .select('*, interns(first_name, last_name, email)')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as { id: string; paid_amount?: number }
  if (!body.id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

  const { data: current } = await supabase
    .from('affiliate_codes')
    .select('pending_payout, paid_out')
    .eq('id', body.id)
    .single()

  if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const amount = body.paid_amount ?? current.pending_payout ?? 0
  const { data, error } = await supabase
    .from('affiliate_codes')
    .update({
      paid_out: (current.paid_out ?? 0) + amount,
      pending_payout: Math.max(0, (current.pending_payout ?? 0) - amount),
    })
    .eq('id', body.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
