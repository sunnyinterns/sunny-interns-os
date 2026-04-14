'use client'

import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { JOB_TEMPLATES } from '@/lib/job-templates'

export default function TemplatesPage() {
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'fr'
  const router = useRouter()

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-sm text-zinc-500 hover:text-zinc-700">← Paramètres</button>
      </div>
      <h1 className="text-xl font-bold text-[#1a1918]">📄 Templates</h1>

      {/* Templates de jobs */}
      <div>
        <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Templates de jobs</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {JOB_TEMPLATES.map(t => (
            <div key={t.id} className="bg-white border border-zinc-100 rounded-2xl p-4 hover:border-[#c8a96e] transition-all">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{t.icon}</span>
                <p className="text-sm font-bold text-[#1a1918]">{t.label}</p>
              </div>
              <div className="space-y-0.5 mb-3">
                {t.missions.map((m, i) => (
                  <p key={i} className="text-xs text-zinc-500">→ {m}</p>
                ))}
              </div>
              <div className="flex flex-wrap gap-1 mb-3">
                {t.tools.slice(0, 4).map(tool => (
                  <span key={tool} className="text-[10px] bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-full">{tool}</span>
                ))}
                {t.tools.length > 4 && <span className="text-[10px] text-zinc-400">+{t.tools.length - 4}</span>}
              </div>
              <button
                onClick={() => router.push(`/${locale}/jobs?template=${t.id}`)}
                className="w-full py-2 text-xs font-bold bg-[#c8a96e] text-white rounded-xl hover:bg-[#b8945a]"
              >
                Créer une offre avec ce template →
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Templates emails */}
      <div>
        <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Templates d&apos;emails</h2>
        <div className="space-y-2">
          {[
            { key: 'lead_confirmation', label: '📩 Confirmation de candidature', trigger: 'Automatique à la soumission /apply' },
            { key: 'rdv_confirmation', label: '📅 Confirmation RDV', trigger: 'Automatique après booking Fillout' },
            { key: 'qualification_validated', label: '✅ Qualification validée', trigger: 'Manuel depuis le Débrief Staffing' },
            { key: 'qualification_rejected', label: '❌ Qualification refusée', trigger: 'Manuel depuis le Débrief Staffing' },
            { key: 'job_sent_employer', label: '💼 Candidature envoyée employeur', trigger: 'Manuel depuis Staffing' },
            { key: 'payment_request', label: '💶 Demande de paiement', trigger: 'Depuis fiche client' },
            { key: 'visa_docs_request', label: '🛂 Documents visa requis', trigger: 'Depuis fiche client' },
          ].map(email => (
            <div key={email.key} className="bg-white border border-zinc-100 rounded-xl p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#1a1918]">{email.label}</p>
                <p className="text-xs text-zinc-400 mt-0.5">{email.trigger}</p>
              </div>
              <Link
                href={`/${locale}/settings/email-templates?key=${email.key}`}
                className="text-xs px-3 py-1.5 bg-zinc-100 text-zinc-600 rounded-lg hover:bg-zinc-200"
              >
                Modifier →
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Templates contrats (legacy editor) */}
      <div>
        <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Templates de contrats</h2>
        <Link
          href={`/${locale}/settings/templates/contracts`}
          className="block bg-white border border-zinc-100 rounded-xl p-4 hover:border-[#c8a96e] transition-all"
        >
          <p className="text-sm font-medium text-[#1a1918]">📑 Factures, lettres d&apos;engagement, partenariats</p>
          <p className="text-xs text-zinc-400 mt-0.5">Éditeur HTML avec variables {'{{intern_name}}'}, génération PDF</p>
        </Link>
      </div>
    </div>
  )
}
