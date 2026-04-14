import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const PAYMENT_STATUSES = ['payment_received','visa_docs_sent','visa_submitted','visa_in_progress','visa_received','arrival_prep','active','alumni','completed']
const ARRIVAL_STATUSES = ['active','alumni','completed']

export async function GET(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')

  let query = supabase
    .from('companies')
    .select('id, name, logo_url, partner_category, partner_deal, partner_timing, partner_visible_from, website')
    .eq('is_partner', true)
    .eq('is_active', true)

  if (status && ARRIVAL_STATUSES.includes(status)) {
    // Tous visibles (pre_arrival + on_site)
  } else if (status && PAYMENT_STATUSES.includes(status)) {
    query = query.eq('partner_visible_from', 'payment')
  } else {
    return NextResponse.json([])
  }

  const { data, error } = await query.order('name')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
