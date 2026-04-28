import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { sendFromTemplate } from '@/lib/email/resend'

const TOUCHPOINTS = [
  { key: 'j3',  slug: 'touchpoint_j3',  column: 'touchpoint_j3_sent_at',  offsetDays:  3 },
  { key: 'j30', slug: 'touchpoint_j30', column: 'touchpoint_j30_sent_at', offsetDays: 30 },
  { key: 'j60', slug: 'touchpoint_j60', column: 'touchpoint_j60_sent_at', offsetDays: 60 },
  { key: 'end', slug: 'touchpoint_end', column: 'touchpoint_end_sent_at',  offsetDays: -14 },
] as const

type TouchpointKey = typeof TOUCHPOINTS[number]['key']

function getTriggerDate(startDate: string, endDate: string | null, offsetDays: number): Date {
  if (offsetDays < 0 && endDate) {
    const ret = new Date(endDate)
    ret.setDate(ret.getDate() + offsetDays)
    return ret
  }
  const start = new Date(startDate)
  start.setDate(start.getDate() + offsetDays)
  return start
}

// GET /api/touchpoints — returns cases with pending touchpoints
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const caseId = searchParams.get('case_id')

  try {
    const today = new Date(); today.setHours(0, 0, 0, 0)

    let query = supabase
      .from('cases')
      .select('id, actual_start_date, actual_end_date, touchpoint_j3_sent_at, touchpoint_j30_sent_at, touchpoint_j60_sent_at, touchpoint_end_sent_at, interns(first_name, last_name, email)')
      .eq('status', 'active')

    if (caseId) query = query.eq('id', caseId)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const pending: Array<{ caseId: string; internName: string; email: string; touchpointKey: TouchpointKey; triggerDate: string; daysOverdue: number }> = []

    for (const c of data ?? []) {
      if (!c.actual_start_date) continue
      const intern = c.interns as unknown as { email?: string; first_name?: string; last_name?: string } | null

      for (const tp of TOUCHPOINTS) {
        if ((c as Record<string, unknown>)[tp.column]) continue
        const triggerDate = getTriggerDate(c.actual_start_date, c.actual_end_date, tp.offsetDays)
        if (triggerDate <= today) {
          pending.push({
            caseId: c.id,
            internName: `${intern?.first_name ?? ''} ${intern?.last_name ?? ''}`.trim(),
            email: intern?.email ?? '',
            touchpointKey: tp.key,
            triggerDate: triggerDate.toISOString(),
            daysOverdue: Math.floor((today.getTime() - triggerDate.getTime()) / 86400000),
          })
        }
      }
    }

    return NextResponse.json(pending)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

// POST /api/touchpoints — send a specific touchpoint via template
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { case_id, touchpoint_key } = await request.json() as { case_id: string; touchpoint_key: TouchpointKey }

    const tp = TOUCHPOINTS.find(t => t.key === touchpoint_key)
    if (!tp) return NextResponse.json({ error: 'Invalid touchpoint' }, { status: 400 })

    const { data: caseData, error: fetchError } = await supabase
      .from('cases')
      .select('id, portal_token, actual_start_date, actual_end_date, interns(first_name, last_name, email)')
      .eq('id', case_id)
      .single()

    if (fetchError || !caseData) return NextResponse.json({ error: 'Case not found' }, { status: 404 })

    const intern = caseData.interns as unknown as { email?: string; first_name?: string } | null
    if (!intern?.email) return NextResponse.json({ error: 'Intern email missing' }, { status: 422 })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://bali-interns-os.vercel.app'
    const portalToken = (caseData as Record<string, unknown>).portal_token as string | null

    // UGC token for j30 (linked to submit-content page)
    const ugcToken = touchpoint_key === 'j30'
      ? Buffer.from(`${case_id}:${touchpoint_key}:${Date.now()}`).toString('base64url')
      : ''

    // Send via template
    await sendFromTemplate({
      slug: tp.slug,
      to: intern.email,
      vars: {
        first_name: intern.first_name ?? 'Intern',
        portal_url: portalToken ? `${appUrl}/portal/${portalToken}` : appUrl,
        ugc_url: ugcToken ? `${appUrl}/submit-content/${ugcToken}` : '',
        start_date: caseData.actual_start_date ?? '—',
      },
    })

    // Also send ugc_thank_you reminder at j30
    if (touchpoint_key === 'j30' && ugcToken) {
      await sendFromTemplate({
        slug: 'ugc_thank_you',
        to: intern.email,
        vars: {
          first_name: intern.first_name ?? 'Intern',
          ugc_url: `${appUrl}/submit-content/${ugcToken}`,
          portal_url: portalToken ? `${appUrl}/portal/${portalToken}` : appUrl,
        },
      })
    }

    // Mark as sent
    await supabase.from('cases').update({
      [tp.column]: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', case_id)

    // Log
    await supabase.from('activity_feed').insert({
      case_id,
      type: `touchpoint_${touchpoint_key}`,
      title: `Touchpoint ${tp.key.toUpperCase()} sent`,
      description: `Touchpoint email sent to ${intern.email}`,
      source: 'manual',
      status: 'completed',
    }).then(() => null, () => null)

    return NextResponse.json({ success: true, touchpoint: tp.key })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
