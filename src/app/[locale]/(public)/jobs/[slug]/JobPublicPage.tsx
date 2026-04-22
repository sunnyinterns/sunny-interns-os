'use client'
import { useState, useRef } from 'react'

interface Job {
  id: string; title: string; public_title: string | null
  description: string | null; public_description: string | null
  public_hook: string | null; public_vibe: string | null
  public_perks: string[] | null; public_hashtags: string[] | null
  seo_slug: string | null; cover_image_url: string | null
  background_image_url?: string | null
  cv_drop_enabled: boolean | null; is_public: boolean | null
  status: string; location: string | null; wished_duration_months: number | null
  wished_start_date: string | null; department: string | null
  missions: string[] | null; skills_required: string[] | null
  required_level: string | null; required_languages: string[] | null
}

export default function JobPublicPage({ job }: { job: Job }) {
  const [cvFile, setCvFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploaded, setUploaded] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const title = job.public_title ?? job.title
  const isStaffed = job.status === 'staffed' || job.status === 'cancelled' || job.status === 'closed'
  const isOpen   = !isStaffed
  const duration = job.wished_duration_months ? `${job.wished_duration_months} months` : null
  const perks    = job.public_perks?.filter(Boolean) ?? []
  const missions = job.missions?.filter(Boolean) ?? []
  const skills   = job.skills_required?.filter(Boolean) ?? []
  const heroImg  = job.background_image_url ?? job.cover_image_url

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
    <>
      {/* Google Fonts — same as bali-interns.com */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;900&family=Playfair+Display:ital,wght@0,700;0,900;1,700;1,900&display=swap" rel="stylesheet" />

      <div style={{ fontFamily: "'Outfit', system-ui, sans-serif" }} className="min-h-screen bg-[#FFFBF0]">

        {/* ── Top strip — same as website ── */}
        <div className="bg-[#1a1918] text-white/70 text-[11px] font-medium">
          <div className="max-w-5xl mx-auto px-6 py-2.5 flex items-center justify-center gap-8">
            <span className="flex items-center gap-1.5"><span className="text-[#F5A623]">✓</span> No placement = no fee</span>
            <span className="hidden sm:flex items-center gap-1.5"><span>🛂</span> C22 visa guaranteed</span>
            <span className="hidden md:flex items-center gap-1.5"><span>🏛</span> Certified agency since 2019</span>
          </div>
        </div>

        {/* ── Navbar ── */}
        <nav className="bg-[#FFFBF0] border-b border-[#1a1918]/10 sticky top-0 z-40">
          <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
            <a href="https://bali-interns.com" className="flex items-center gap-2">
              {/* Text logo — matches bali-interns.com branding */}
              <div style={{ fontFamily: "'Outfit', sans-serif" }} className="font-black text-[#1a1918] text-lg tracking-tight">
                BALI INTERNS
              </div>
            </a>
            <div className="flex items-center gap-3">
              <span className="hidden sm:block text-xs text-zinc-500">3–8 month internships in Bali</span>
              <a href="/apply" style={{ background: '#F5A623', fontFamily: "'Outfit', sans-serif" }}
                className="px-4 py-2 rounded-full text-sm font-black text-[#1a1918] hover:brightness-105 transition-all">
                Apply free →
              </a>
            </div>
          </div>
        </nav>


        {/* ── Hero — dark with background image, large Playfair title ── */}
        <div className="relative overflow-hidden bg-[#1a1918]" style={{ minHeight: 480 }}>
          {heroImg && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={heroImg} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40"
              style={{ objectPosition: 'center 30%' }} />
          )}
          {/* Gradient overlay — darker at bottom like the website */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-[#1a1918]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#1a1918]/60 to-transparent" />

          <div className="relative max-w-5xl mx-auto px-6 pt-14 pb-20">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-[11px] text-white/40 mb-10 font-medium tracking-wide uppercase">
              <a href="https://bali-interns.com" className="hover:text-white/60 transition-colors">Bali Interns</a>
              <span>·</span>
              <a href="https://bali-interns.com/stages" className="hover:text-white/60 transition-colors">Internships in Bali</a>
              <span>·</span>
              <span className="text-white/50">{title}</span>
            </div>

            {/* Status badge */}
            {isStaffed ? (
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-600/50 backdrop-blur text-zinc-300 text-xs font-bold mb-5 uppercase tracking-widest">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 block" />
                Position filled
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-5 uppercase tracking-widest text-xs font-bold"
                style={{ background: '#F5A62325', color: '#F5A623', border: '1px solid #F5A62340' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-[#F5A623] block animate-pulse" />
                Open position
              </div>
            )}

            {/* Department label */}
            {job.department && (
              <p className="text-[#F5A623] text-sm font-bold uppercase tracking-widest mb-3">
                {job.department}
              </p>
            )}

            {/* Main title — Playfair Display like website hero */}
            <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              className="text-5xl md:text-6xl font-black text-white leading-[1.05] mb-4 max-w-2xl">
              {title}
            </h1>

            {/* Hook — italic gold, signature style of the website */}
            {job.public_hook && (
              <p style={{ fontFamily: "'Playfair Display', Georgia, serif", color: '#F5A623' }}
                className="text-2xl italic font-bold mb-8 max-w-xl leading-snug">
                {job.public_hook}
              </p>
            )}

            {/* Meta pills */}
            <div className="flex flex-wrap gap-2.5 mt-6">
              {job.location && (
                <span className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur text-white/90 text-sm font-medium">
                  📍 {job.location}
                </span>
              )}
              {duration && (
                <span className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur text-white/90 text-sm font-medium">
                  ⏱ {duration}
                </span>
              )}
              {job.required_level && (
                <span className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur text-white/90 text-sm font-medium">
                  🎓 {job.required_level}
                </span>
              )}
              {job.required_languages?.includes('fr') && (
                <span className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur text-white/90 text-sm font-medium">
                  🇫🇷 French required
                </span>
              )}
            </div>
          </div>
        </div>


        {/* ── Body ── */}
        <div className="max-w-5xl mx-auto px-6 py-14">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

            {/* LEFT — main content */}
            <div className="lg:col-span-2 space-y-10">

              {/* Vibe card */}
              {job.public_vibe && (
                <div className="rounded-2xl p-6 border" style={{ background: '#FFF8EC', borderColor: '#F5A62330' }}>
                  <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: '#F5A623' }}>
                    🌴 The vibe
                  </p>
                  <p className="text-[#1a1918] leading-relaxed font-medium">{job.public_vibe}</p>
                </div>
              )}

              {/* Description */}
              {(job.public_description ?? job.description) && (
                <div>
                  <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                    className="text-2xl font-black text-[#1a1918] mb-4">
                    About this position
                  </h2>
                  <p className="text-zinc-600 leading-relaxed whitespace-pre-wrap text-[15px]">
                    {job.public_description ?? job.description}
                  </p>
                </div>
              )}

              {/* Missions */}
              {missions.length > 0 && (
                <div>
                  <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                    className="text-2xl font-black text-[#1a1918] mb-5">
                    Your missions
                  </h2>
                  <ul className="space-y-3">
                    {missions.map((m, i) => (
                      <li key={i} className="flex items-start gap-3 text-zinc-700 text-[15px]">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#F5A623' }} />
                        {m}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Skills */}
              {skills.length > 0 && (
                <div>
                  <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                    className="text-2xl font-black text-[#1a1918] mb-4">
                    Skills we&apos;re looking for
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {skills.map((s, i) => (
                      <span key={i} className="px-3.5 py-1.5 bg-white border border-zinc-200 text-zinc-700 rounded-full text-sm font-semibold">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Hashtags */}
              {(job.public_hashtags?.filter(Boolean).length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {job.public_hashtags!.filter(Boolean).map((h, i) => (
                    <span key={i} className="text-sm font-semibold" style={{ color: '#F5A623' }}>
                      {h.startsWith('#') ? h : `#${h}`}
                    </span>
                  ))}
                </div>
              )}
            </div>


            {/* RIGHT — sticky CTA sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-20 space-y-4">

                {/* Perks */}
                {perks.length > 0 && (
                  <div className="bg-white rounded-2xl border border-zinc-100 p-6">
                    <p className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-4">What&apos;s included</p>
                    <ul className="space-y-2.5">
                      {perks.map((perk, i) => (
                        <li key={i} className="flex items-center gap-2.5 text-sm text-zinc-700 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#F5A623' }} />
                          {perk}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* CTA card */}
                <div className="bg-[#1a1918] rounded-2xl p-7 text-center">
                  {isStaffed ? (
                    <>
                      <p className="text-3xl mb-3">🤙</p>
                      <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                        className="text-xl font-black text-white mb-2">Position filled</h3>
                      <p className="text-white/50 text-sm mb-5">Other opportunities are waiting for you!</p>
                      <a href="/apply" className="block w-full py-3.5 rounded-xl font-black text-sm text-[#1a1918] text-center transition-all hover:brightness-105"
                        style={{ background: '#F5A623' }}>
                        See all positions →
                      </a>
                    </>
                  ) : job.cv_drop_enabled ? (
                    <>
                      <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                        className="text-xl font-black text-white mb-2">
                        {uploaded ? '✅ Application received!' : 'Apply now'}
                      </h3>
                      <p className="text-white/50 text-sm mb-5">
                        {uploaded ? 'Redirecting to your full application…' : 'Drop your CV to get started.'}
                      </p>
                      {!uploaded && (
                        <div
                          onDrop={onDrop}
                          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                          onDragLeave={() => setDragOver(false)}
                          onClick={() => fileRef.current?.click()}
                          className={`border-2 border-dashed rounded-xl p-6 cursor-pointer transition-all mb-4 ${
                            dragOver ? 'border-[#F5A623] bg-white/10' : 'border-white/20 hover:border-[#F5A623]'
                          }`}>
                          <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={onFileChange} />
                          <p className="text-2xl mb-1">📄</p>
                          <p className="text-white/70 text-xs font-semibold">
                            {uploading ? 'Uploading…' : cvFile ? cvFile.name : 'Drag your CV or click to select'}
                          </p>
                          <p className="text-white/30 text-[10px] mt-1">PDF, DOC · max 10MB</p>
                        </div>
                      )}
                      <a href={`/apply?prefill_job=${job.id}`}
                        className="block w-full py-3.5 rounded-xl font-black text-sm text-[#1a1918] text-center transition-all hover:brightness-105"
                        style={{ background: '#F5A623' }}>
                        Apply for free →
                      </a>
                    </>
                  ) : (
                    <>
                      <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                        className="text-xl font-black text-white mb-2">Interested?</h3>
                      <p className="text-white/50 text-sm mb-5">Apply in 3 minutes — free.</p>
                      <a href={`/apply?prefill_job=${job.id}`}
                        className="block w-full py-3.5 rounded-xl font-black text-sm text-[#1a1918] text-center transition-all hover:brightness-105"
                        style={{ background: '#F5A623' }}>
                        Apply for free →
                      </a>
                    </>
                  )}
                  <p className="text-white/20 text-[10px] mt-4 font-medium">No placement = no fee · C22 visa guaranteed</p>
                </div>

                {/* Trust signals */}
                <div className="bg-white rounded-2xl border border-zinc-100 p-5">
                  <p className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-3">Why Bali Interns?</p>
                  <ul className="space-y-2 text-xs text-zinc-600 font-medium">
                    <li className="flex items-center gap-2"><span style={{ color: '#F5A623' }}>✓</span> 370+ students placed since 2019</li>
                    <li className="flex items-center gap-2"><span style={{ color: '#F5A623' }}>✓</span> C22 internship visa included</li>
                    <li className="flex items-center gap-2"><span style={{ color: '#F5A623' }}>✓</span> Housing & local support</li>
                    <li className="flex items-center gap-2"><span style={{ color: '#F5A623' }}>✓</span> No fee if no placement</li>
                  </ul>
                </div>

              </div>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <footer className="bg-[#1a1918] mt-16">
          <div className="max-w-5xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div style={{ fontFamily: "'Outfit', sans-serif" }} className="font-black text-white text-lg">BALI INTERNS</div>
            <p className="text-white/30 text-xs font-medium text-center">
              Bali · Indonesia · Since 2019 · team@bali-interns.com
            </p>
            <a href="https://bali-interns.com" className="text-[#F5A623] text-xs font-semibold hover:text-white transition-colors">
              bali-interns.com →
            </a>
          </div>
        </footer>

      </div>
    </>
  )
}

