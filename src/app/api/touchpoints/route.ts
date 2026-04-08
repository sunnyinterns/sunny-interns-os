import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Touchpoint definitions: offset in days from actual_start_date
const TOUCHPOINTS = [
  { key: 'j3', column: 'touchpoint_j3_sent_at', offsetDays: 3, templateSubject: '[Touchpoint J+3] Comment se passe ton stage ?' },
  { key: 'j30', column: 'touchpoint_j30_sent_at', offsetDays: 30, templateSubject: '[Touchpoint J+30] Ton avis compte !' },
  { key: 'j60', column: 'touchpoint_j60_sent_at', offsetDays: 60, templateSubject: '[Touchpoint J+60] Bilan de mi-stage' },
  { key: 'end', column: 'touchpoint_end_sent_at', offsetDays: -14, templateSubject: '[Touchpoint J-14 fin] On prépare ton retour' },
] as const

type TouchpointKey = typeof TOUCHPOINTS[number]['key']

function getTouchpointTriggerDate(arrivalDate: string, returnDate: string | null, offsetDays: number): Date {
  if (offsetDays < 0 && returnDate) {
    // Negative offset = days before return date
    const ret = new Date(returnDate)
    ret.setDate(ret.getDate() + offsetDays)
    return ret
  }
  const arrival = new Date(arrivalDate)
  arrival.setDate(arrival.getDate() + offsetDays)
  return arrival
}

// GET /api/touchpoints — returns cases with pending touchpoints
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const caseId = searchParams.get('case_id')

  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let query = supabase
      .from('cases')
      .select(`
        id, actual_start_date, actual_end_date, desired_start_date,
        touchpoint_j3_sent_at, touchpoint_j30_sent_at,
        touchpoint_j60_sent_at, touchpoint_end_sent_at,
        interns(first_name, last_name, email)
      `)
      .eq('status', 'active')

    if (caseId) query = query.eq('id', caseId)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const pending: Array<{
      caseId: string
      internName: string
      email: string
      touchpointKey: TouchpointKey
      triggerDate: string
      daysOverdue: number
    }> = []

    for (const c of data ?? []) {
      if (!(c.actual_start_date || c.desired_start_date)) continue
      const intern = c.interns as unknown as { email?: string } | null

      for (const tp of TOUCHPOINTS) {
        const alreadySent = (c as Record<string, unknown>)[tp.column]
        if (alreadySent) continue

        const triggerDate = getTouchpointTriggerDate((c.actual_start_date || c.desired_start_date), c.actual_end_date, tp.offsetDays)
        if (triggerDate <= today) {
          const daysOverdue = Math.floor((today.getTime() - triggerDate.getTime()) / (1000 * 60 * 60 * 24))
          pending.push({
            caseId: c.id,
            internName: `${(c.interns as any)?.first_name} ${(c.interns as any)?.last_name}`,
            email: intern?.email ?? '',
            touchpointKey: tp.key,
            triggerDate: triggerDate.toISOString(),
            daysOverdue,
          })
        }
      }
    }

    return NextResponse.json(pending)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

// POST /api/touchpoints — send a specific touchpoint
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { case_id, touchpoint_key } = await request.json() as { case_id: string; touchpoint_key: TouchpointKey }

    const tp = TOUCHPOINTS.find((t) => t.key === touchpoint_key)
    if (!tp) return NextResponse.json({ error: 'Touchpoint invalide' }, { status: 400 })

    // Get case + intern info
    const { data: caseData, error: fetchError } = await supabase
      .from('cases')
      .select(`id, actual_start_date, actual_end_date, desired_start_date, interns(first_name, last_name, email)`)
      .eq('id', case_id)
      .single()

    if (fetchError || !caseData) return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 })

    const intern = caseData.interns as unknown as { email?: string; first_name?: string; last_name?: string } | null
    const email = intern?.email
    if (!email) return NextResponse.json({ error: 'Email stagiaire manquant' }, { status: 422 })

    // Build UGC token for j30
    const ugcToken = Buffer.from(`${case_id}:${touchpoint_key}:${Date.now()}`).toString('base64url')

    // Build email body
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    let emailHtml = `
      <p>Bonjour ${intern?.first_name ?? ''},</p>
      <p>${tp.templateSubject.replace(/^\[.*?\]\s*/, '')}</p>
    `
    if (touchpoint_key === 'j30') {
      emailHtml += `<p><a href="${appUrl}/submit-content/${ugcToken}">Partage ton expérience ici →</a></p>`
    }

    // Send via email route
    await fetch(`${appUrl}/api/emails/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: email,
        subject: tp.templateSubject,
        html: emailHtml,
      }),
    })

    // Mark as sent
    await supabase
      .from('cases')
      .update({
        [tp.column]: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', case_id)

    // Log activity
    await supabase.from('activity_feed').insert({
      case_id,
      type: `touchpoint_${touchpoint_key}`,
      title: `Touchpoint ${tp.key.toUpperCase()}`,
      description: `Touchpoint ${tp.key.toUpperCase()} envoyé à ${email}`,
    })

    return NextResponse.json({ success: true, touchpoint: tp.key })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
