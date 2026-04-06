'use client'

interface InternData {
  id?: string
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  nationality?: string
  birth_date?: string
  passport_number?: string
  passport_expiry?: string
  avatar_url?: string
}

interface TabProfilProps {
  intern: InternData | null
  arrivalDate?: string | null
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col gap-0.5 py-2 border-b border-zinc-50 last:border-0">
      <span className="text-xs text-zinc-400 font-medium">{label}</span>
      <span className="text-sm text-[#1a1918]">{value || '—'}</span>
    </div>
  )
}

export function TabProfil({ intern, arrivalDate }: TabProfilProps) {
  if (!intern) {
    return <p className="text-sm text-zinc-400">Aucun profil associé</p>
  }

  // Passport validity check: warn if < 6 months after arrival
  let passportWarning: string | null = null
  if (intern.passport_expiry && arrivalDate) {
    const arrival = new Date(arrivalDate)
    const expiry = new Date(intern.passport_expiry)
    const sixMonthsAfter = new Date(arrival)
    sixMonthsAfter.setMonth(sixMonthsAfter.getMonth() + 6)
    if (expiry < sixMonthsAfter) {
      const expiryFormatted = expiry.toLocaleDateString('fr-FR')
      const limitFormatted = sixMonthsAfter.toLocaleDateString('fr-FR')
      passportWarning = `Passeport expire le ${expiryFormatted} — doit être valide jusqu'au ${limitFormatted} (J+6 mois)`
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-0 divide-y divide-zinc-50 bg-white rounded-xl border border-zinc-100 px-4">
        <InfoRow label="Prénom" value={intern.first_name} />
        <InfoRow label="Nom" value={intern.last_name} />
        <InfoRow label="Email" value={intern.email} />
        <InfoRow label="Téléphone" value={intern.phone} />
        <InfoRow label="Nationalité" value={intern.nationality} />
        <InfoRow
          label="Date de naissance"
          value={intern.birth_date ? new Date(intern.birth_date).toLocaleDateString('fr-FR') : undefined}
        />
        <InfoRow label="N° Passeport" value={intern.passport_number} />
        <InfoRow
          label="Expiration passeport"
          value={intern.passport_expiry ? new Date(intern.passport_expiry).toLocaleDateString('fr-FR') : undefined}
        />
      </div>

      {passportWarning && (
        <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
          <span className="text-[#d97706] text-base flex-shrink-0">⚠</span>
          <p className="text-sm text-amber-900">{passportWarning}</p>
        </div>
      )}
    </div>
  )
}
