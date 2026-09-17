import { NextResponse } from 'next/server'

// Cron: repère les stagiaires avec "Convention Signée" cochée côté Airtable,
// crée le dossier-pont Supabase (via la route existante), envoie l'email de
// signature à l'employeur, et écrit le lien de retour dans Airtable.
// Schedule: */15 * * * * (toutes les 15 minutes)

const AIRTABLE_BASE = 'appijC0SkLqVUmHFl'
const TBL_INTERNS = 'tblkoVTEb2aje8kgB'
const TBL_JOBS = 'tblZs36QeArYVAT5L'
const TBL_CONTACTS = 'tblOz4IdsPAgesMLo'
const TBL_COMPANIES = 'tblvPVyryuF1VWA88'
const TBL_NATIONALITIES = 'tbl5b5wsuge7cq7TE'
const TBL_COUNTRIES = 'tblidj3toQO6PhuL9'

const F = {
  interns: {
    sentAt: 'fldnx9Ngr1WGO22QV',
    signingUrl: 'fldmvJtpxtjtytjea',
    jobsRetenus: 'fldqkfteH7GV0Lcfg',
    firstName: 'fldBieKu1lwDsyOXw',
    lastName: 'fldPEwd2vq7XZDQFW',
    errorField: 'fldW5r0M9V99hVSef',
  },
  jobs: { title: 'fldVvzDgM0E1wcE60', description: 'fldGQc3G2yrnBUlA7', contacts: 'fldpuXF7IjMVXpdqt' },
  contacts: {
    firstName: 'flddp2FliaDOlh6t0', lastName: 'fldHynHxST8GbhiQy', jobTitle: 'fldINioXmskLMnDeT',
    email: 'fldGVGLQRprc7NZWP', nationality: 'fldg1RaCf70PrxjHg', dob: 'fldanclnff3dArxPw',
    pob: 'fldmuIlhQCDRwbFAV', idType: 'fldalzsGGOiIj52au', idNumber: 'fldhYQcae7NGGar7H',
    companies: 'fldKelFFuiGjfoVlt',
  },
  companies: {
    name: 'fldtiNFkgNUwLVZ1g', legalType: 'fldraoKiHtjkEzoUk', address: 'fldUW4Gm0bepJNJrf',
    city: 'fldhrmqnOWOWaNoU4', country: 'fldsEG8dLyDnQUqmh', nib: 'fldWSsPpfexHuJOIH',
    npwp: 'fldYgKc5v5rrB3QPU', notary: 'fld6dIE3gdNtFoyuB', deedNumber: 'fldQTTxtqL3FycO82',
    deedDate: 'fld35uPhSiWHIYqsS', ahuNumber: 'fld2aGD4is1vFqnra', ahuDate: 'fldeSK50Vm1R4X6cY',
  },
}

async function at(path: string, init?: RequestInit) {
  const res = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
  if (!res.ok) throw new Error(`Airtable ${path}: ${res.status} ${await res.text()}`)
  return res.json()
}

