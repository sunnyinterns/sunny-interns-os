import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const supabase = getAdmin()

  const body = await request.json() as {
    agent_status?: string
    comments?: string
    received_at?: string
  }

  const { data: access } = await supabase
    .from('visa_agent_portal_access')
    .select('id')
    .eq('token', token)
    .maybeSingle()

  if (!access) {
    return NextResponse.json({ error: 'Invalid link' }, { status: 404 })
  }

  const update: Record<string, unknown> = {}
  if (body.agent_status !== undefined) update.agent_status = body.agent_status
  if (body.comments !== undefined) update.comments = body.comments
  if (body.received_at !== undefined) update.received_at = body.received_at

  if (Object.keys(update).length) {
    await supabase
      .from('visa_agent_portal_access')
      .update(update)
      .eq('id', access.id)
  }

  // Notify Charly if agent marks as received or reports an issue
  if (body.agent_status === 'received' || body.agent_status === 'issue') {
    try {
      const { data: accessFull } = await supabase
        .from('visa_agent_portal_access')
        .select('case_id, visa_agents(name, email)')
        .eq('id', access.id)
        .maybeSingle()
      if (accessFull?.case_id) {
        const { data: caseRow } = await supabase
          .from('cases')
          .select('interns(first_name, last_name)')
          .eq('id', accessFull.case_id)
          .single()
        const intern = (caseRow as Record<string, unknown>)?.interns as { first_name?: string; last_name?: string } | null
        const internName = [intern?.first_name, intern?.last_name].filter(Boolean).join(' ')
        const agentRaw = accessFull.visa_agents as unknown
        const agentObj = (typeof agentRaw === 'object' && agentRaw !== null && !Array.isArray(agentRaw)) ? agentRaw as Record<string,unknown> : null
        const agentName = String(agentObj?.name ?? 'Visa agent')
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
        await supabase.from('admin_notifications').insert({
          type: body.agent_status === 'received' ? 'visa_agent_received' : 'visa_agent_issue',
          title: body.agent_status === 'received'
            ? `📥 Visa dossier received by ${agentName} — ${internName}`
            : `⚠️ Visa agent reported an issue — ${internName}`,
          body: body.comments ?? '',
          case_id: accessFull.case_id,
          priority: body.agent_status === 'issue' ? 'critical' : 'high',
          is_read: false,
        })
        if (body.agent_status === 'received') {
          // Also update cases.visa_submitted_to_agent_at if not already set
          await supabase.from('cases')
            .update({ visa_submitted_to_agent_at: new Date().toISOString() })
            .eq('id', accessFull.case_id)
            .is('visa_submitted_to_agent_at', null)
        }
      }
    } catch { /* non-blocking */ }
  }

  return NextResponse.json({ success: true })
}
