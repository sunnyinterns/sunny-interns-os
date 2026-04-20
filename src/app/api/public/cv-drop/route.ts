import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(req: NextRequest) {
  const fd = await req.formData()
  const cv = fd.get('cv') as File | null
  const job_id = fd.get('job_id') as string | null

  if (!cv || !job_id) return NextResponse.json({ error: 'cv + job_id requis' }, { status: 400 })
  if (cv.size > 10 * 1024 * 1024) return NextResponse.json({ error: 'Fichier trop grand (max 10MB)' }, { status: 400 })

  const ext = cv.name.split('.').pop() ?? 'pdf'
  const path = `cv-drops/${job_id}/${Date.now()}.${ext}`
  const buf = await cv.arrayBuffer()

  const { error } = await sb.storage.from('brand-assets').upload(path, buf, {
    contentType: cv.type || 'application/pdf',
    upsert: false,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: url } = sb.storage.from('brand-assets').getPublicUrl(path)

  // Log dans en_attente pour que Sidney voie le CV drop
  await sb.from('en_attente').insert({
    type: 'cv_drop',
    job_id,
    data: { cv_url: url.publicUrl, filename: cv.name, job_id },
    status: 'pending',
    created_at: new Date().toISOString(),
  }).then(() => {}).catch(() => {})

  return NextResponse.json({ success: true, cv_url: url.publicUrl })
}
