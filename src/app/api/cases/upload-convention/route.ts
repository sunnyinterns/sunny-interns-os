import { createClient } from '@/lib/supabase/server'
import { createClient as svc } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const caseId = formData.get('case_id') as string | null

  if (!file || !caseId) return NextResponse.json({ error: 'Missing file or case_id' }, { status: 400 })

  const admin = svc(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const ext = file.name.split('.').pop() ?? 'pdf'
  const path = `conventions/${caseId}/convention_${Date.now()}.${ext}`

  const buf = Buffer.from(await file.arrayBuffer())
  const { error: uploadErr } = await admin.storage.from('documents').upload(path, buf, {
    contentType: file.type, upsert: true,
  })
  if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 })

  const { data: urlData } = admin.storage.from('documents').getPublicUrl(path)
  await admin.from('cases').update({ convention_url: urlData.publicUrl }).eq('id', caseId)

  return NextResponse.json({ success: true, url: urlData.publicUrl })
}
