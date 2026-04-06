'use client'

interface TabVisaProps {
  caseData: {
    visa_submitted_at?: string | null
    visa_received_at?: string | null
    visa_type?: string | null
    metadata?: Record<string, unknown>
  }
}

interface ChecklistItem {
  label: string
  done: boolean
}

export function TabVisa({ caseData }: TabVisaProps) {
  const meta = caseData.metadata ?? {}

  const checklist: ChecklistItem[] = [
    { label: 'Photos passeport', done: !!(meta.passport_photos) },
    { label: 'Passeport scanné', done: !!(meta.passport_scan) },
    { label: 'Lettre convention signée', done: !!(meta.convention_letter) },
    { label: 'Formulaire visa rempli', done: !!(meta.visa_form) },
    { label: 'Visa soumis à l\'agent', done: !!(caseData.visa_submitted_at) },
    { label: 'Visa reçu', done: !!(caseData.visa_received_at) },
  ]

  const done = checklist.filter((c) => c.done).length
  const total = checklist.length

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="px-4 py-3 bg-white rounded-xl border border-zinc-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-[#1a1918]">Progression</span>
          <span className="text-sm text-zinc-500">{done}/{total}</span>
        </div>
        <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#0d9e75] rounded-full transition-all"
            style={{ width: `${Math.round((done / total) * 100)}%` }}
          />
        </div>
      </div>

      {/* Checklist */}
      <div className="bg-white rounded-xl border border-zinc-100 divide-y divide-zinc-50">
        {checklist.map((item) => (
          <div key={item.label} className="flex items-center gap-3 px-4 py-3">
            <div
              className={[
                'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                item.done
                  ? 'bg-[#0d9e75] border-[#0d9e75] text-white'
                  : 'bg-white border-zinc-200',
              ].join(' ')}
            >
              {item.done && (
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <span className={['text-sm', item.done ? 'text-[#1a1918]' : 'text-zinc-400'].join(' ')}>
              {item.label}
            </span>
          </div>
        ))}
      </div>

      {/* Dates */}
      {(caseData.visa_submitted_at || caseData.visa_received_at) && (
        <div className="bg-white rounded-xl border border-zinc-100 divide-y divide-zinc-50">
          {caseData.visa_submitted_at && (
            <div className="flex justify-between items-center px-4 py-3">
              <span className="text-sm text-zinc-500">Soumis le</span>
              <span className="text-sm font-medium text-[#1a1918]">
                {new Date(caseData.visa_submitted_at).toLocaleDateString('fr-FR')}
              </span>
            </div>
          )}
          {caseData.visa_received_at && (
            <div className="flex justify-between items-center px-4 py-3">
              <span className="text-sm text-zinc-500">Reçu le</span>
              <span className="text-sm font-medium text-[#1a1918]">
                {new Date(caseData.visa_received_at).toLocaleDateString('fr-FR')}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
