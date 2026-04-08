import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const internId = searchParams.get('intern_id')
  if (!internId) return NextResponse.json({ error: 'intern_id requis' }, { status: 400 })

  const { data, error } = await supabase
    .from('cv_versions')
    .select('*')
    .eq('intern_id', internId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(request: Request) {
  const supabase = await createClient()

  const body = await request.json() as {
    intern_id: string
    url: string
    filename?: string
    uploaded_by?: string
  }

  if (!body.intern_id || !body.url) {
    return NextResponse.json({ error: 'intern_id et url requis' }, { status: 400 })
  }

  // Set previous versions as not current
  await supabase
    .from('cv_versions')
    .update({ is_current: false })
    .eq('intern_id', body.intern_id)

  // Get version number
  const { count } = await supabase
    .from('cv_versions')
    .select('*', { count: 'exact', head: true })
    .eq('intern_id', body.intern_id)

  const { data, error } = await supabase
    .from('cv_versions')
    .insert({
      intern_id: body.intern_id,
      url: body.url,
      filename: body.filename ?? null,
      uploaded_by: body.uploaded_by ?? 'intern',
      version_number: (count ?? 0) + 1,
      is_current: true,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Update intern.cv_url
  await supabase
    .from('interns')
    .update({ cv_url: body.url, cv_revision_requested: false })
    .eq('id', body.intern_id)

  return NextResponse.json(data, { status: 201 })
}
