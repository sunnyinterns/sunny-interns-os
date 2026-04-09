import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET() {
  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from('job_types')
    .select('id, name_fr, name_en, category_fr, category_en, sort_order')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('job_types error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  // Normalize: add 'name' as alias for name_fr for compatibility
  const normalized = (data ?? []).map(j => ({ ...j, name: j.name_fr }))
  return NextResponse.json(normalized)
}
