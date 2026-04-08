import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

let cachedRate: { rate: number; fetchedAt: number } | null = null

async function getIdrEurRate(fallbackRate: number): Promise<number> {
  if (cachedRate && Date.now() - cachedRate.fetchedAt < 3600000) {
    return cachedRate.rate
  }
  try {
    const res = await fetch('https://api.exchangerate-api.com/v4/latest/EUR', { signal: AbortSignal.timeout(5000) })
    if (res.ok) {
      const data = await res.json() as { rates: { IDR: number } }
      if (data.rates?.IDR) {
        cachedRate = { rate: data.rates.IDR, fetchedAt: Date.now() }
        return data.rates.IDR
      }
    }
  } catch { /* fallback */ }
  return fallbackRate
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const from = url.searchParams.get('from') || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
  const to = url.searchParams.get('to') || from
  const fromDate = `${from}-01`
  const toDate = `${to}-31`

  // Get IDR fallback from settings
  const { data: settingsData } = await supabase.from('settings').select('value').eq('key', 'idr_eur_rate').single()
  const fallbackRate = Number(settingsData?.value) || 16500
  const idrRate = await getIdrEurRate(fallbackRate)

  // Get all cases with payment in period
  const { data: cases } = await supabase
    .from('cases')
    .select('id, status, payment_amount, payment_date, payment_type, discount_percentage, invoice_number, fazza_transfer_amount_idr, fazza_transfer_date, interns(first_name, last_name), packages(name, price_eur)')
    .not('payment_date', 'is', null)
    .gte('payment_date', fromDate)
    .lte('payment_date', toDate)
    .order('payment_date', { ascending: false })

  const rows = (cases ?? []).map(c => {
    const intern = c.interns as unknown as { first_name: string; last_name: string } | null
    const pkg = c.packages as unknown as { name: string; price_eur: number } | null
    const amount = Number(c.payment_amount) || 0
    const discount = Number(c.discount_percentage) || 0
    const amountHt = amount / 1.0 // Pas de TVA appliquée
    const tva = 0
    const visaIdr = Number(c.fazza_transfer_amount_idr) || 0
    const visaEur = visaIdr > 0 ? Math.round((visaIdr / idrRate) * 100) / 100 : 0
    const marge = amount - visaEur

    return {
      id: c.id,
      intern_name: intern ? `${intern.first_name} ${intern.last_name}` : '',
      package_name: pkg?.name ?? '',
      tarif: pkg?.price_eur ?? 0,
      discount,
      amount_ht: amountHt,
      tva,
      amount_ttc: amount,
      visa_idr: visaIdr,
      visa_eur: visaEur,
      marge,
      payment_date: c.payment_date,
      payment_type: c.payment_type,
      invoice_number: c.invoice_number,
    }
  })

  const totalEncaisse = rows.reduce((s, r) => s + r.amount_ttc, 0)
  const totalVisaEur = rows.reduce((s, r) => s + r.visa_eur, 0)
  const margeBrute = totalEncaisse - totalVisaEur
  const nbPlacements = rows.length
  const ticketMoyen = nbPlacements > 0 ? Math.round(totalEncaisse / nbPlacements) : 0

  return NextResponse.json({
    kpis: { totalEncaisse, totalVisaEur, margeBrute, nbPlacements, ticketMoyen },
    rows,
    idr_rate: idrRate,
    period: { from, to },
  })
}
