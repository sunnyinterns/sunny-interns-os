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
    .from('internship_cities')
    .select('id, name, area, description, sort_order')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
  if (error) {
    console.error('internship_cities error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data ?? [])
}
