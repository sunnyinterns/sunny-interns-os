import { createClient } from '@/lib/supabase/server'
import { createClient as adminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { sendDossierPretAgent } from '@/lib/email/resend'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json().catch(() => ({})) as { note_for_agent?: string; manager_name?: string; manager_whatsapp?: string }

  const admin = adminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Fetch agent email for this case (via package → visa_agent)
  const { data: caseRow } = await admin
    .from('cases')
    .select('packages(visa_agents(email, contact_emails))')
    .eq('id', id)
    .maybeSingle()

  const pkg = (caseRow as Record<string, unknown>)?.packages as Record<string, unknown> | null
  const agent = pkg?.visa_agents as { email?: string; contact_emails?: string[] } | null
  const agentEmail = (agent?.contact_emails?.[0]) ?? agent?.email

  await sendDossierPretAgent({
    caseId: id,
    agentEmail,
    managerName: body.manager_name,
    managerWhatsapp: body.manager_whatsapp,
    noteForAgent: body.note_for_agent,
  })

  const now = new Date().toISOString()
  await admin.from('cases').update({
    visa_submitted_to_agent_at: now,
    status: 'visa_docs_sent',
    updated_at: now,
  }).eq('id', id)

  await admin.from('activity_feed').insert({
    case_id: id,
    type: 'visa_sent_to_agent',
    title: 'Visa dossier sent to agent',
    description: agentEmail ? `Sent to ${agentEmail}` : 'Sent to default agent',
    source: 'manual',
    status: 'completed',
  }).then(() => null, () => null)

  return NextResponse.json({ success: true, sent_at: now })
}
