import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('cases')
    .select(`
      id,
      status,
      portal_token,
      actual_start_date, actual_end_date, desired_start_date,
      billet_avion,
      engagement_letter_sent,
      payment_date,
      intern_card_generated_at,
      interns (
        id,
        first_name,
        last_name,
        email,
        cv_url,
        cv_revision_requested,
        intern_card_generated_at
      )
    `)
    .eq('interns.email', user.email ?? '')
    .maybeSingle()

  if (error || !data) {
    // Try by intern email join
    const { data: data2, error: err2 } = await supabase
      .from('interns')
      .select(`
        id,
        first_name,
        last_name,
        email,
        cv_url,
        cv_revision_requested,
        cases (
          id,
          status,
          portal_token,
          actual_start_date, actual_end_date, desired_start_date,
          billet_avion,
          engagement_letter_sent,
          payment_date,
          intern_card_generated_at
        )
      `)
      .eq('email', user.email ?? '')
      .maybeSingle()

    if (err2 || !data2) return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 })

    const cases = Array.isArray(data2.cases) ? data2.cases[0] : data2.cases
    return NextResponse.json({
      case_id: cases?.id,
      status: cases?.status,
      portal_token: cases?.portal_token,
      actual_start_date: cases?.actual_start_date,
      actual_end_date: cases?.actual_end_date,
      desired_start_date: cases?.desired_start_date,
      billet_avion: cases?.billet_avion,
      engagement_letter_sent: cases?.engagement_letter_sent,
      payment_date: cases?.payment_date,
      intern_card_generated_at: cases?.intern_card_generated_at,
      intern: {
        first_name: data2.first_name,
        last_name: data2.last_name,
        email: data2.email,
        cv_url: data2.cv_url,
        cv_revision_requested: data2.cv_revision_requested,
      },
    })
  }

  const intern = Array.isArray(data.interns) ? data.interns[0] : data.interns
  return NextResponse.json({
    case_id: data.id,
    status: data.status,
    portal_token: data.portal_token,
    actual_start_date: data.actual_start_date,
    actual_end_date: data.actual_end_date,
    desired_start_date: data.desired_start_date,
    billet_avion: data.billet_avion,
    engagement_letter_sent: data.engagement_letter_sent,
    payment_date: data.payment_date,
    intern_card_generated_at: data.intern_card_generated_at,
    intern: {
      first_name: intern?.first_name,
      last_name: intern?.last_name,
      email: intern?.email,
      cv_url: intern?.cv_url,
      cv_revision_requested: intern?.cv_revision_requested,
    },
  })
}
