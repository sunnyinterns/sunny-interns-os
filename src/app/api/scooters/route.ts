import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const FALLBACK_SCOOTERS = [
  { id: '1', provider: 'Bali Scooter Rental', type: 'Honda Beat', price_month: 80, whatsapp: '+6281234560001' },
  { id: '2', provider: 'Bali Scooter Rental', type: 'Honda Scoopy', price_month: 90, whatsapp: '+6281234560001' },
  { id: '3', provider: 'Canggu Moto', type: 'Yamaha NMAX', price_month: 120, whatsapp: '+6281234560002' },
  { id: '4', provider: 'Canggu Moto', type: 'Honda Vario 150', price_month: 100, whatsapp: '+6281234560002' },
  { id: '5', provider: 'Seminyak Wheels', type: 'Honda PCX', price_month: 130, whatsapp: '+6281234560003' },
  { id: '6', provider: 'Seminyak Wheels', type: 'Honda Beat (auto)', price_month: 75, whatsapp: '+6281234560003' },
  { id: '7', provider: 'Ubud Eco Ride', type: 'Honda Genio', price_month: 85, whatsapp: '+6281234560004' },
]

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { data, error } = await supabase.from('scooters').select('*').order('price_month')
    if (error) throw error
    if (!data || data.length === 0) return NextResponse.json(FALLBACK_SCOOTERS)
    return NextResponse.json(data)
  } catch {
    return NextResponse.json(FALLBACK_SCOOTERS)
  }
}
