import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { sendFromTemplate } from '@/lib/email/resend'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://bali-interns-os.vercel.app'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: companyId } = await params
  const { contact_id } = await request.json() as { contact_id: string }

  const { data: company } = await supabase.from('companies').select('id,name').eq('id', companyId).single()
  const { data: contact } = await supabase.from('contacts').select('id,first_name,last_name,email').eq('id', contact_id).single()

  if (!company || !contact?.email) return NextResponse.json({ error: 'Missing contact email' }, { status: 400 })

  let { data: access } = await supabase
    .from('employer_portal_access')
    .select('token')
    .eq('company_id', companyId)
    .eq('contact_id', contact_id)
    .maybeSingle()

  if (!access) {
    const { data: na } = await supabase
      .from('employer_portal_access')
      .insert({ company_id: companyId, contact_id, sent_at: new Date().toISOString() })
      .select('token')
      .single()
    access = na
  } else {
    await supabase
      .from('employer_portal_access')
      .update({ sent_at: new Date().toISOString() })
      .eq('company_id', companyId)
      .eq('contact_id', contact_id)
  }

  if (!access) return NextResponse.json({ error: 'Portal creation error' }, { status: 500 })

  const tok = (access as { token: string }).token
  const portalUrl = `${APP_URL}/portal/employer/${tok}`
  const name = [contact.first_name, contact.last_name].filter(Boolean).join(' ')

  await sendFromTemplate({
    slug: 'employer_welcome',
    to: contact.email,
    vars: {
      contact_name: name,
      company_name: company.name,
      portal_url: portalUrl,
    },
  })

  return NextResponse.json({ success: true, token: tok })
}
