import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import React from 'react'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  try {
    const { data: caseData } = await supabase
      .from('cases')
      .select('*, interns(*), jobs(*, companies(name))')
      .eq('id', id)
      .single()

    const intern = caseData?.interns as Record<string, string> | null
    const job = Array.isArray(caseData?.jobs) ? caseData.jobs[0] as Record<string, unknown> : null
    const company = job ? (job.companies as Record<string, string> | null) : null

    const { renderToBuffer, Document, Page, Text, View, StyleSheet } = await import('@react-pdf/renderer')

    const styles = StyleSheet.create({
      page: { padding: 60, fontFamily: 'Helvetica', fontSize: 11, lineHeight: 1.6, color: '#1a1918' },
      header: { marginBottom: 40, borderBottom: '2pt solid #c8a96e', paddingBottom: 16 },
      title: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: '#c8a96e', marginBottom: 4 },
      subtitle: { fontSize: 12, color: '#666' },
      section: { marginBottom: 20 },
      label: { fontFamily: 'Helvetica-Bold', fontSize: 10, color: '#666', marginBottom: 4 },
      value: { fontSize: 11 },
      signature: { marginTop: 60, flexDirection: 'row', justifyContent: 'space-between' },
      sigBlock: { width: '45%' },
    })

    const startDateValue = (caseData as Record<string, unknown>)?.actual_start_date ?? (caseData as Record<string, unknown>)?.desired_start_date
    const arrivalDate = startDateValue
      ? new Date(startDateValue as string).toLocaleDateString('fr-FR')
      : 'À définir'

    const endDateValue = (caseData as Record<string, unknown>)?.actual_end_date
    const returnDate = endDateValue
      ? new Date(endDateValue as string).toLocaleDateString('fr-FR')
      : 'À définir'

    const today = new Date().toLocaleDateString('fr-FR')
    const internName = `${intern?.first_name ?? ''} ${intern?.last_name ?? ''}`.trim()
    const companyName = company?.name ?? "l'entreprise partenaire"
    const durationWeeks = (caseData as Record<string, unknown>)?.duration_weeks ?? '?'

    const ce = React.createElement

    const doc = ce(Document, null,
      ce(Page, { size: 'A4', style: styles.page },
        ce(View, { style: styles.header },
          ce(Text, { style: styles.title }, 'Sunny Interns'),
          ce(Text, { style: styles.subtitle }, "Lettre d'engagement de stage"),
        ),
        ce(View, { style: styles.section },
          ce(Text, { style: styles.label }, 'DATE'),
          ce(Text, { style: styles.value }, today),
        ),
        ce(View, { style: styles.section },
          ce(Text, { style: styles.label }, 'STAGIAIRE'),
          ce(Text, { style: styles.value }, internName),
          ce(Text, { style: styles.value }, intern?.email ?? ''),
          ce(Text, { style: styles.value }, `École : ${intern?.school ?? 'Non précisé'}`),
        ),
        ce(View, { style: styles.section },
          ce(Text, { style: styles.label }, "ENTREPRISE D'ACCUEIL"),
          ce(Text, { style: styles.value }, company?.name ?? 'À confirmer'),
          ce(Text, { style: styles.value }, `Poste : ${(job?.title as string) ?? 'À confirmer'}`),
        ),
        ce(View, { style: styles.section },
          ce(Text, { style: styles.label }, 'PÉRIODE DE STAGE'),
          ce(Text, { style: styles.value }, `Du ${arrivalDate} au ${returnDate}`),
          ce(Text, { style: styles.value }, `Durée : ${String(durationWeeks)} semaines`),
        ),
        ce(View, { style: styles.section },
          ce(Text, null,
            `Par la présente, Sunny Interns confirme l'engagement de stage de ${internName} au sein de ${companyName} pour la période indiquée ci-dessus. Ce stage s'effectue dans le cadre d'une convention de stage validée par les parties.`
          ),
        ),
        ce(View, { style: styles.signature },
          ce(View, { style: styles.sigBlock },
            ce(Text, { style: styles.label }, 'SUNNY INTERNS'),
            ce(Text, null, '\n\n\n___________________________'),
            ce(Text, null, 'Sidney Ruby, Fondateur'),
          ),
          ce(View, { style: styles.sigBlock },
            ce(Text, { style: styles.label }, 'STAGIAIRE'),
            ce(Text, null, '\n\n\n___________________________'),
            ce(Text, null, internName),
          ),
        ),
      ),
    )

    const buffer = await renderToBuffer(doc)
    const uint8 = new Uint8Array(buffer)

    return new NextResponse(uint8, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="lettre-engagement-${intern?.last_name ?? 'stagiaire'}.pdf"`,
      },
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
