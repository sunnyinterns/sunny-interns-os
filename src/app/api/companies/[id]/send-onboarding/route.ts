import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  // Get or generate onboarding token
  const { data: company } = await supabase
    .from('companies')
    .select('id, name, onboarding_token')
    .eq('id', id)
    .single()

  if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 })

  let token = company.onboarding_token
  if (!token) {
    token = crypto.randomUUID()
    await supabase
      .from('companies')
      .update({ onboarding_token: token })
      .eq('id', id)
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.sunny-interns.com'
  const link = `${appUrl}/onboarding/company/${token}`

  return NextResponse.json({ link, token })
}
