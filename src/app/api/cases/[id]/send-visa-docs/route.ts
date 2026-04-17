import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { sendVisaDocsRequest } from '@/lib/email/resend'

function getAdmin() {
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const admin = getAdmin()

  const { data: caseRow } = await admin
    .from('cases')
    .select('portal_token, interns(first_name, last_name, email), packages(visa_types(code))')
    .eq('id', id).single()

  if (!caseRow) return NextResponse.json({ error: 'Case not found' }, { status: 404 })

  const intern = (caseRow as Record<string, unknown>).interns as { first_name?: string; last_name?: string; email?: string } | null
  const pkg = (caseRow as Record<string, unknown>).packages as { visa_types?: { code?: string } | null } | null
  const token = (caseRow as Record<string, unknown>).portal_token as string | null

  if (intern?.email) {
    void sendVisaDocsRequest({
      internEmail: intern.email,
      internFirstName: intern.first_name ?? 'Stagiaire',
      portalToken: token ?? '',
    })
  }

  return NextResponse.json({ success: true })
}
