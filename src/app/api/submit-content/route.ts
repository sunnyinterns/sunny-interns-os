import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST /api/submit-content — public, no auth
export async function POST(request: Request) {
  // Use service role for public writes
  const supabase = await createClient()

  try {
    const body = await request.json() as {
      token: string
      testimonial?: string
      photo_url?: string
      video_url?: string
      rating?: number
    }

    if (!body.token) return NextResponse.json({ error: 'Token manquant' }, { status: 400 })

    // Decode token: base64url of "caseId:touchpointKey:timestamp"
    let caseId: string
    try {
      const decoded = Buffer.from(body.token, 'base64url').toString('utf-8')
      caseId = decoded.split(':')[0]
      if (!caseId) throw new Error('Invalid token')
    } catch {
      return NextResponse.json({ error: 'Token invalide' }, { status: 400 })
    }

    // Verify case exists
    const { data: caseData } = await supabase
      .from('cases')
      .select('id, interns(first_name, last_name)')
      .eq('id', caseId)
      .single()

    if (!caseData) return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 })

    // Insert UGC submission
    const { data, error } = await supabase
      .from('ugc_submissions')
      .insert({
        case_id: caseId,
        token: body.token,
        testimonial: body.testimonial ?? null,
        photo_url: body.photo_url ?? null,
        video_url: body.video_url ?? null,
        rating: body.rating ?? null,
        status: 'pending',
        submitted_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, id: data.id })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

// GET /api/submit-content?status=pending — admin only
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')

  try {
    let query = supabase
      .from('ugc_submissions')
      .select(`
        id, case_id, testimonial, photo_url, video_url, rating, status, submitted_at,
        cases(id, interns(first_name, last_name))
      `)
      .order('submitted_at', { ascending: false })

    if (status) query = query.eq('status', status)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data ?? [])
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

// PATCH /api/submit-content?id=xxx — admin status update
export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID manquant' }, { status: 400 })

  try {
    const { status } = await request.json() as { status: 'pending' | 'approved' | 'rejected' }
    const { data, error } = await supabase
      .from('ugc_submissions')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
