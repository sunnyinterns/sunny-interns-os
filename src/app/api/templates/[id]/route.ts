import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import mammoth from 'mammoth'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { data, error } = await supabase
    .from('contract_templates')
    .select('*')
    .eq('id', id)
    .single()

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
  const contentType = request.headers.get('content-type') ?? ''

  // Handle docx upload
  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'Fichier requis' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())

    // Upload to storage
    const filename = `template-${id}-${Date.now()}.docx`
    await supabase.storage.from('templates').upload(filename, buffer, {
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      upsert: true,
    })
    const { data: urlData } = supabase.storage.from('templates').getPublicUrl(filename)

    // Convert to HTML
    const result = await mammoth.convertToHtml({ buffer })
    const html = result.value

    // Detect variables {{...}}
    const vars = [...html.matchAll(/\{\{(\w+)\}\}/g)].map(m => m[1])
    const uniqueVars = [...new Set(vars)]

    const { data, error } = await supabase
      .from('contract_templates')
      .update({
        docx_url: urlData.publicUrl,
        html_content: html,
        variables_detected: uniqueVars,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  // Handle JSON update
  const body = await request.json() as Record<string, unknown>
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  const allowed = ['name', 'html_content', 'variables_detected', 'is_active', 'language']
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  // Auto-detect variables if html_content changed
  if (typeof body.html_content === 'string') {
    const vars = [...body.html_content.matchAll(/\{\{(\w+)\}\}/g)].map(m => m[1])
    updates.variables_detected = [...new Set(vars)]
  }

  const { data, error } = await supabase
    .from('contract_templates')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
