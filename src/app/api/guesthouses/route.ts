import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const FALLBACK_GUESTHOUSES = [
  { id: '1', name: 'Villa Seminyak Garden', city: 'Seminyak', price_month: 450, has_pool: true, has_ac: true, has_wifi: true, scooter_included: false, description: 'Belle villa avec jardin tropical, piscine privée.' },
  { id: '2', name: 'Canggu Surf House', city: 'Canggu', price_month: 380, has_pool: false, has_ac: true, has_wifi: true, scooter_included: true, description: 'Maison de surf à 5min de la plage, ambiance décontractée.' },
  { id: '3', name: 'Ubud Jungle Retreat', city: 'Ubud', price_month: 320, has_pool: true, has_ac: false, has_wifi: true, scooter_included: false, description: 'Retraite en pleine jungle, vue sur rizières.' },
  { id: '4', name: 'Kuta Budget Stay', city: 'Kuta', price_month: 250, has_pool: false, has_ac: true, has_wifi: true, scooter_included: false, description: 'Option économique en centre-ville, proche commerces.' },
  { id: '5', name: 'Seminyak Luxury Compound', city: 'Seminyak', price_month: 700, has_pool: true, has_ac: true, has_wifi: true, scooter_included: true, description: 'Compound luxueux avec personnel et piscine olympique.' },
]

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const city = searchParams.get('city')
  const hasPool = searchParams.get('has_pool')
  const hasAc = searchParams.get('has_ac')
  const minPrice = searchParams.get('min_price')
  const maxPrice = searchParams.get('max_price')

  try {
    let query = supabase.from('guesthouses').select('*')
    if (city && city !== 'all') query = query.eq('city', city)
    if (hasPool === 'true') query = query.eq('has_pool', true)
    if (hasAc === 'true') query = query.eq('has_ac', true)
    if (minPrice) query = query.gte('price_month', parseInt(minPrice))
    if (maxPrice) query = query.lte('price_month', parseInt(maxPrice))
    const { data, error } = await query.order('price_month')
    if (error) throw error
    if (!data || data.length === 0) return NextResponse.json(FALLBACK_GUESTHOUSES)
    return NextResponse.json(data)
  } catch {
    return NextResponse.json(FALLBACK_GUESTHOUSES)
  }
}
