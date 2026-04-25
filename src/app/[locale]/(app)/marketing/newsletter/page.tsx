'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Subscriber {
  id: string
  email: string
  source: string
  created_at: string
  status: string
  locale?: string
}


// Newsletter automation backlog
const NEWSLETTER_PLAN = [
  {
    seq: 1, trigger: "signup",
    subject_fr: "Bienvenue chez Bali Interns 🌴",
    subject_en: "Welcome to Bali Interns 🌴",
    delay: "Immédiat",
    content: "Guide de bienvenue — comment ça marche, les 3 étapes, les ressources",
    status: "backlog",
  },
  {
    seq: 2, trigger: "J+3",
    subject_fr: "Le visa C22 expliqué en 5 minutes",
    subject_en: "C22 visa explained in 5 minutes",
    delay: "J+3",
    content: "Guide visa C22 — conditions, délai, documents requis, FAQ",
    status: "backlog",
  },
  {
    seq: 3, trigger: "J+7",
    subject_fr: "Combien ça coûte vraiment de partir à Bali ?",
    subject_en: "What does a Bali internship really cost?",
    delay: "J+7",
    content: "Simulateur budget — logement, scooter, nourriture, activités",
    status: "backlog",
  },
  {
    seq: 4, trigger: "J+14",
    subject_fr: "Témoignage : Marine, stagiaire marketing à Uluwatu",
    subject_en: "Story: Ashley, communication intern in Seminyak",
    delay: "J+14",
    content: "Success story + CTA candidature",
    status: "backlog",
  },
  {
    seq: 5, trigger: "J+21",
    subject_fr: "Offres de stage du mois — places limitées",
    subject_en: "This month's internship openings — limited spots",
    delay: "J+21",
    content: "3 offres en cours depuis l'OS + CTA urgence",
    status: "backlog",
  },
  {
    seq: 6, trigger: "mensuel",
    subject_fr: "Newsletter mensuelle Bali Interns",
    subject_en: "Bali Interns monthly newsletter",
    delay: "Mensuel",
    content: "Nouvelles offres + article blog + actus île",
    status: "backlog",
  },
]

export default function NewsletterPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('newsletter_subscribers')
        .select('*')
        .order('created_at', { ascending: false })
      setSubscribers((data as Subscriber[]) ?? [])
      setLoading(false)
    }
    void load()
  }, [supabase])

  const filtered = subscribers.filter(s =>
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    s.source?.includes(search)
  )

  const stats = {
    total: subscribers.length,
    thisMonth: subscribers.filter(s => new Date(s.created_at) > new Date(Date.now() - 30*24*60*60*1000)).length,
    sources: [...new Set(subscribers.map(s => s.source))].filter(Boolean),
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Automation Plan */}
      <div className="bg-white border border-zinc-100 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-[#1a1918]">📋 Plan Newsletter Automatisé — Backlog</h2>
          <span className="text-[10px] px-2 py-0.5 bg-zinc-100 text-zinc-500 rounded-full font-bold uppercase tracking-wider">Non actif — en attente Resend</span>
        </div>
        <div className="space-y-2">
          {NEWSLETTER_PLAN.map(seq => (
            <div key={seq.seq} className="flex items-start gap-4 p-3 bg-zinc-50 rounded-xl border border-zinc-100">
              <span className="w-7 h-7 rounded-full bg-[#FFCC00] text-black text-xs font-black flex items-center justify-center shrink-0">{seq.seq}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-[#1a1918]">{seq.subject_fr}</span>
                  <span className="text-[10px] text-zinc-400">·</span>
                  <span className="text-[10px] text-zinc-400 italic">{seq.subject_en}</span>
                  <span className="ml-auto text-[10px] px-2 py-0.5 bg-zinc-200 text-zinc-600 rounded-full font-bold">{seq.delay}</span>
                </div>
                <p className="text-[11px] text-zinc-500 mt-0.5">{seq.content}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-zinc-400 mt-4">
          → Configurer Resend dans Settings pour activer l&apos;envoi automatique
        </p>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1918]">Newsletter</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Gestion des abonnés — envoi automatisé à venir</p>
        </div>
        <div className="flex gap-2">
          <div className="px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl text-center">
            <p className="text-2xl font-black text-amber-700">{stats.total}</p>
            <p className="text-[10px] text-amber-600 uppercase tracking-wider font-bold">Total</p>
          </div>
          <div className="px-4 py-2 bg-green-50 border border-green-200 rounded-xl text-center">
            <p className="text-2xl font-black text-green-700">+{stats.thisMonth}</p>
            <p className="text-[10px] text-green-600 uppercase tracking-wider font-bold">Ce mois</p>
          </div>
        </div>
      </div>

      {/* Plan backlog */}
      <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-5">
        <h2 className="text-sm font-bold text-[#1a1918] mb-3">📋 Plan Newsletter Automatisé — Backlog</h2>
        <div className="space-y-2">
          {[
            { s: 'P0', label: 'Configurer Resend API (RESEND_API_KEY dans Vercel env)', done: false },
            { s: 'P0', label: 'Email de bienvenue automatique après inscription', done: false },
            { s: 'P1', label: 'Newsletter mensuelle automatique — top articles blog du mois', done: false },
            { s: 'P1', label: 'Sequence onboarding (J+3: guide visa, J+7: guide logement, J+14: offres de stage)', done: false },
            { s: 'P2', label: 'Segmentation par langue (FR/EN/ES) depuis locale', done: false },
            { s: 'P2', label: 'Newsletter "Nouvelles offres de stage" — hebdomadaire', done: false },
            { s: 'P3', label: 'Désabonnement one-click + RGPD compliance', done: false },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 ${item.s === 'P0' ? 'bg-red-100 text-red-700' : item.s === 'P1' ? 'bg-orange-100 text-orange-700' : 'bg-zinc-100 text-zinc-500'}`}>{item.s}</span>
              <p className="text-xs text-zinc-700">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Rechercher un email ou une source…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
      />

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-zinc-400 text-sm">Chargement…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-zinc-400 text-sm">
          {subscribers.length === 0 ? 'Aucun abonné pour l\'instant — la section newsletter est cachée sur le site.' : 'Aucun résultat'}
        </div>
      ) : (
        <div className="border border-zinc-200 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Email</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Source</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => (
                <tr key={s.id} className={i % 2 === 0 ? 'bg-white' : 'bg-zinc-50/50'}>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-700">{s.email}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-full">{s.source || 'direct'}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-400">{new Date(s.created_at).toLocaleDateString('fr-FR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
