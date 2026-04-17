import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const caseId = searchParams.get('case_id')
  const expectedStatus = searchParams.get('expected_status')
  if (!caseId) return NextResponse.json({ error: 'Missing case_id' }, { status: 400 })

  const admin = createAdminClient()
  const { data: c } = await admin.from('cases')
    .select('status, portal_token, fazza_transfer_sent, visa_submitted_to_agent_at, billing_company_id, package_id, payment_amount, interns(first_name, last_name, email)')
    .eq('id', caseId).single()

  if (!c) return NextResponse.json({ error: 'Case not found' }, { status: 404 })

  const [{ data: be }, { data: cl }, { data: af }, { data: an }, { data: va }] = await Promise.all([
    admin.from('billing_entries').select('type, amount_eur').eq('case_id', caseId),
    admin.from('case_logs').select('id').eq('case_id', caseId),
    admin.from('activity_feed').select('id').eq('case_id', caseId),
    admin.from('admin_notifications').select('id').eq('case_id', caseId),
    admin.from('visa_agent_portal_access').select('agent_status').eq('case_id', caseId).maybeSingle(),
  ])

  return NextResponse.json({
    status: c.status,
    match: !expectedStatus || c.status === expectedStatus,
    details: {
      portal_token: !!c.portal_token,
      billing_company: !!c.billing_company_id,
      package: !!c.package_id,
      payment_amount: c.payment_amount,
      transfer_sent: !!c.fazza_transfer_sent,
      visa_submitted: !!c.visa_submitted_to_agent_at,
      billing_entries: be?.length ?? 0,
      revenue_total: be?.filter(b=>b.type==='revenue').reduce((s,b)=>s+b.amount_eur,0) ?? 0,
      case_logs: cl?.length ?? 0,
      activities: af?.length ?? 0,
      admin_notifs: an?.length ?? 0,
      visa_agent_portal: va?.agent_status ?? null,
    }
  })
}
