'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

interface PortalData {
  case_id: string
  portal_token: string
  status: string
  intern: {
    first_name: string
    last_name: string
    email: string
    cv_url?: string
    cv_revision_requested?: boolean
    intern_card_generated_at?: string
  }
  arrival_date?: string
  billet_avion?: boolean
  engagement_letter_sent?: boolean
  payment_date?: string
  intern_card_generated_at?: string
}

export default function PortalDashboardPage() {
  const [data, setData] = useState<PortalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = getClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setError('Non connecté'); setLoading(false); return }
      const res = await fetch('/api/portal/me')
      if (!res.ok) { setError('Dossier introuvable'); setLoading(false); return }
      const d = await res.json() as PortalData
      setData(d)
      setLoading(false)
    })
  }, [])

  async function handleLogout() {
    const supabase = getClient()
    await supabase.auth.signOut()
    window.location.href = '/portal'
  }

  if (loading) return (
    <div className="min-h-screen bg-[#fafaf7] flex items-center justify-center">
      <div className="text-zinc-400 text-sm">Chargement…</div>
    </div>
  )

  if (error || !data) return (
    <div className="min-h-screen bg-[#fafaf7] flex items-center justify-center flex-col gap-4">
      <p className="text-[#dc2626]">{error ?? 'Erreur inconnue'}</p>
      <a href="/portal" className="text-sm text-[#c8a96e] underline">Retour à la connexion</a>
    </div>
  )

  const token = data.portal_token
  const firstName = data.intern.first_name

  const steps = [
    { label: 'Candidature', done: true },
    { label: 'Entretien', done: ['qualification_done','job_submitted','job_retained','convention_signed','payment_pending','payment_received','visa_in_progress','visa_received','arrival_prep','active','alumni'].includes(data.status) },
    { label: 'Stage trouvé', done: ['job_retained','convention_signed','payment_pending','payment_received','visa_in_progress','visa_received','arrival_prep','active','alumni'].includes(data.status) },
    { label: 'Paiement', done: ['payment_received','visa_in_progress','visa_received','arrival_prep','active','alumni'].includes(data.status) },
    { label: 'Visa', done: ['visa_received','arrival_prep','active','alumni'].includes(data.status) },
    { label: 'Bali !', done: ['active','alumni'].includes(data.status) },
  ]
  const currentStep = steps.filter((s) => s.done).length

  const actions = [
    { label: 'Mon billet avion', href: `/portal/${token}/billet`, done: !!data.billet_avion },
    { label: 'Lettre d\'engagement', href: `/portal/${token}/engagement`, done: !!data.engagement_letter_sent },
    { label: 'Logement & scooter', href: `/portal/${token}/logement`, done: false },
    { label: 'Offres de stage', href: `/portal/${token}/jobs`, done: false },
    { label: 'Mes documents (CV)', href: `/portal/${token}/documents`, done: !!data.intern.cv_url },
    { label: 'Programme parrainage', href: `/portal/${token}/affiliation`, done: false },
  ]

  if (data.payment_date) {
    actions.push({ label: 'Ma facture', href: `/portal/${token}/facture`, done: true })
  }
  if (data.intern.intern_card_generated_at || data.intern_card_generated_at) {
    actions.push({ label: 'Ma carte stagiaire', href: `/portal/${token}/carte`, done: true })
  }

  return (
    <div className="min-h-screen bg-[#fafaf7]">
      {/* Header */}
      <header className="bg-[#111110] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[#c8a96e] text-xl">🌴</span>
          <span className="text-white font-semibold">Bali Interns</span>
        </div>
        <button onClick={() => void handleLogout()} className="text-white/40 hover:text-white text-sm transition-colors">
          Déconnexion
        </button>
      </header>

      <main className="max-w-xl mx-auto px-4 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#1a1918]">Bonjour {firstName} ! 👋</h1>
          <p className="text-zinc-500 text-sm mt-1">Voici l'état de ton dossier Bali Interns.</p>
        </div>

        {/* Progress */}
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            {steps.map((s, i) => (
              <div key={s.label} className="flex flex-col items-center flex-1">
                <div className={[
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mb-1',
                  s.done ? 'bg-[#c8a96e] text-white' : 'bg-zinc-100 text-zinc-400',
                ].join(' ')}>
                  {s.done ? '✓' : i + 1}
                </div>
                <span className={['text-[9px] text-center leading-tight', s.done ? 'text-[#c8a96e]' : 'text-zinc-300'].join(' ')}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>
          <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#c8a96e] transition-all duration-700"
              style={{ width: `${(currentStep / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* CV revision alert */}
        {data.intern.cv_revision_requested && (
          <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
            <span className="text-amber-500 text-lg">⚠</span>
            <div>
              <p className="text-amber-800 font-medium text-sm">Charly vous demande de déposer une nouvelle version de votre CV</p>
              <Link href={`/portal/${token}/documents`} className="text-[#c8a96e] text-xs underline mt-1 inline-block">
                Mettre à jour mon CV →
              </Link>
            </div>
          </div>
        )}

        {/* Actions */}
        <h2 className="text-sm font-semibold text-[#1a1918] mb-3">Actions & informations</h2>
        <div className="space-y-2">
          {actions.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="flex items-center justify-between px-4 py-3.5 bg-white rounded-xl border border-zinc-100 hover:border-zinc-200 transition-all"
            >
              <span className="text-sm font-medium text-[#1a1918]">{a.label}</span>
              <span className={['text-xs font-semibold', a.done ? 'text-[#0d9e75]' : 'text-[#c8a96e]'].join(' ')}>
                {a.done ? '✓ Fait' : 'À compléter →'}
              </span>
            </Link>
          ))}
        </div>

        <p className="text-center text-zinc-400 text-xs mt-8">
          Questions ? <a href="mailto:team@bali-interns.com" className="text-[#c8a96e]">team@bali-interns.com</a>
        </p>
      </main>
    </div>
  )
}
