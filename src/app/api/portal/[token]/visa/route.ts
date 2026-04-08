import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logActivity } from '@/lib/activity-logger'

const supabaseAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const ALLOWED_FIELDS = ['passport_page4_url', 'photo_id_url', 'bank_statement_url', 'return_plane_ticket_url']

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const supabase = supabaseAdmin()

  const { data: caseRow } = await supabase
    .from('cases')
    .select('id, intern_id')
    .eq('portal_token', token)
    .single()

  if (!caseRow) return NextResponse.json({ error: 'Token invalide' }, { status: 404 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const field = formData.get('field') as string | null

  if (!file || !field || !ALLOWED_FIELDS.includes(field)) {
    return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 })
  }

  const timestamp = Date.now()
  const ext = file.name.split('.').pop() ?? 'jpg'
  const storagePath = `${caseRow.intern_id}/${field}_${timestamp}.${ext}`

  const arrayBuffer = await file.arrayBuffer()
  const { error: uploadError } = await supabase.storage
    .from('intern-docs')
    .upload(storagePath, arrayBuffer, { contentType: file.type, upsert: false })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: { publicUrl } } = supabase.storage.from('intern-docs').getPublicUrl(storagePath)

  // Update intern doc field
  await supabase.from('interns').update({ [field]: publicUrl }).eq('id', caseRow.intern_id)

  // If billet avion, update case flag too
  if (field === 'return_plane_ticket_url') {
    await supabase.from('cases').update({ billet_avion: true }).eq('id', caseRow.id)
  }

  // Check if all 4 docs are now complete
  const { data: intern } = await supabase
    .from('interns')
    .select('passport_page4_url, photo_id_url, bank_statement_url, return_plane_ticket_url')
    .eq('id', caseRow.intern_id)
    .single()

  const allComplete = !!(intern?.passport_page4_url && intern?.photo_id_url && intern?.bank_statement_url && intern?.return_plane_ticket_url)

  if (allComplete) {
    await supabase.from('cases').update({ papiers_visas: true, updated_at: new Date().toISOString() }).eq('id', caseRow.id)
    await logActivity({
      caseId: caseRow.id,
      type: 'visa_docs_completed',
      title: 'Documents visa complétés',
      description: 'Le candidat a uploadé tous les documents requis pour le visa (passeport, photo, relevé bancaire, billet avion)',
      priority: 'high',
    })
  } else {
    await logActivity({
      caseId: caseRow.id,
      type: 'doc_uploaded' as 'cv_uploaded',
      title: 'Document uploadé',
      description: `Document uploadé par le candidat: ${field.replace(/_url$/, '').replace(/_/g, ' ')}`,
    })
  }

  return NextResponse.json({ success: true, url: publicUrl, all_complete: allComplete })
}
