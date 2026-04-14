import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  try {
    // Load case with intern + package + agent
    const { data: caseRow, error: caseErr } = await supabase
      .from('cases')
      .select('*, interns(*), packages(*, visa_agents(*))')
      .eq('id', id)
      .single()

    if (caseErr || !caseRow) return NextResponse.json({ error: 'Case not found' }, { status: 404 })

    const pkg = caseRow.packages as { visa_agents?: { id: string; company_name?: string; name?: string; contact_emails?: string[]; email?: string } | null } | null
    let agent = pkg?.visa_agents ?? null

    // Fallback: default agent if no package agent
    if (!agent) {
      const { data: defaultAgent } = await supabase
        .from('visa_agents')
        .select('*')
        .eq('is_default', true)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle()
      agent = defaultAgent
    }

    if (!agent) return NextResponse.json({ error: 'Aucun agent visa configuré' }, { status: 400 })

    const emails = (agent.contact_emails && agent.contact_emails.length > 0)
      ? agent.contact_emails
      : (agent.email ? [agent.email] : [])

    if (emails.length === 0) return NextResponse.json({ error: "Agent sans email de contact" }, { status: 400 })

    // Create portal access token
    const { data: access, error: accessErr } = await supabase
      .from('visa_agent_portal_access')
      .insert({
        visa_agent_id: agent.id,
        case_id: id,
      })
      .select()
      .single()

    if (accessErr) throw accessErr

    const now = new Date().toISOString()
    const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://sunny-interns-os.vercel.app'
    const portalUrl = `${origin}/portal/agent/${access.token}`

    const intern = caseRow.interns as { first_name?: string; last_name?: string; passport_number?: string } | null
    const fullName = `${intern?.first_name ?? ''} ${intern?.last_name ?? ''}`.trim()

    // Send email via Resend
    if (resend) {
      try {
        await resend.emails.send({
          from: 'Charly de Bali Interns <team@bali-interns.com>',
          to: emails,
          subject: `Dossier visa VITAS — ${fullName} — Bali Interns`,
          html: `
            <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: auto; color:#1a1918;">
              <h2>Nouveau dossier visa — ${fullName}</h2>
              <p>Bonjour,</p>
              <p>Veuillez trouver le dossier complet du stagiaire ci-dessous :</p>
              <ul>
                <li><strong>Nom :</strong> ${fullName}</li>
                ${intern?.passport_number ? `<li><strong>Passeport :</strong> ${intern.passport_number}</li>` : ''}
              </ul>
              <p>👉 <a href="${portalUrl}" style="background:#c8a96e;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block;">Accéder au portail dossier</a></p>
              <p style="color:#666;font-size:13px;">Lien unique sans login : ${portalUrl}</p>
              <hr/>
              <p style="color:#999;font-size:12px;">Bali Interns · team@bali-interns.com · WhatsApp +33 6 43 48 77 36</p>
            </div>
          `,
        })
      } catch (e) {
        console.error('Resend send failed:', e)
      }
    }

    // Update case status
    await supabase
      .from('cases')
      .update({
        visa_submitted_to_agent_at: now,
        status: 'visa_docs_sent',
        updated_at: now,
      })
      .eq('id', id)

    // Activity log
    try {
      await supabase.from('activity_feed').insert({
        case_id: id,
        type: 'visa_sent_to_agent',
        title: `Dossier visa envoyé à ${agent.company_name ?? agent.name}`,
        description: `Envoyé à ${emails.join(', ')}`,
        metadata: { agent_id: agent.id, portal_token: access.token },
      })
    } catch { /* non-blocking */ }

    return NextResponse.json({ success: true, sent_at: now, portal_url: portalUrl, agent_name: agent.company_name ?? agent.name, emails })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
