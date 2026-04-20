'use client'
import { useState, useRef } from 'react'
import Link from 'next/link'

interface Job {
  id: string; title: string; public_title: string | null
  description: string | null; public_description: string | null
  public_hook: string | null; public_vibe: string | null
  public_perks: string[] | null; public_hashtags: string[] | null
  seo_slug: string | null; cover_image_url: string | null
  cv_drop_enabled: boolean | null; is_public: boolean | null
  status: string; location: string | null; wished_duration_months: number | null
  wished_start_date: string | null; department: string | null
  missions: string[] | null; skills_required: string[] | null
  required_level: string | null; required_languages: string[] | null
  companies?: { id: string; name: string; logo_url: string | null } | null
}

export default function JobPublicPage({ job }: { job: Job }) {
  const [cvFile, setCvFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploaded, setUploaded] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const title = job.public_title ?? job.title
  const company = job.companies?.name ?? ''
  const isStaffed = job.status === 'staffed'
  const duration = job.wished_duration_months ? `${job.wished_duration_months} mois` : null
  const perks = job.public_perks?.filter(Boolean) ?? []
  const missions = job.missions?.filter(Boolean) ?? []
  const skills = job.skills_required?.filter(Boolean) ?? []

  async function handleCvUpload(file: File) {
    setUploading(true)
    const fd = new FormData()
    fd.append('cv', file)
    fd.append('job_id', job.id)
    await fetch('/api/public/cv-drop', { method: 'POST', body: fd })
    setUploaded(true)
    setUploading(false)
    setTimeout(() => {
      window.location.href = `/apply?prefill_job=${job.id}&source=cv_drop`
    }, 1500)
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) { setCvFile(f); void handleCvUpload(f) }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f) { setCvFile(f); void handleCvUpload(f) }
  }

  return (
    <div className="min-h-screen bg-[#f9f7f4]">
      {/* Hero */}
      <div className="relative overflow-hidden bg-[#1a1918]" style={{ minHeight: 420 }}>
        {job.cover_image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={job.cover_image_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#1a1918]" />
        <div className="relative max-w-3xl mx-auto px-6 pt-12 pb-16">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-white/40 mb-8">
            <a href="https://bali-interns.com" className="hover:text-white/70">Bali Interns</a>
            <span>/</span>
            <a href="https://bali-interns.com/stages" className="hover:text-white/70">Stages à Bali</a>
            <span>/</span>
            <span className="text-white/60">{title}</span>
          </div>

          {/* Status badge */}
          {isStaffed && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-600/60 text-zinc-300 text-xs font-semibold mb-4">
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
              Poste pourvu
            </div>
          )}
          {!isStaffed && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-4" style={{ background: '#F5A62330' }}>
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#F5A623' }} />
              <span className="text-xs font-semibold" style={{ color: '#F5A623' }}>Offre ouverte</span>
            </div>
          )}

          {/* Title */}
          <h1 className="text-4xl font-black text-white leading-tight mb-3">{title}</h1>
          {company && <p className="text-lg text-white/60 font-medium mb-6">@ {company}</p>}

          {/* Hook */}
          {job.public_hook && (
            <p className="text-xl font-semibold italic mb-8" style={{ color: '#F5A623' }}>
              &ldquo;{job.public_hook}&rdquo;
            </p>
          )}

          {/* Meta chips */}
          <div className="flex flex-wrap gap-3">
            {job.location && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 text-white/80 text-sm">
                📍 {job.location}
              </span>
            )}
            {duration && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 text-white/80 text-sm">
                ⏱ {duration}
              </span>
            )}
            {job.department && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 text-white/80 text-sm">
                💼 {job.department}
              </span>
            )}
            {job.required_level && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 text-white/80 text-sm">
                🎓 {job.required_level}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-3xl mx-auto px-6 py-10 space-y-10">
        {/* Vibe */}
        {job.public_vibe && (
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6">
            <p className="text-sm font-bold text-amber-700 uppercase tracking-wider mb-2">🌴 L&apos;ambiance</p>
            <p className="text-zinc-700 leading-relaxed">{job.public_vibe}</p>
          </div>
        )}

        {/* Perks */}
        {perks.length > 0 && (
          <div>
            <h2 className="text-lg font-black text-[#1a1918] mb-4">✨ Ce qu&apos;on t&apos;offre</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {perks.map((perk, i) => (
                <div key={i} className="flex items-center gap-3 bg-white border border-zinc-100 rounded-xl p-4">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#F5A623' }} />
                  <span className="text-sm text-zinc-700 font-medium">{perk}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        {(job.public_description ?? job.description) && (
          <div>
            <h2 className="text-lg font-black text-[#1a1918] mb-4">📋 Le poste</h2>
            <p className="text-zinc-600 leading-relaxed whitespace-pre-wrap">
              {job.public_description ?? job.description}
            </p>
          </div>
        )}

        {/* Missions */}
        {missions.length > 0 && (
          <div>
            <h2 className="text-lg font-black text-[#1a1918] mb-4">🎯 Tes missions</h2>
            <ul className="space-y-2">
              {missions.map((m, i) => (
                <li key={i} className="flex items-start gap-3 text-zinc-600">
                  <span className="mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#F5A623' }} />
                  {m}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Skills */}
        {skills.length > 0 && (
          <div>
            <h2 className="text-lg font-black text-[#1a1918] mb-4">🛠 Compétences recherchées</h2>
            <div className="flex flex-wrap gap-2">
              {skills.map((s, i) => (
                <span key={i} className="px-3 py-1 bg-zinc-100 text-zinc-700 rounded-full text-sm font-medium">{s}</span>
              ))}
            </div>
          </div>
        )}

        {/* CTA / CV Drop */}
        <div className="bg-white border border-zinc-100 rounded-2xl p-8 text-center">
          {isStaffed ? (
            <div>
              <p className="text-4xl mb-3">🤙</p>
              <h3 className="text-xl font-black text-[#1a1918] mb-2">Ce poste est pourvu</h3>
              <p className="text-zinc-500 text-sm mb-6">Mais d&apos;autres offres t&apos;attendent !</p>
              <a href="https://bali-interns.com/candidater"
                className="inline-block px-6 py-3 rounded-xl font-bold text-sm text-white"
                style={{ background: '#F5A623' }}>
                Voir toutes les offres →
              </a>
            </div>
          ) : job.cv_drop_enabled ? (
            <div>
              <h3 className="text-xl font-black text-[#1a1918] mb-2">
                {uploaded ? '✅ CV reçu !' : 'Postule maintenant'}
              </h3>
              <p className="text-zinc-500 text-sm mb-6">
                {uploaded
                  ? 'Redirection vers le formulaire complet…'
                  : 'Dépose ton CV pour commencer — tu complèteras ton dossier ensuite.'}
              </p>
              {!uploaded && (
                <div
                  onDrop={onDrop}
                  onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onClick={() => fileRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 cursor-pointer transition-all mb-6 ${
                    dragOver ? 'border-[#F5A623] bg-amber-50' : 'border-zinc-200 hover:border-[#F5A623] hover:bg-amber-50/30'
                  }`}>
                  <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={onFileChange} />
                  <div className="text-3xl mb-2">📄</div>
                  <p className="text-sm font-semibold text-zinc-600">
                    {uploading ? 'Upload en cours…' : cvFile ? cvFile.name : 'Glisse ton CV ici ou clique pour sélectionner'}
                  </p>
                  <p className="text-xs text-zinc-400 mt-1">PDF, DOC, DOCX · max 10MB</p>
                </div>
              )}
              <a href={`/apply?prefill_job=${job.id}`}
                className="inline-block px-6 py-3 rounded-xl font-bold text-sm text-[#1a1918] border-2 border-zinc-200 hover:border-[#F5A623] transition-colors">
                Postuler sans CV →
              </a>
            </div>
          ) : (
            <div>
              <h3 className="text-xl font-black text-[#1a1918] mb-2">Intéressé(e) ?</h3>
              <p className="text-zinc-500 text-sm mb-6">Postule en 3 minutes sur Bali Interns.</p>
              <a href={`/apply?prefill_job=${job.id}`}
                className="inline-block px-8 py-4 rounded-xl font-black text-sm text-[#1a1918] transition-all hover:scale-105"
                style={{ background: '#F5A623' }}>
                Je postule →
              </a>
            </div>
          )}
        </div>

        {/* Hashtags */}
        {job.public_hashtags && job.public_hashtags.filter(Boolean).length > 0 && (
          <div className="flex flex-wrap gap-2">
            {job.public_hashtags.filter(Boolean).map((h, i) => (
              <span key={i} className="text-sm text-[#F5A623] font-medium">
                {h.startsWith('#') ? h : `#${h}`}
              </span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-zinc-100 pt-8 flex items-center justify-between text-xs text-zinc-400">
          <span>© Bali Interns — Stage à Bali</span>
          <a href="https://bali-interns.com" className="hover:text-zinc-600">bali-interns.com</a>
        </div>
      </div>
    </div>
  )
}
