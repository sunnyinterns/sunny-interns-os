import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const supabase = supabaseAdmin()

  // Get case by token
  const { data: caseRow, error: caseError } = await supabase
    .from('cases')
    .select('id, intern_id')
    .eq('portal_token', token)
    .single()

  if (caseError || !caseRow) {
    return NextResponse.json({ error: 'Token invalide' }, { status: 404 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

  const timestamp = Date.now()
  const ext = file.name.split('.').pop() ?? 'pdf'
  const storagePath = `${caseRow.intern_id}/cv_${timestamp}.${ext}`

  const arrayBuffer = await file.arrayBuffer()
  const { error: uploadError } = await supabase.storage
    .from('intern-cvs')
    .upload(storagePath, arrayBuffer, { contentType: file.type, upsert: false })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: { publicUrl } } = supabase.storage.from('intern-cvs').getPublicUrl(storagePath)

  // Get current version count
  const { count } = await supabase
    .from('cv_versions')
    .select('id', { count: 'exact', head: true })
    .eq('intern_id', caseRow.intern_id)

  const versionNumber = (count ?? 0) + 1

  // Insert cv_version record
  await supabase.from('cv_versions').insert({
    intern_id: caseRow.intern_id,
    url: publicUrl,
    filename: file.name,
    uploaded_by: 'intern',
    version_number: versionNumber,
  })

  // Update intern cv_url
  await supabase.from('interns').update({ cv_url: publicUrl }).eq('id', caseRow.intern_id)

  // Clear cv_revision_requested, mark cv_revision_done
  await supabase.from('cases').update({
    cv_revision_requested: false,
    cv_revision_done: true,
    updated_at: new Date().toISOString(),
  }).eq('id', caseRow.id)

  // Activity log
  await supabase.from('activity_feed').insert({
    case_id: caseRow.id,
    action_type: 'cv_uploaded',
    description: `Nouveau CV uploadé par le candidat (v${versionNumber})`,
  })

  return NextResponse.json({ success: true, url: publicUrl })
}
