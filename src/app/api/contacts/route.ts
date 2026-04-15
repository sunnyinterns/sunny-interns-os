import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const companyId = searchParams.get('company_id')
  let query = supabase
    .from('contacts')
    .select(`
      id, first_name, last_name, job_title, email, phone, whatsapp, linkedin_url, gender, company_id,
      companies!company_id(id, name, is_employer, is_partner, is_supplier, logo_url, internship_city)
    `)
    .order('first_name')

  if (companyId) query = query.eq('company_id', companyId)
  const unlinked = searchParams.get('unlinked')
  const excludeLeft = searchParams.get('exclude_left')
  if (excludeLeft === 'true') query = query.or('left_company.is.null,left_company.eq.false')
  if (unlinked === 'true') query = query.is('company_id', null)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as Record<string, unknown>
  const { data, error } = await supabase
    .from('contacts')
    .insert(body)
    .select('*, companies!company_id(id, name)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
