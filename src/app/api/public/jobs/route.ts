import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/public/jobs?slug=xxx ou ?id=xxx
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const slug = searchParams.get('slug')
  const id = searchParams.get('id')

  if (!slug && !id) {
    // Lister tous les jobs publics
    const { data, error } = await sb()
      .from('jobs')
      .select(`
        id, public_title, title, status, location, wished_duration_months,
        wished_start_date, public_description, description,
        public_hook, public_vibe, public_perks, public_hashtags,
        seo_slug, cv_drop_enabled, cover_image_url, is_public,
        department, missions, required_languages, required_level,
        companies(id, name, logo_url, company_type)
      `)
      .eq('is_public', true)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data ?? [])
  }

  // Lookup par slug ou id
  let q = sb().from('jobs').select(`
    id, public_title, title, status, location, wished_duration_months,
    wished_start_date, wished_end_date, public_description, description,
    public_hook, public_vibe, public_perks, public_hashtags,
    seo_slug, cv_drop_enabled, cover_image_url, is_public,
    department, missions, skills_required, tools_required,
    required_languages, required_level, profile_sought,
    remote_ok, compensation_type, compensation_amount,
    companies(id, name, logo_url, company_type, location),
    social_posts(id, platform, content, hashtags, image_url, status, created_at)
  `)

  if (slug) q = q.eq('seo_slug', slug)
  else if (id) q = q.eq('id', id)

  const { data, error } = await q.single()
  if (error || !data) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

  // Ne pas exposer les jobs non publics (sauf si lookup par id authentifié)
  const job = data as Record<string, unknown>
  if (!job.is_public && !id) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(job)
}
