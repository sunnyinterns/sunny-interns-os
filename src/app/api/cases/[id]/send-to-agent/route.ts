import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { sendNewCustomerFazza } from '@/lib/email/resend'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  // Fetch case with all related data
  const { data: c } = await supabase
    .from('cases')
    .select(`
      *,
      interns(*),
      packages(name, price_eur, visa_cost_idr, package_type, processing_days),
      visa_types(code, name)
    `)
    .eq('id', id)
    .single()

  if (!c) return NextResponse.json({ error: 'Case not found' }, { status: 404 })

  // Guard: docs must be complete
  if (!c.billet_avion || !c.papiers_visas) {
    return NextResponse.json(
      { error: 'Documents incomplets', missing: { billet_avion: !c.billet_avion, papiers_visas: !c.papiers_visas } },
      { status: 400 }
    )
  }

  const intern = c.interns as Record<string, string | number | boolean | null>
  const pkg = c.packages as Record<string, string | number | boolean | null> | null
  const visaType = c.visa_types as Record<string, string> | null

  const startDate = c.actual_start_date ?? c.desired_start_date ?? ''
  const endDate = c.actual_end_date ?? ''
  const nbJours = startDate && endDate
    ? Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000)
    : (c.desired_duration_months ? c.desired_duration_months * 30 : 0)

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://sunny-interns-os.vercel.app'

  await sendNewCustomerFazza({
    prenom: intern.first_name as string ?? '',
    nom: intern.last_name as string ?? '',
    jobTitle: c.qualification_notes ?? '',
    companyName: '',
    nbJours,
    startDate,
    endDate,
    visaType: visaType?.code ?? 'A définir',
    packageType: pkg?.package_type as string ?? 'Standard',
    noteAgent: c.note_for_agent ?? '',
    email: intern.email as string ?? '',
    whatsapp: intern.whatsapp as string ?? '',
    passportNumber: intern.numero_passeport as string ?? intern.passport_number as string ?? '',
    nationality: intern.nationality as string ?? '',
    motherFirst: intern.mother_first_name as string ?? '',
    motherLast: intern.mother_last_name as string ?? '',
    visaCostIdr: pkg?.visa_cost_idr as number ?? 6000000,
    photoUrl: intern.photo_id_url as string ?? undefined,
    bankUrl: intern.bank_statement_url as string ?? undefined,
    passportUrl: intern.passport_page4_url as string ?? undefined,
  })

  // Update case
  await supabase.from('cases').update({
    visa_submitted_to_agent_at: new Date().toISOString(),
    status: 'visa_submitted',
  }).eq('id', id)

  // Feed
  await supabase.from('activity_feed').insert({
    case_id: id,
    type: 'info_status_changed',
    priority: 'normal',
    title: `Dossier envoyé à FAZZA`,
    status: 'done',
  })

  return NextResponse.json({ success: true })
}
