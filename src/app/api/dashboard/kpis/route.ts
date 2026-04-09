import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date()
  const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const lastOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}`

  const [candidats, rdvs, actifs, payments, revenueData, pendingPaymentRes] = await Promise.all([
    // Candidats ce mois
    supabase
      .from('cases')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', firstOfMonth)
      .lte('created_at', lastOfMonth + 'T23:59:59'),
    // RDVs planifiés ce mois
    supabase
      .from('calendar_events')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'confirmed')
      .gte('start_datetime', firstOfMonth),
    // Actifs à Bali
    supabase
      .from('cases')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active'),
    // Paiements reçus ce mois
    supabase
      .from('cases')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'payment_received')
      .gte('updated_at', firstOfMonth),
    // Revenus ce mois
    supabase
      .from('cases')
      .select('payment_amount')
      .gte('payment_date', firstOfMonth)
      .lte('payment_date', lastOfMonth)
      .not('payment_amount', 'is', null),
    // En attente paiement
    supabase
      .from('cases')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'payment_pending'),
  ])

  const revenueMonth = (revenueData.data ?? []).reduce((sum, c) => sum + (Number(c.payment_amount) || 0), 0)

  return NextResponse.json({
    candidats_month: candidats.count ?? 0,
    rdv_month: rdvs.count ?? 0,
    active_bali: actifs.count ?? 0,
    payments_month: payments.count ?? 0,
    revenue_month: revenueMonth,
    pending_payment: pendingPaymentRes.count ?? 0,
  })
}
