import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { key } = await params
  const body = await req.json() as { url?: string; name?: string }

  const { data, error } = await supabase
    .from('brand_assets')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('key', key)
    .select()
    .single()

  if (error) {
    // If row doesn't exist, insert it
    const { data: inserted } = await supabase
      .from('brand_assets')
      .insert({ key, ...body, updated_at: new Date().toISOString() })
      .select()
      .single()
    return NextResponse.json(inserted ?? { key, ...body })
  }

  return NextResponse.json(data)
}
