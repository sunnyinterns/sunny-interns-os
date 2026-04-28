import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { sendFromTemplate } from '@/lib/email/resend'

function getAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET ?? 'cron'}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = getAdmin()
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const sent: string[] = []

  // Find active cases where actual_end_date is in 14 days
  const targetDate = new Date(today)
  targetDate.setDate(targetDate.getDate() + 14)
  const targetStr = targetDate.toISOString().split('T')[0]

  const { data: cases } = await admin
    .from('cases')
    .select('id, portal_token, actual_start_date, actual_end_date, actual_end_date, touchpoint_end_sent_at, interns(first_name, email)')
    .eq('status', 'active')
    .eq(actual_end_date, targetStr)
    .is(touchpoint_end_sent_at, null)
    .limit(50)

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://sunny-interns-os.vercel.app'

  for (const cas of cases ?? []) {
    const intern = cas.interns as { first_name?: string; email?: string } | null
    if (!intern?.email) continue
    try {
      await sendFromTemplate({
        slug: 'touchpoint_end',
        to: intern.email,
        vars: {
          first_name: intern.first_name ?? 'there',
          portal_url: `${appUrl}/portal/${cas.portal_token ?? ''}`,
        },
      })
      await admin.from('cases').update({
        touchpoint_end_sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', cas.id)
      sent.push(intern.email)
    } catch (e) {
      console.error('[touchpoint-end]', intern.email, e)
    }
  }

  return NextResponse.json({ sent: sent.length, detail: sent })
}
