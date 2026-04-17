import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const ALLOWED = [
  'slug', 'title_en', 'title_fr', 'body_en', 'body_fr',
  'excerpt_en', 'excerpt_fr',
  'seo_title_en', 'seo_title_fr', 'seo_desc_en', 'seo_desc_fr',
  'category', 'tags', 'cover_image_url', 'author_name',
  'status', 'featured', 'reading_time_min', 'published_at',
]

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { data, error } = await supabase.from('blog_posts').select('*').eq('id', id).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json() as Record<string, unknown>

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const k of ALLOWED) if (k in body) update[k] = body[k]

  if (body.status === 'published') {
    const { data: current } = await supabase.from('blog_posts').select('published_at').eq('id', id).single()
    if (!current?.published_at) update.published_at = new Date().toISOString()
  }

  const { data, error } = await supabase.from('blog_posts').update(update).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message, details: error.details }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { error } = await supabase.from('blog_posts').update({ status: 'archived', updated_at: new Date().toISOString() }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
