import { NextResponse } from 'next/server'

let cachedRate: { rate: number; fetchedAt: number } | null = null

export async function GET() {
  // Return cached if fresh (< 1h)
  if (cachedRate && Date.now() - cachedRate.fetchedAt < 3600000) {
    return NextResponse.json({ rate: cachedRate.rate, source: 'cache' })
  }

  try {
    const res = await fetch('https://api.exchangerate-api.com/v4/latest/EUR', {
      signal: AbortSignal.timeout(5000),
    })
    if (res.ok) {
      const data = await res.json() as { rates: { IDR: number } }
      if (data.rates?.IDR) {
        cachedRate = { rate: data.rates.IDR, fetchedAt: Date.now() }
        return NextResponse.json({ rate: data.rates.IDR, source: 'api' })
      }
    }
  } catch { /* fallback */ }

  const fallback = 16500
  return NextResponse.json({ rate: fallback, source: 'fallback' })
}
