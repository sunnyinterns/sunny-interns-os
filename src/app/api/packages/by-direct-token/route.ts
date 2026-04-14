import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const token = url.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

  const supabase = getAdmin()
  const { data, error } = await supabase
    .from('packages')
    .select('id, name, description, price_eur, is_direct_client, is_active, visa_types(id, code, name, required_fields, required_documents)')
    .eq('direct_client_form_token', token)
    .eq('is_direct_client', true)
    .eq('is_active', true)
    .maybeSingle()

  if (error || !data) return NextResponse.json({ error: 'Invalid token' }, { status: 404 })
  return NextResponse.json(data)
}
