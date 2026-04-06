'use client'

interface EmptyFeedProps {
  onCreateCase: () => void
}

export function EmptyFeed({ onCreateCase }: EmptyFeedProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-2xl bg-[#c8a96e]/10 flex items-center justify-center mb-6">
        <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="#c8a96e" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-[#1a1918] mb-2">Aucune activité pour le moment</h2>
      <p className="text-sm text-zinc-400 max-w-xs mb-8">
        Créez votre premier dossier pour commencer à suivre vos stagiaires et voir l&apos;activité ici.
      </p>
      <button
        onClick={onCreateCase}
        className="px-5 py-2.5 bg-[#c8a96e] hover:bg-[#b8994e] text-white text-sm font-medium rounded-lg transition-colors"
      >
        + Créer un premier dossier
      </button>
    </div>
  )
}
