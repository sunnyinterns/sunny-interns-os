import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function getAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// Visa upload by agent — authenticated via portal token (no user session required)
export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const admin = getAdmin()

  // Auth via agent token
  const { data: access } = await admin
    .from('visa_agent_portal_access')
    .select('id, case_id')
    .eq('token', token)
    .maybeSingle()

  if (!access?.case_id) {
    return NextResponse.json({ error: 'Invalid or expired agent link' }, { status: 403 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const ext = file.name.split('.').pop() ?? 'pdf'
  const storagePath = `visas/${access.case_id}/visa_${Date.now()}.${ext}`

  const buf = Buffer.from(await file.arrayBuffer())
  const { error: uploadErr } = await admin.storage
    .from('documents')
    .upload(storagePath, buf, { contentType: file.type, upsert: true })

  if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 })

  const { data: urlData } = admin.storage.from('documents').getPublicUrl(storagePath)
  const visaUrl = urlData.publicUrl

  // 1. Update visa_agent_portal_access with doc URL
  await admin.from('visa_agent_portal_access').update({
    visa_doc_url: visaUrl,
    received_at: new Date().toISOString(),
    agent_status: 'visa_uploaded',
  }).eq('id', access.id)

  // 2. Update case.visa_url + trigger visa_received
  const { data: caseRow } = await admin
    .from('cases')
    .select('status, portal_token, interns(first_name, last_name)')
    .eq('id', access.case_id).single()

  await admin.from('cases').update({
    visa_url: visaUrl,
    visa_received_at: new Date().toISOString(),
    visa_url_uploaded_by: 'agent',
    updated_at: new Date().toISOString(),
  }).eq('id', access.case_id)

  // 3. Trigger status visa_received if not already
  const wasAlready = (caseRow as Record<string,unknown>)?.status === 'visa_received'
  if (!wasAlready) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
    void fetch(`${appUrl}/api/cases/${access.case_id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-key': process.env.CRON_SECRET ?? '',
      },
      body: JSON.stringify({ status: 'visa_received' }),
    }).catch(() => null)
  }

  // 4. Notify Charly
  const intern = (caseRow as Record<string,unknown>)?.interns as { first_name?: string; last_name?: string } | null
  const internName = [intern?.first_name, intern?.last_name].filter(Boolean).join(' ')
  await admin.from('admin_notifications').insert({
    type: 'visa_uploaded_by_agent',
    title: `🛂 Visa uploaded by agent — ${internName}`,
    body: 'Visa document ready. Download link sent to intern automatically.',
    case_id: access.case_id,
    priority: 'high',
    is_read: false,
  })

  return NextResponse.json({ success: true, visa_url: visaUrl })
}
