import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { NextResponse } from 'next/server'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  const expected = `Bearer ${process.env.CRON_SECRET ?? 'cron'}`
  if (auth !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Stages qui finissent dans ~45 jours
  const in45 = new Date(); in45.setDate(in45.getDate() + 45)
  const in40 = new Date(); in40.setDate(in40.getDate() + 40)

  const { data: cases } = await supabase
    .from('cases')
    .select('id, actual_end_date, interns(first_name, last_name)')
    .in('status', ['active'])
    .gte('actual_end_date', in40.toISOString().split('T')[0])
    .lte('actual_end_date', in45.toISOString().split('T')[0])

  if ((cases?.length ?? 0) === 0) {
    return NextResponse.json({ checked: 0 })
  }

  try {
    await resend.emails.send({
      from: 'Sunny Interns <team@bali-interns.com>',
      to: 'charly@bali-interns.com',
      subject: `🔄 ${cases!.length} stage(s) se terminent dans ~45 jours — Re-staffer ?`,
      html: `<div style="font-family:sans-serif;max-width:600px;padding:24px">
        <h2 style="color:#c8a96e">Rappel re-staffing — ${cases!.length} stage(s)</h2>
        <p>${cases!.length} stagiaire(s) finissent leur stage dans 40 à 45 jours. Voulez-vous les contacter pour un re-staffing ?</p>
        <ul style="line-height:1.8">
          ${cases!.map(c => {
            const i = c.interns as { first_name?: string; last_name?: string } | null
            return `<li><strong>${i?.first_name ?? ''} ${i?.last_name ?? ''}</strong> — fin : ${c.actual_end_date}</li>`
          }).join('')}
        </ul>
        <p style="color:#888;font-size:12px;margin-top:24px">Bali Interns OS — Alerte automatique hebdomadaire</p>
      </div>`,
    })
  } catch (e) {
    console.error('[CRON J-45] Email error:', e)
  }

  return NextResponse.json({ checked: cases?.length ?? 0 })
}
