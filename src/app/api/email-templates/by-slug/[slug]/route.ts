import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { slug } = await params
  const { data, error } = await supabase
    .from('email_templates')
    .select('slug, name, subject, body_html, variables')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Template not found' }, { status: 404 })
  return NextResponse.json(data)
}
