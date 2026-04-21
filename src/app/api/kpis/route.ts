import { createClient as serverClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const CANDIDATE_STATUSES = ['rdv_booked', 'qualification_done', 'job_submitted', 'job_retained', 'convention_signed']
const CLIENT_STATUSES = ['payment_pending', 'payment_received', 'visa_docs_sent', 'visa_in_progress', 'visa_submitted', 'visa_received', 'arrival_prep', 'active']

export async function GET() {
  const supabase = await serverClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getAdminClient()
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [
    leadsThisMonth,
    leadsAllTime,
    casesThisMonth,
    casesTotal,
    casesClients,
    billingRevenue,
  ] = await Promise.all([
    admin.from('leads').select('id', { count: 'exact', head: true }).gte('created_at', monthStart),
    admin.from('leads').select('id', { count: 'exact', head: true }),
    admin.from('cases').select('id', { count: 'exact', head: true }).gte('created_at', monthStart),
    admin.from('cases').select('id', { count: 'exact', head: true }).in('status', CANDIDATE_STATUSES),
    admin.from('cases').select('id', { count: 'exact', head: true }).in('status', CLIENT_STATUSES.concat(['alumni'])),
    admin.from('billing').select('amount_ttc').not('paid_at', 'is', null),
  ])

  const leads_this_month = leadsThisMonth.count ?? 0
  const leads_all_time = leadsAllTime.count ?? 0
  const cases_this_month = casesThisMonth.count ?? 0
  const cases_total = casesTotal.count ?? 0
  const clients_total = casesClients.count ?? 0

  const revenue_total = (billingRevenue.data ?? []).reduce(
    (sum, row) => sum + (row.amount_ttc ?? 0),
    0
  )

  const conversion_lead_to_rdv = leads_this_month > 0
    ? Math.round((cases_this_month / leads_this_month) * 100)
    : 0

  const all_cases_ever = leads_all_time + cases_total + clients_total
  const conversion_rdv_to_payment = all_cases_ever > 0
    ? Math.round((clients_total / all_cases_ever) * 100)
    : 0

  return NextResponse.json({
    leads_this_month,
    cases_total,
    clients_total,
    conversion_lead_to_rdv,
    conversion_rdv_to_payment,
    revenue_total,
  })
}
