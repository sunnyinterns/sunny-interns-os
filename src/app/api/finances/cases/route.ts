import { createClient } from '@/lib/supabase/server'
import { createClient as svcClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function svc() {
  return svcClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: cases } = await svc()
    .from('cases')
    .select(`
      id, status,
      interns(first_name, last_name),
      billing_entries(id, type, category, label, amount_eur, invoice_url, recorded_at)
    `)
    .in('status', ['convention_signed','payment_received','visa_in_progress','visa_received','arrival_prep','active','alumni'])
    .order('created_at', { ascending: false })

  return NextResponse.json(cases ?? [])
}
