import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('email')
  if (!email) return NextResponse.json({ exists: false })

  const supabase = getServiceClient()
  const { data } = await supabase
    .from('interns')
    .select('id')
    .eq('email', email.toLowerCase().trim())
    .maybeSingle()

  return NextResponse.json({ exists: !!data })
}
