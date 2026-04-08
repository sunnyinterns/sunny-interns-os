import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params
  const supabase = getServiceClient()

  const { data } = await supabase
    .from('affiliate_codes')
    .select('id, intern_id, is_active, interns(first_name)')
    .eq('code', code.toUpperCase())
    .eq('is_active', true)
    .maybeSingle()

  if (!data) return NextResponse.json({ valid: false })

  const intern = data.interns as { first_name?: string } | null
  return NextResponse.json({ valid: true, prenom: intern?.first_name ?? null })
}
