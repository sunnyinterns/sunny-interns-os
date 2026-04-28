import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: caseRow } = await admin
    .from('cases')
    .select('id, intern_id, interns(first_name, last_name, email)')
    .eq('portal_token', token)
    .single()

  if (!caseRow) return NextResponse.json({ error: 'Invalid token' }, { status: 404 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

  const ext = file.name.split('.').pop() ?? 'pdf'
  const path = `cvs/${caseRow.intern_id}/cv_${Date.now()}.${ext}`
  const buffer = await file.arrayBuffer()

  const { error: uploadError } = await admin.storage
    .from('documents')
    .upload(path, buffer, { contentType: file.type, upsert: true })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: { publicUrl } } = admin.storage.from('documents').getPublicUrl(path)

  await admin
    .from('interns')
    .update({ local_cv_url: publicUrl, updated_at: new Date().toISOString() })
    .eq('id', caseRow.intern_id)

  await admin
    .from('job_submissions')
    .update({ cv_revision_done: true })
    .eq('case_id', caseRow.id)
    .eq('cv_revision_requested', true)

  await admin.from('activity_feed').insert({
    case_id: caseRow.id,
    type: 'cv_uploaded',
    title: 'New CV uploaded by candidate',
    description: `File: ${file.name}`,
    source: 'automation',
    status: 'pending',
  })

  if (process.env.RESEND_API_KEY) {
    const intern = ((Array.isArray(caseRow.interns) ? caseRow.interns[0] : caseRow.interns) ?? {}) as unknown as unknown as Record<string, unknown>
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://bali-interns-os.vercel.app'
    const { sendInternCommentNotification } = await import('@/lib/email/resend')
    await sendInternCommentNotification({
      caseId: caseRow.id,
      prenom: String(intern.first_name ?? ''),
      nom: String(intern.last_name ?? ''),
      comment: `New CV uploaded: ${publicUrl}`,
      caseUrl: `${appUrl}/fr/cases/${caseRow.id}`,
    })
  }

  return NextResponse.json({ ok: true, url: publicUrl })
}
