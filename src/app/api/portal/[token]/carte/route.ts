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
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const supabase = getServiceClient()

  const { data: caseData } = await supabase
    .from('cases')
    .select(`
      id,
      arrival_date,
      actual_start_date,
      actual_end_date,
      intern_card_generated_at,
      interns (
        id,
        first_name,
        last_name,
        photo_id_url,
        photo_url
      )
    `)
    .eq('portal_token', token)
    .maybeSingle()

  if (!caseData) return NextResponse.json({ error: 'Token invalide' }, { status: 404 })

  // Active on-site partners
  const { data: partners } = await supabase
    .from('partners')
    .select('id, name, offer_details, discount_percentage, category')
    .eq('is_on_site', true)
    .eq('is_active', true)
    .order('name')

  const intern = (Array.isArray(caseData.interns) ? caseData.interns[0] : caseData.interns) as unknown as {
    id: string
    first_name: string
    last_name: string
    photo_id_url?: string | null
    photo_url?: string | null
  } | null

  return NextResponse.json({
    intern: {
      first_name: intern?.first_name ?? '',
      last_name: intern?.last_name ?? '',
      photo_url: intern?.photo_url ?? intern?.photo_id_url ?? null,
    },
    actual_start_date: (caseData as Record<string, unknown>).actual_start_date as string | null ?? null,
    actual_end_date: (caseData as Record<string, unknown>).actual_end_date as string | null ?? null,
    arrival_date: caseData.arrival_date ?? null,
    partners: partners ?? [],
  })
}
