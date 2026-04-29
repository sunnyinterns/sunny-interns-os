import { createClient } from '@/lib/supabase/server'
import { createClient as svc } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function getAdmin() {
  return svc(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// Called from OS (Charly) or from portal agent via separate route
// Body: multipart/form-data with file + case_id + source ('charly'|'agent')
export async function POST(req: Request) {
  const admin = getAdmin()

  // Auth: either OS session or internal key (for agent portal)
  const internalKey = req.headers.get('x-internal-key')
  const isInternal = internalKey === process.env.CRON_SECRET || internalKey === process.env.INTERNAL_API_KEY

  if (!isInternal) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const caseId = formData.get('case_id') as string | null
  const source = (formData.get('source') as string | null) ?? 'charly'

  if (!file || !caseId) return NextResponse.json({ error: 'Missing file or case_id' }, { status: 400 })

  const ext = file.name.split('.').pop() ?? 'pdf'
  const path = `visas/${caseId}/visa_${Date.now()}.${ext}`

  const buf = Buffer.from(await file.arrayBuffer())
  const { error: uploadErr } = await admin.storage
    .from('documents')
    .upload(path, buf, { contentType: file.type, upsert: true })

  if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 })

  const { data: urlData } = admin.storage.from('documents').getPublicUrl(path)
  const visaUrl = urlData.publicUrl

  // Update case + auto-set visa_received
  const { data: caseBeforeUpdate } = await admin.from('cases')
    .select('status, portal_token, interns(first_name, email)')
    .eq('id', caseId).single()
    
  await admin.from('cases').update({
    visa_url: visaUrl,
    visa_uploaded_at: new Date().toISOString(),
    visa_uploaded_by: source,
    visa_recu: true,
    status: 'visa_received',
    updated_at: new Date().toISOString(),
  }).eq('id', caseId)
  
  // Trigger email + notifications via status route if not already visa_received
  const wasAlreadyReceived = (caseBeforeUpdate as Record<string,unknown>)?.status === 'visa_received'
  const intern = (caseBeforeUpdate as Record<string,unknown>)?.interns as { first_name?: string; email?: string } | null
  const portalToken = (caseBeforeUpdate as Record<string,unknown>)?.portal_token as string | null
  
  if (!wasAlreadyReceived && intern?.email && intern.first_name) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
    // Email visa_received_intern avec lien de téléchargement direct
    try {
      const { data: tmpl } = await admin
        .from('email_templates')
        .select('subject, body_html')
        .eq('slug', 'visa_received_intern')
        .eq('is_active', true)
        .single()
      if (tmpl?.subject && tmpl?.body_html) {
        const portalUrl = portalToken ? `${appUrl}/portal/${portalToken}/visa` : appUrl
        let subject = (tmpl.subject as string).replace(/{{first_name}}/g, intern.first_name!)
        let html = (tmpl.body_html as string)
          .replace(/{{first_name}}/g, intern.first_name!)
          .replace(/{{visa_url}}/g, visaUrl)
          .replace(/{{portal_url}}/g, portalUrl)
        const { Resend } = await import('resend')
        const resend = new Resend(process.env.RESEND_API_KEY)
        await resend.emails.send({
          from: 'Bali Interns <team@bali-interns.com>',
          to: intern.email!,
          subject,
          html,
        })
      }
    } catch { /* non-blocking */ }
    // Also trigger status route for admin notifications
    try {
      void fetch(appUrl + '/api/cases/' + caseId + '/status', {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'x-internal-key': process.env.CRON_SECRET ?? '',
        },
        body: JSON.stringify({ status: 'visa_received' }),
      }).catch(() => null)
    } catch { /* non-blocking */ }
  }

  // Notify Charly if uploaded by agent
  if (source === 'agent') {
    const { data: caseRow } = await admin
      .from('cases')
      .select('interns(first_name, last_name)')
      .eq('id', caseId).single()
    const intern = (caseRow as Record<string,unknown>)?.interns as { first_name?: string; last_name?: string } | null
    const internName = [intern?.first_name, intern?.last_name].filter(Boolean).join(' ')
    await admin.from('admin_notifications').insert({
      type: 'visa_uploaded_by_agent',
      title: `🛂 Visa uploaded by agent — ${internName}`,
      body: `Visa document ready. Send to intern via email or WhatsApp.`,
      case_id: caseId,
      priority: 'high',
      is_read: false,
    })
    // Log activity
    await admin.from('activity_feed').insert({
      case_id: caseId,
      type: 'visa_uploaded',
      title: 'Visa document uploaded by agent',
      description: `Visa PDF uploaded. Status → visa_received.`,
      source: 'portal_agent',
      status: 'completed',
    }).then(() => null, () => null)
  }

  return NextResponse.json({ success: true, visa_url: visaUrl })
}
