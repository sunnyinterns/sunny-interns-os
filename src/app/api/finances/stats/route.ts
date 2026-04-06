import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const prevMonthStr = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`

    const { data: allBilling } = await supabase
      .from('billing')
      .select('amount_ttc, paid_at, created_at')

    const billing = allBilling ?? []

    const currentMonthRevenue = billing
      .filter((b: Record<string, unknown>) => b.paid_at && String(b.paid_at).startsWith(currentMonth))
      .reduce((sum: number, b: Record<string, unknown>) => sum + (Number(b.amount_ttc) || 0), 0)

    const prevMonthRevenue = billing
      .filter((b: Record<string, unknown>) => b.paid_at && String(b.paid_at).startsWith(prevMonthStr))
      .reduce((sum: number, b: Record<string, unknown>) => sum + (Number(b.amount_ttc) || 0), 0)

    const pending = billing
      .filter((b: Record<string, unknown>) => !b.paid_at)
      .reduce((sum: number, b: Record<string, unknown>) => sum + (Number(b.amount_ttc) || 0), 0)

    const invoicesIssued = billing.filter((b: Record<string, unknown>) => b.paid_at).length

    // Last 6 months chart data
    const chartData = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
      const revenue = billing
        .filter((b: Record<string, unknown>) => b.paid_at && String(b.paid_at).startsWith(key))
        .reduce((sum: number, b: Record<string, unknown>) => sum + (Number(b.amount_ttc) || 0), 0)
      return { month: key, label, revenue }
    })

    return NextResponse.json({ currentMonthRevenue, prevMonthRevenue, pending, invoicesIssued, chartData })
  } catch {
    return NextResponse.json({ currentMonthRevenue: 0, prevMonthRevenue: 0, pending: 0, invoicesIssued: 0, chartData: [] })
  }
}
