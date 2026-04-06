import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

async function handleUpdate(request: Request, id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json() as { subject?: string; body_html?: string }

    // Fetch current version to bump it
    const { data: current } = await supabase
      .from('email_templates')
      .select('version')
      .eq('id', id)
      .single()

    const nextVersion = (current?.version ?? 0) + 1

    const { data, error } = await supabase
      .from('email_templates')
      .update({
        subject: body.subject,
        body_html: body.body_html,
        version: nextVersion,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return params.then(({ id }) => handleUpdate(request, id))
}

export function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return params.then(({ id }) => handleUpdate(request, id))
}
