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

  // Trouver les cas avec arrivée dans exactement 3 jours
  const in3days = new Date()
  in3days.setDate(in3days.getDate() + 3)
  const dateStr = in3days.toISOString().split('T')[0]

  const { data: cases } = await supabase
    .from('cases')
    .select('id, flight_number, interns(first_name, email, whatsapp)')
    .like('flight_arrival_time_local', `${dateStr}%`)
    .in('status', ['visa_received', 'arrival_prep', 'active'])

  const sent: string[] = []

  for (const c of (cases ?? [])) {
    const intern = c.interns as { first_name?: string; email?: string } | null
    if (!intern?.email) continue

    try {
      await resend.emails.send({
        from: 'Bali Interns <team@bali-interns.com>',
        to: intern.email,
        subject: `🇮🇩 Ton départ est dans 3 jours — Prépare-toi !`,
        html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px">
          <h2 style="color:#1a1918">Hey ${intern.first_name ?? 'stagiaire'} !</h2>
          <p>Ton départ est dans moins de 3 jours ! Voici ce qu'il faut faire avant de prendre l'avion.</p>
          <div style="background:#fef3c7;border-radius:12px;padding:16px;margin:16px 0">
            <p style="font-weight:600;margin-bottom:8px">📱 Télécharge l'application All Indonesia</p>
            <p>Le gouvernement indonésien exige que tu remplisses tes formulaires d'entrée via cette app avant d'embarquer.</p>
            <div style="display:flex;gap:12px;margin-top:12px">
              <a href="https://apps.apple.com/us/app/all-indonesia/id6749558272" style="background:#000;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-size:13px">Apple Store</a>
              <a href="https://play.google.com/store/apps/details?id=id.go.imigrasi.allindonesia" style="background:#34A853;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-size:13px">Google Play</a>
            </div>
          </div>
          <p>Bon voyage ! Ton chauffeur t'attendra à l'aéroport de Denpasar.<br/>Des questions ? Réponds directement à cet email.</p>
          <p style="color:#888;font-size:12px;margin-top:24px">Charly — Bali Interns<br/>Ce message est automatisé mais tu peux y répondre directement.</p>
        </div>`,
      })
      sent.push(c.id)
    } catch (e) {
      console.error('[CRON J-3] Email error:', e)
    }
  }

  console.log(`[CRON J-3] Sent ${sent.length} notifications`)
  return NextResponse.json({ sent: sent.length })
}
