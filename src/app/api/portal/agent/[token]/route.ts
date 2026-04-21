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

  // Try dossier-specific access first — query séquentielle pour éviter les FK manquantes
  const { data: access } = await supabase
    .from('visa_agent_portal_access')
    .select('*, visa_agents(*)')
    .eq('token', token)
    .maybeSingle()

  if (access) {
    // Fetch case + intern séparément
    const { data: caseData } = access.case_id ? await supabase
      .from('cases')
      .select('*, interns(*), visa_types(code, name), packages(name, description)')
      .eq('id', access.case_id)
      .single() : { data: null }

    // Enrichir avec la company d'accueil via job_submissions → jobs → companies
    let hostCompany = null
    if (access.case_id) {
      const { data: js } = await supabase
        .from('job_submissions')
        .select('jobs(title, companies(name, city, internship_city))')
        .eq('case_id', access.case_id)
        .eq('status', 'retained')
        .limit(1)
        .maybeSingle()
      hostCompany = (((js?.jobs as unknown) as Record<string, unknown> | null)?.companies as Record<string, unknown> | null) ?? null
    }

    await supabase
      .from('visa_agent_portal_access')
      .update({ viewed_at: new Date().toISOString() })
      .eq('token', token)
    return NextResponse.json({ type: 'dossier', access: { ...access, case: { ...caseData, company_name: (hostCompany as Record<string, unknown> | null)?.name, internship_city: (hostCompany as Record<string, unknown> | null)?.internship_city ?? (hostCompany as Record<string, unknown> | null)?.city } } })
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
