import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const supabase = getAdmin()

  // Try dossier-specific access first
  const { data: access } = await supabase
    .from('visa_agent_portal_access')
    .select('*, cases(*, interns(*), companies(*), visa_types(code, name), packages(name, description)), visa_agents(*)')
    .eq('token', token)
    .maybeSingle()

  if (access) {
    await supabase
      .from('visa_agent_portal_access')
      .update({ viewed_at: new Date().toISOString() })
      .eq('token', token)
    return NextResponse.json({ type: 'dossier', access })
  }

  // Fallback: agent-level portal (token = visa_agents.portal_token)
  const { data: agent } = await supabase
    .from('visa_agents')
    .select('*')
    .eq('portal_token', token)
    .maybeSingle()

  if (!agent) {
    return NextResponse.json({ error: 'Lien invalide ou expiré' }, { status: 404 })
  }

  const { data: recentDossiers } = await supabase
    .from('visa_agent_portal_access')
    .select('id, token, sent_at, viewed_at, cases(id, status, interns(first_name, last_name))')
    .eq('visa_agent_id', agent.id)
    .order('sent_at', { ascending: false })
    .limit(20)

  return NextResponse.json({ type: 'agent', agent, dossiers: recentDossiers ?? [] })
}
