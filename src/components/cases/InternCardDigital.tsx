'use client'

interface InternData {
  first_name?: string
  last_name?: string
  email?: string
  avatar_url?: string | null
}

interface CaseDataProps {
  id: string
  status?: string
  arrival_date?: string | null
  return_date?: string | null
  destination?: string | null
  interns?: InternData | null
}

interface InternCardDigitalProps {
  caseData: CaseDataProps
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase()
}

export function InternCardDigital({ caseData }: InternCardDigitalProps) {
  const intern = caseData.interns
  const firstName = intern?.first_name ?? ''
  const lastName = intern?.last_name ?? ''
  const fullName = `${firstName} ${lastName}`.trim()

  const appUrl = typeof window !== 'undefined'
    ? window.location.origin
    : (process.env.NEXT_PUBLIC_APP_URL ?? 'https://sunny-interns-os.vercel.app')
  const verifyUrl = `${appUrl}/verify/${caseData.id}`
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(verifyUrl)}`

  return (
    <div className="w-80 rounded-2xl overflow-hidden border border-zinc-200 shadow-lg bg-white">
      {/* Header */}
      <div className="px-6 py-4 text-center" style={{ backgroundColor: '#c8a96e' }}>
        <p className="text-xs font-semibold uppercase tracking-widest text-white/80 mb-0.5">
          Sunny Interns
        </p>
        <p className="text-sm font-medium text-white/90">Carte Stagiaire</p>
      </div>

      {/* Avatar + Name */}
      <div className="px-6 py-5 text-center border-b border-zinc-100">
        {intern?.avatar_url ? (
          <img
            src={intern.avatar_url}
            alt={fullName}
            className="w-16 h-16 rounded-full object-cover mx-auto mb-3"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-[#c8a96e] flex items-center justify-center mx-auto mb-3">
            <span className="text-white text-xl font-semibold">
              {getInitials(firstName, lastName)}
            </span>
          </div>
        )}
        <h3 className="text-lg font-bold text-[#1a1918]">{fullName || 'N/A'}</h3>
        {intern?.email && (
          <p className="text-xs text-zinc-500 mt-0.5">{intern.email}</p>
        )}
      </div>

      {/* Details */}
      <div className="px-6 py-4 space-y-2 text-sm border-b border-zinc-100">
        {caseData.destination && (
          <div className="flex justify-between">
            <span className="text-zinc-500">Destination</span>
            <span className="font-medium text-[#1a1918]">{caseData.destination}</span>
          </div>
        )}
        {caseData.arrival_date && (
          <div className="flex justify-between">
            <span className="text-zinc-500">Arrivée</span>
            <span className="font-medium text-[#1a1918]">
              {new Date(caseData.arrival_date).toLocaleDateString('fr-FR')}
            </span>
          </div>
        )}
        {caseData.return_date && (
          <div className="flex justify-between">
            <span className="text-zinc-500">Retour</span>
            <span className="font-medium text-[#1a1918]">
              {new Date(caseData.return_date).toLocaleDateString('fr-FR')}
            </span>
          </div>
        )}
      </div>

      {/* QR + Download */}
      <div className="px-6 py-4 flex items-center justify-between gap-4">
        <div className="flex flex-col items-center gap-1">
          <img
            src={qrUrl}
            alt="QR Code de vérification"
            width={80}
            height={80}
            className="rounded"
          />
          <p className="text-[10px] text-zinc-400 text-center">Scanner pour vérifier</p>
        </div>
        <div className="flex-1 text-right">
          <button
            onClick={() => window.print()}
            className="px-3 py-2 text-xs font-medium bg-[#c8a96e] text-white rounded-lg hover:bg-[#b8945a] transition-colors block w-full mb-2"
          >
            Télécharger PDF
          </button>
          <p className="text-[10px] text-zinc-400">Cmd+P pour sauvegarder en PDF</p>
        </div>
      </div>
    </div>
  )
}
