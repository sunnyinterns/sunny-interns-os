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
  const { data } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'form_price')
    .maybeSingle()

  return NextResponse.json({ price: data?.value ?? 990 })
}
