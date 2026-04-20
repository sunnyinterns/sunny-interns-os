'use client'
import { useState } from 'react'
import Link from 'next/link'

interface Job {
  id: string
  public_title: string | null
  title: string
  status: string
  location: string | null
  wished_duration_months: number | null
  wished_start_date: string | null
  public_description: string | null
  description: string | null
  public_hook: string | null
  public_vibe: string | null
  public_perks: string[] | null
  public_hashtags: string[] | null
  seo_slug: string | null
  cv_drop_enabled: boolean
  cover_image_url: string | null
  is_public: boolean
  missions: string[] | null
  required_languages: string[] | null
  required_level: string | null
  profile_sought: string | null
  remote_ok: boolean
  companies: { id: string; name: string; logo_url: string | null; company_type: string | null } | null
}

const LANG_LABELS: Record<string, string> = {
  french: 'Français', english: 'Anglais', spanish: 'Espagnol',
  german: 'Allemand', italian: 'Italien', dutch: 'Néerlandais',
}

const LEVEL_LABELS: Record<string, string> = {
  bac: 'Bac', bac2: 'Bac+2', bac3: 'Bac+3', bac4: 'Bac+4', bac5: 'Bac+5',
}

export default function JobPublicPage({ job }: { job: Job }) {
  const [cvForm, setCvForm] = useState({ first_name: '', last_name: '', email: '', phone: '', school: '', message: '' })
  const [cvSubmitting, setCvSubmitting] = useState(false)
  const [cvDone, setCvDone] = useState(false)
  const [cvError, setCvError] = useState('')

  const isStaffed = job.status === 'staffed'
  const title = job.public_title ?? job.title
  const company = job.companies?.name ?? ''

  async function submitCV(e: React.FormEvent) {
    e.preventDefault()
    if (!cvForm.email) return
    setCvSubmitting(true); setCvError('')
    try {
      const res = await fetch('/api/cv-drops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: job.id, ...cvForm }),
      })
      const d = await res.json() as { success?: boolean; redirect?: string; error?: string }
      if (d.success) {
        setCvDone(true)
        setTimeout(() => { if (d.redirect) window.location.href = d.redirect }, 1500)
      } else {
        setCvError(d.error ?? 'Erreur')
      }
    } catch { setCvError('Erreur réseau') }
    setCvSubmitting(false)
  }

  return (
    <div className="min-h-screen bg-[#faf9f7]" style={{ fontFamily: "'Sora', 'DM Sans', sans-serif" }}>
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-zinc-100">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="https://bali-interns.com" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#F5A623] flex items-center justify-center text-white text-xs font-black">B</div>
            <span className="text-sm font-bold text-[#1a1918]">Bali Interns</span>
          </Link>
          <Link href="/apply" className="px-4 py-1.5 text-sm font-bold bg-[#1a1918] text-[#F5A623] rounded-xl hover:bg-zinc-800 transition-colors">
            Postuler →
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10">
        {/* Hero */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          <div className="flex flex-col justify-center">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1 text-xs text-zinc-400 mb-4">
              <Link href="https://bali-interns.com" className="hover:text-zinc-600">Bali Interns</Link>
              <span>›</span>
              <Link href="/jobs" className="hover:text-zinc-600">Stages à Bali</Link>
              <span>›</span>
              <span className="text-zinc-600 truncate max-w-32">{title}</span>
            </div>

            {/* Status badge */}
            {isStaffed ? (
              <div className="inline-flex w-fit items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 mb-4">
                ✅ Poste pourvu
              </div>
            ) : (
              <div className="inline-flex w-fit items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 mb-4">
                🟢 Offre ouverte
              </div>
            )}

            {/* Title */}
            <h1 className="text-3xl sm:text-4xl font-black text-[#1a1918] leading-tight mb-2">
              {title}
            </h1>
            {company && (
              <p className="text-lg text-zinc-500 font-medium mb-4">@ {company}</p>
            )}

            {/* Hook */}
            {job.public_hook && (
              <p className="text-base font-semibold text-[#F5A623] mb-5 italic">
                &ldquo;{job.public_hook}&rdquo;
              </p>
            )}

            {/* Meta chips */}
            <div className="flex flex-wrap gap-2 mb-6">
              {job.location && (
                <span className="px-3 py-1 bg-zinc-100 text-zinc-600 rounded-full text-sm">📍 {job.location}</span>
              )}
              {job.wished_duration_months && (
                <span className="px-3 py-1 bg-zinc-100 text-zinc-600 rounded-full text-sm">⏱ {job.wished_duration_months} mois</span>
              )}
              {job.wished_start_date && (
                <span className="px-3 py-1 bg-zinc-100 text-zinc-600 rounded-full text-sm">
                  📅 Début {new Date(job.wished_start_date).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                </span>
              )}
              {job.remote_ok && (
                <span className="px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-sm">💻 Remote possible</span>
              )}
              {job.required_level && (
                <span className="px-3 py-1 bg-zinc-100 text-zinc-600 rounded-full text-sm">🎓 {LEVEL_LABELS[job.required_level] ?? job.required_level}</span>
              )}
            </div>

            {!isStaffed && (
              <a href="#postuler" className="inline-flex w-fit items-center gap-2 px-6 py-3 bg-[#F5A623] text-[#1a1918] font-bold rounded-2xl hover:bg-[#e8930a] transition-colors text-sm shadow-lg shadow-amber-200">
                Postuler maintenant →
              </a>
            )}
          </div>

          {/* Cover image */}
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-amber-100 to-orange-200 aspect-[4/3]">
            {job.cover_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={job.cover_image_url} alt={title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center text-amber-600">
                  <div className="text-6xl mb-3">🌴</div>
                  <p className="font-bold text-lg">{company || 'Bali'}</p>
                  <p className="text-sm opacity-70">Bali, Indonésie</p>
                </div>
              </div>
            )}
            {/* Overlay badge */}
            <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur rounded-xl px-3 py-2">
              <p className="text-xs text-zinc-500">Stage proposé par</p>
              <p className="text-sm font-bold text-[#1a1918]">{company || 'Bali Interns'}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Description */}
            {(job.public_description ?? job.description) && (
              <section>
                <h2 className="text-lg font-black text-[#1a1918] mb-3">🎯 Le poste</h2>
                <div className="text-zinc-600 leading-relaxed whitespace-pre-wrap text-sm">
                  {job.public_description ?? job.description}
                </div>
              </section>
            )}

            {/* Missions */}
            {job.missions && job.missions.filter(Boolean).length > 0 && (
              <section>
                <h2 className="text-lg font-black text-[#1a1918] mb-3">📋 Tes missions</h2>
                <ul className="space-y-2">
                  {job.missions.filter(Boolean).map((m, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-zinc-600">
                      <span className="w-5 h-5 rounded-full bg-[#F5A623]/20 text-[#F5A623] flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{i+1}</span>
                      {m}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Profil */}
            {job.profile_sought && (
              <section>
                <h2 className="text-lg font-black text-[#1a1918] mb-3">👤 Profil recherché</h2>
                <p className="text-sm text-zinc-600 leading-relaxed">{job.profile_sought}</p>
              </section>
            )}

            {/* Vibe */}
            {job.public_vibe && (
              <section className="bg-amber-50 rounded-2xl p-5 border border-amber-100">
                <h2 className="text-sm font-black text-[#F5A623] uppercase tracking-wider mb-2">🌴 L&apos;ambiance</h2>
                <p className="text-sm text-zinc-700 italic">&ldquo;{job.public_vibe}&rdquo;</p>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Perks */}
            {job.public_perks && job.public_perks.filter(Boolean).length > 0 && (
              <div className="bg-white rounded-2xl p-5 border border-zinc-100 shadow-sm">
                <h3 className="text-sm font-black text-[#1a1918] mb-3">✨ Avantages</h3>
                <ul className="space-y-2">
                  {job.public_perks.filter(Boolean).map((p, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-zinc-600">
                      <span className="text-[#F5A623]">→</span> {p}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Langues */}
            {job.required_languages && job.required_languages.length > 0 && (
              <div className="bg-white rounded-2xl p-5 border border-zinc-100 shadow-sm">
                <h3 className="text-sm font-black text-[#1a1918] mb-3">🗣 Langues requises</h3>
                <div className="flex flex-wrap gap-2">
                  {job.required_languages.map((l, i) => (
                    <span key={i} className="px-2 py-1 bg-zinc-100 text-zinc-600 rounded-lg text-xs">
                      {LANG_LABELS[l] ?? l}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Hashtags */}
            {job.public_hashtags && job.public_hashtags.filter(Boolean).length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {job.public_hashtags.filter(Boolean).map((h, i) => (
                  <span key={i} className="text-xs text-[#F5A623] font-medium">
                    {h.startsWith('#') ? h : `#${h}`}
                  </span>
                ))}
              </div>
            )}

            {/* CTA sidebar */}
            {!isStaffed && (
              <div className="bg-[#1a1918] rounded-2xl p-5 text-center">
                <p className="text-white font-bold mb-1 text-sm">Intéressé(e) ?</p>
                <p className="text-zinc-400 text-xs mb-4">Postulez via Bali Interns — on s&apos;occupe de tout</p>
                <a href="#postuler" className="block w-full py-2.5 bg-[#F5A623] text-[#1a1918] font-bold rounded-xl text-sm hover:bg-[#e8930a] transition-colors">
                  Postuler →
                </a>
              </div>
            )}
          </div>
        </div>

        {/* CV Drop section */}
        {job.cv_drop_enabled && !isStaffed && (
          <section id="postuler" className="mt-16 bg-white rounded-3xl p-8 border border-zinc-100 shadow-sm">
            <h2 className="text-2xl font-black text-[#1a1918] mb-1">📄 Dépose ton CV</h2>
            <p className="text-sm text-zinc-400 mb-6">On te recontacte sous 24h. Ensuite on t&apos;oriente vers le formulaire complet.</p>

            {cvDone ? (
              <div className="text-center py-8">
                <div className="text-5xl mb-3">🎉</div>
                <p className="text-lg font-bold text-[#1a1918]">CV reçu !</p>
                <p className="text-sm text-zinc-400 mt-1">Redirection vers le formulaire complet…</p>
              </div>
            ) : (
              <form onSubmit={e => void submitCV(e)} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 mb-1">Prénom</label>
                    <input className="w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F5A623]"
                      value={cvForm.first_name} onChange={e => setCvForm(p => ({ ...p, first_name: e.target.value }))} placeholder="Marie" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 mb-1">Nom</label>
                    <input className="w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F5A623]"
                      value={cvForm.last_name} onChange={e => setCvForm(p => ({ ...p, last_name: e.target.value }))} placeholder="Dupont" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 mb-1">Email *</label>
                    <input required type="email" className="w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F5A623]"
                      value={cvForm.email} onChange={e => setCvForm(p => ({ ...p, email: e.target.value }))} placeholder="marie@gmail.com" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 mb-1">Téléphone / WhatsApp</label>
                    <input className="w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F5A623]"
                      value={cvForm.phone} onChange={e => setCvForm(p => ({ ...p, phone: e.target.value }))} placeholder="+33 6 …" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Ton école / université</label>
                  <input className="w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F5A623]"
                    value={cvForm.school} onChange={e => setCvForm(p => ({ ...p, school: e.target.value }))} placeholder="KEDGE Business School, Paris…" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Message (optionnel)</label>
                  <textarea className="w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F5A623] resize-none"
                    rows={3} value={cvForm.message} onChange={e => setCvForm(p => ({ ...p, message: e.target.value }))}
                    placeholder="Pourquoi ce stage t'intéresse ?" />
                </div>
                {cvError && <p className="text-sm text-red-500">{cvError}</p>}
                <button type="submit" disabled={cvSubmitting || !cvForm.email}
                  className="w-full py-3 bg-[#F5A623] text-[#1a1918] font-bold rounded-2xl hover:bg-[#e8930a] disabled:opacity-50 transition-colors text-sm">
                  {cvSubmitting ? 'Envoi…' : '📄 Envoyer et continuer →'}
                </button>
                <p className="text-xs text-zinc-400 text-center">
                  En continuant, vous serez redirigé vers le formulaire complet de candidature Bali Interns.
                </p>
              </form>
            )}
          </section>
        )}

        {/* Footer minimal */}
        <footer className="mt-16 pt-8 border-t border-zinc-100 text-center">
          <p className="text-sm text-zinc-400">
            Stage géré par{' '}
            <Link href="https://bali-interns.com" className="text-[#F5A623] font-semibold hover:underline">
              Bali Interns
            </Link>
            {' '}— Agence de stages à Bali, Indonésie
          </p>
        </footer>
      </main>
    </div>
  )
}