async function getRecordName(tableId: string, recordId: string, nameFieldId: string): Promise<string> {
  const rec = await at(`${tableId}/${recordId}?returnFieldsByFieldId=true`)
  return rec.fields[nameFieldId] ?? ''
}

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  const expected = `Bearer ${process.env.CRON_SECRET ?? 'cron'}`
  if (auth !== expected) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Exclut les dossiers déjà clos (statuts terminaux) — un stage déjà terminé ou
  // un candidat qui n'est plus intéressé ne doit jamais recevoir de nouveau contrat
  const TERMINAL_STATUSES = ['Stage Terminé', "🤚 N'est plus intéressé", '🤚 Incapacité à trouver un stage']
  const statusExclusions = TERMINAL_STATUSES.map((s) => `{Intern_Status}!="${s}"`).join(', ')
  const formula = `AND({Convention Signée}=1, {Partnership Agreement Sent At}=BLANK(), {Partnership Agreement Error}=BLANK(), ${statusExclusions})`
  const list = await at(`${TBL_INTERNS}?filterByFormula=${encodeURIComponent(formula)}&returnFieldsByFieldId=true`)

  const results: Record<string, string>[] = []

  for (const intern of list.records ?? []) {
    try {
      const f = intern.fields
      const jobId = f[F.interns.jobsRetenus]?.[0]
      if (!jobId) continue
      const job = await at(`${TBL_JOBS}/${jobId}?returnFieldsByFieldId=true`)
      const contactId = job.fields[F.jobs.contacts]?.[0]
      if (!contactId) continue
      const contact = await at(`${TBL_CONTACTS}/${contactId}?returnFieldsByFieldId=true`)
      const companyId = contact.fields[F.contacts.companies]?.[0]
      if (!companyId) continue
      const company = await at(`${TBL_COMPANIES}/${companyId}?returnFieldsByFieldId=true`)

      const nationalityId = contact.fields[F.contacts.nationality]?.[0]
      const countryId = company.fields[F.companies.country]?.[0]
      const [nationalityName, countryName] = await Promise.all([
        nationalityId ? getRecordName(TBL_NATIONALITIES, nationalityId, 'fldL9k7et5s3Plxee') : Promise.resolve(''),
        countryId ? getRecordName(TBL_COUNTRIES, countryId, 'fldGDdyKI7LSMQAMM') : Promise.resolve(''),
      ])

      const bridgeRes = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/webhooks/airtable-agreement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          airtableInternRecordId: intern.id,
          companyName: company.fields[F.companies.name] ?? '',
          companyLegalType: company.fields[F.companies.legalType] ?? '',
          companyAddress: company.fields[F.companies.address] ?? '',
          companyCity: company.fields[F.companies.city] ?? '',
          companyCountry: countryName,
          companyNib: company.fields[F.companies.nib] ?? '',
          companyNpwp: company.fields[F.companies.npwp] ?? '',
          companyNotaryName: company.fields[F.companies.notary] ?? '',
          companyDeedNumber: company.fields[F.companies.deedNumber] ?? '',
          companyDeedDate: company.fields[F.companies.deedDate] ?? '',
          companyAhuNumber: company.fields[F.companies.ahuNumber] ?? '',
          companyAhuDate: company.fields[F.companies.ahuDate] ?? '',
          signatoryFirstName: contact.fields[F.contacts.firstName] ?? '',
          signatoryLastName: contact.fields[F.contacts.lastName] ?? '',
          signatoryEmail: contact.fields[F.contacts.email] ?? '',
          signatoryJobTitle: contact.fields[F.contacts.jobTitle] ?? '',
          signatoryNationality: nationalityName,
          signatoryDob: contact.fields[F.contacts.dob] ?? '',
          signatoryPlaceOfBirth: contact.fields[F.contacts.pob] ?? '',
          signatoryIdType: (contact.fields[F.contacts.idType] ?? '').toString().toLowerCase(),
          signatoryIdNumber: contact.fields[F.contacts.idNumber] ?? '',
          internFirstName: f[F.interns.firstName] ?? '',
          internLastName: f[F.interns.lastName] ?? '',
          jobTitle: job.fields[F.jobs.title] ?? '',
          jobDescription: job.fields[F.jobs.description] ?? '',
        }),
      })
      const bridgeJson = (await bridgeRes.json()) as { url?: string; error?: string }
      if (!bridgeJson.url) throw new Error(bridgeJson.error || 'no url returned')

      // IMPORTANT : aucun envoi automatique d'email. Le lien est généré et écrit dans
      // Airtable ; c'est Sidney qui déclenche l'envoi manuellement depuis le dashboard
      // (bouton de confirmation), jamais ce cron. Ne jamais réintroduire un appel Resend
      // ici sans confirmation explicite de Sidney.

      await at(`${TBL_INTERNS}/${intern.id}?returnFieldsByFieldId=true`, {
        method: 'PATCH',
        body: JSON.stringify({
          fields: {
            [F.interns.signingUrl]: bridgeJson.url,
            [F.interns.sentAt]: new Date().toISOString(),
          },
        }),
      })

      results.push({ internId: intern.id, url: bridgeJson.url })
    } catch (e) {
      results.push({ internId: intern.id, error: String(e) })
      // Coupe-circuit : on écrit l'erreur dans Airtable pour que ce dossier ne soit
      // plus jamais retenté automatiquement (évite les boucles infinies d'appels API,
      // cf. incident du 16/09). Il faut vider ce champ à la main une fois corrigé.
      try {
        await at(`${TBL_INTERNS}/${intern.id}?returnFieldsByFieldId=true`, {
          method: 'PATCH',
          body: JSON.stringify({
            fields: { [F.interns.errorField]: `${new Date().toISOString()} — ${String(e)}` },
          }),
        })
      } catch { /* si même l'écriture de l'erreur échoue, on abandonne ce tour pour ce dossier */ }
    }
  }

  return NextResponse.json({ processed: results.length, results })
}
