import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date()
  const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const lastOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}`

  // Candidats ce mois
  const { count: candidatsMonth } = await supabase
    .from('cases')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', firstOfMonth)
    .lte('created_at', lastOfMonth + 'T23:59:59')

  // Actifs à Bali
  const { count: activeBali } = await supabase
    .from('cases')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')

  // Revenus ce mois
  const { data: revenueData } = await supabase
    .from('cases')
    .select('payment_amount')
    .gte('payment_date', firstOfMonth)
    .lte('payment_date', lastOfMonth)
    .not('payment_amount', 'is', null)

  const revenueMonth = (revenueData ?? []).reduce((sum, c) => sum + (Number(c.payment_amount) || 0), 0)

  // En attente paiement
  const { count: pendingPayment } = await supabase
    .from('cases')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'payment_pending')

  return NextResponse.json({
    candidats_month: candidatsMonth ?? 0,
    active_bali: activeBali ?? 0,
    revenue_month: revenueMonth,
    pending_payment: pendingPayment ?? 0,
  })
}
