import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST — déposer un CV sur une page job publique
export async function POST(req: NextRequest) {
  const body = await req.json() as {
    job_id: string
    first_name?: string
    last_name?: string
    email: string
    phone?: string
    cv_url?: string
    school?: string
    message?: string
  }

  if (!body.job_id || !body.email) {
    return NextResponse.json({ error: 'job_id et email requis' }, { status: 400 })
  }

  // Vérifier que le job existe et que cv_drop est activé
  const { data: job } = await sb()
    .from('jobs')
    .select('id, cv_drop_enabled, is_public, public_title, title')
    .eq('id', body.job_id)
    .single()

  if (!job) return NextResponse.json({ error: 'Job non trouvé' }, { status: 404 })
  if (!job.cv_drop_enabled) return NextResponse.json({ error: 'CV drop désactivé' }, { status: 403 })

  // Insérer le cv_drop
  const { data, error } = await sb().from('cv_drops').insert({
    job_id: body.job_id,
    first_name: body.first_name ?? null,
    last_name: body.last_name ?? null,
    email: body.email,
    phone: body.phone ?? null,
    cv_url: body.cv_url ?? null,
    school: body.school ?? null,
    message: body.message ?? null,
    source: 'job_page',
    status: 'new',
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    success: true,
    id: data.id,
    redirect: `/apply?prefill_email=${encodeURIComponent(body.email)}&prefill_job=${body.job_id}`,
  })
}

// GET — lister les CV drops (admin only)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const job_id = searchParams.get('job_id')

  let q = sb().from('cv_drops').select(`
    id, job_id, first_name, last_name, email, phone,
    cv_url, school, message, status, created_at,
    jobs(id, public_title, title, seo_slug)
  `).order('created_at', { ascending: false }).limit(100)

  if (job_id) q = q.eq('job_id', job_id)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
