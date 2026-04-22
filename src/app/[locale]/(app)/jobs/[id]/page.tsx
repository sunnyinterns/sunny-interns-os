'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { SearchableSelect, type SearchableSelectItem } from '@/components/ui/SearchableSelect'
import { useAIAssist } from '@/hooks/useAIAssist'

function daysUntil(date: string | null | undefined): number {
  if (!date) return 999
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86400000)
}

interface RelatedJob { id: string; title: string; wished_start_date: string | null; status: string }

interface Contact {
  id: string
  first_name: string
  last_name: string | null
  job_title: string | null
  email: string | null
  whatsapp: string | null
}

interface JobSubmission {
  id: string
  status: string
  cv_sent?: boolean | null
  intern_interested?: boolean | null
  created_at?: string | null
  cases?: {
    id: string
    interns?: { first_name: string; last_name: string } | null
  } | null
}

interface JobDepartment {
  id: string
  name: string
  slug: string | null
  categories: string[] | null
}

interface JobDetail {
  id: string
  title?: string | null
  public_title?: string | null
  job_private_name?: string | null
  description?: string | null
  public_description?: string | null
  department?: string | null
  missions?: string[] | null
  status?: string | null
  location?: string | null
  remote_ok?: boolean | null
  remote_work?: string | null
  required_languages?: string[] | null
  required_level?: string | null
  wished_start_date?: string | null
  wished_end_date?: string | null
  wished_duration_months?: number | null
  is_recurring?: boolean | null
  notes_internal?: string | null
  is_active?: boolean | null
  job_department_id?: string | null
  max_candidates?: number | null
  compensation_type?: string | null
  compensation_amount?: number | null
  skills_required?: string[] | null
  profile_sought?: string | null
  actual_end_date?: string | null
  company_type?: string | null
  tools_required?: string[] | null
  parent_job_id?: string | null
  created_at?: string | null
  updated_at?: string | null
  public_hook?: string | null
  public_vibe?: string | null
  public_perks?: string[] | null
  public_hashtags?: string[] | null
  seo_slug?: string | null
  cv_drop_enabled?: boolean | null
  cover_image_url?: string | null
  background_image_url?: string | null
  background_image_prompt?: string | null
  job_card_image_url?: string | null
  is_public?: boolean | null
  companies?: {
    id: string
    name: string
    contact_name?: string | null
    contact_email?: string | null
    contact_whatsapp?: string | null
    whatsapp_number?: string | null
    industry?: string | null
    location?: string | null
    description?: string | null
    website?: string | null
    logo_url?: string | null
  } | null
  contacts?: Contact | null
  job_departments?: JobDepartment | null
  job_submissions?: JobSubmission[]
}

interface QualifiedCase {
  id: string
  interns?: { first_name: string; last_name: string } | null
  status: string
}

type Platform = 'instagram' | 'linkedin' | 'tiktok' | 'facebook'
type Lang = 'fr' | 'en'
type TabKey = 'infos' | 'publication' | 'background' | 'job-card' | 'video' | 'captions' | 'candidatures' | 'activite'

interface SocialPost {
  id: string; platform: Platform; lang: Lang; tone: string | null
  content: string; hashtags: string[]; image_url: string | null; status: string
  created_at: string
}

interface ActivityItem {
  id: string; type: string; title: string
  description: string | null; created_at: string; source: string
}

const STATUS_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  open: { bg: '#d1fae5', color: '#065f46', label: 'Cherche stagiaire' },
  staffed: { bg: '#dbeafe', color: '#1e40af', label: 'Staffed' },
  cancelled: { bg: '#f3f4f6', color: '#374151', label: 'Cancelled' },
}

const SUB_STATUS: Record<string, { bg: string; color: string; label: string }> = {
  proposed: { bg: '#f3f4f6', color: '#374151', label: 'Proposé' },
  sent: { bg: '#fef3c7', color: '#92400e', label: 'CV envoyé' },
  submitted: { bg: '#fef3c7', color: '#92400e', label: 'Soumis' },
  interview: { bg: '#dbeafe', color: '#1e40af', label: 'Entretien' },
  retained: { bg: '#d1fae5', color: '#065f46', label: 'Retenu' },
  rejected: { bg: '#fee2e2', color: '#991b1b', label: 'Refusé' },
  cancelled: { bg: '#f3f4f6', color: '#6b7280', label: 'Cancelled' },
}

const PD: Record<Platform, { label: string; icon: string; color: string; ratio: string; desc: string }> = {
  instagram: { label: 'Instagram', icon: '📸', color: '#E1306C', ratio: '1:1',  desc: '1080×1080 · carré' },
  linkedin:  { label: 'LinkedIn',  icon: '💼', color: '#0077B5', ratio: '16:9', desc: '1200×627 · paysage' },
  tiktok:    { label: 'TikTok',    icon: '🎵', color: '#333',    ratio: '9:16', desc: '1080×1920 · portrait' },
  facebook:  { label: 'Facebook',  icon: '👥', color: '#1877F2', ratio: '1:1',  desc: '1080×1080 · carré' },
}

/** Auto-generate background image prompt from job data — NEVER mentions the employer company name */
function buildBackgroundPrompt(job: JobDetail): string {
  const dept = job.department ?? 'professional'
  const location = job.location ?? 'Bali, Indonesia'
  const vibe = job.public_vibe ? `Atmosphere: ${job.public_vibe}.` : ''
  const deptStyles: Record<string, string> = {
    'marketing-communication': 'creative agency workspace, mood boards, vibrant tropical office, young team collaborating',
    'design-graphisme':        'design studio with large screens, mood boards, creative tools, sunlit tropical space',
    'tech-dev':                'modern coworking space, laptops and dual screens, focused developer, open air tropical office',
    'business-dev-sales':      'professional meeting, handshake, confident young executive, tropical city backdrop',
    'finance-comptabilite':    'clean minimal office, financial charts, focused professional, bright tropical light',
    'operations':              'hospitality setting, hotel lobby or beachfront resort, warm welcoming atmosphere',
    'default':                 'young professional working in a tropical coworking space, golden hour light',
  }
  const style = deptStyles[dept] ?? deptStyles['default']
  return `Editorial lifestyle photograph for a ${dept} internship in ${location}. ${vibe}Scene: ${style}. Color palette: warm gold and sunset orange tones. Cinematic quality, photorealistic. NO text, NO logos, NO watermarks, NO faces visible.`
}

function imagePromptFor(job: JobDetail, platform: Platform | 'cover'): string {
  // Use saved prompt if available, otherwise auto-generate
  if (job.background_image_prompt) return job.background_image_prompt
  return buildBackgroundPrompt(job)
}

/** Caption/post prompt — NEVER mentions employer company name (confidential) */
function textPromptFor(job: JobDetail, platform: Platform, tone: string, lang: Lang): string {
  const title = job.public_title ?? job.title ?? ''
  // ⚠️ RULE: Never mention company name in public posts — commercial confidentiality
  const duration = job.wished_duration_months ? `${job.wished_duration_months} months` : 'several months'
  const hook = job.public_hook ? `\nHOOK: "${job.public_hook}"` : ''
  const vibe = job.public_vibe ? `\nVibe: ${job.public_vibe}` : ''
  const perks = job.public_perks?.filter(Boolean).length ? `\nPerks: ${job.public_perks!.filter(Boolean).join(', ')}` : ''
  const tags = job.public_hashtags?.filter(Boolean).length
    ? `\nHashtags: ${job.public_hashtags!.filter(Boolean).map(h => h.startsWith('#') ? h : '#'+h).join(' ')}`
    : ''
  const fmt = platform === 'instagram' ? 'Hook + storytelling + emojis + 8-12 hashtags. Max 2200 chars.'
            : platform === 'linkedin'  ? 'Professional tone + career value + 3-5 hashtags. Max 700 chars.'
            : platform === 'tiktok'    ? 'First line = hook (max 10 words) + max 150 words + trending hashtags'
            : 'Friendly + clear CTA + 3-5 hashtags. Max 500 chars.'
  const langLabel = lang === 'fr' ? 'French' : 'English'
  return `You are a social media manager for Bali Interns, an internship agency placing French students in Bali.
Write a ${platform} post in ${langLabel} for this internship: ${title} — ${duration} — ${job.location ?? 'Bali, Indonesia'}
${job.public_description?.slice(0, 150) ?? ''}${hook}${vibe}${perks}${tags}
TONE: ${tone} | FORMAT: ${fmt} | CTA: "Apply → sunny-interns-os.vercel.app"
⚠️ IMPORTANT RULES:
- NEVER mention the employer company name (confidential commercial info)
- Say "a partner company" or "our partner" if you need to reference the employer
- Always position Bali Interns as the exclusive placement agency
- Output ONLY the post content, no explanation.`
}

export default function JobDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = typeof params?.id === 'string' ? params.id : ''
  const locale = typeof params?.locale === 'string' ? params.locale : 'fr'

  // If id is not a UUID (e.g. a slug), redirect to the public job page
  // This handles the case where next-intl redirects /jobs/slug → /fr/jobs/slug
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (id && !UUID_RE.test(id)) {
    router.replace(`/jobs/${id}`)
    return null
  }

  const [job, setJob] = useState<JobDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [editing, setEditing] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<TabKey>('infos')
  const [qualifiedCases, setQualifiedCases] = useState<QualifiedCase[]>([])
  const [selectedCaseId, setSelectedCaseId] = useState('')
  const [addingCandidate, setAddingCandidate] = useState(false)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [allDepartments, setAllDepartments] = useState<JobDepartment[]>([])
  const [relatedJobs, setRelatedJobs] = useState<RelatedJob[]>([])
  const { assist, isLoading } = useAIAssist()
  const generatingAllRef = useRef(false)
  const [aiError, setAiError] = useState<string | null>(null)

  // ── Media (cover + 4 réseaux) ──
  const [generatingCover, setGeneratingCover] = useState(false)
  const [generatingImg, setGeneratingImg] = useState<Platform | null>(null)
  const [mediaError, setMediaError] = useState<string | null>(null)
  const [platformImages, setPlatformImages] = useState<Partial<Record<Platform, string>>>({})
  const [bgPrompt, setBgPrompt] = useState<string>('')
  const [bgPromptDirty, setBgPromptDirty] = useState(false)

  // ── Posts ──
  const [activePlatform, setActivePlatform] = useState<Platform>('instagram')
  const [tone, setTone] = useState('Enthousiaste')
  const [lang, setLang] = useState<Lang>('fr')
  const [postsByPlatform, setPostsByPlatform] = useState<Partial<Record<Platform, SocialPost>>>({})
  const [generatingPost, setGeneratingPost] = useState<Platform | null>(null)
  const [editingPost, setEditingPost] = useState<Platform | null>(null)
  const [editContent, setEditContent] = useState('')
  const [copiedPost, setCopiedPost] = useState<Platform | null>(null)
  const [savedPosts, setSavedPosts] = useState<Platform[]>([])

  // ── Activité ──
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [activityLoading, setActivityLoading] = useState(false)

  function showToast(msg: string) {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 3000)
  }

  async function load() {
    if (!id) return
    try {
      const res = await fetch(`/api/jobs/${id}`)
      if (res.ok) {
        const data = await res.json() as JobDetail
        setJob(data)
      } else {
        setError(true)
      }
    } catch {
      setError(true)
    }
    setLoading(false)
  }

  useEffect(() => { void load() }, [id])

  useEffect(() => {
    if (!job) return
    const parentId = job.parent_job_id ?? (job.is_recurring ? job.id : null)
    if (!parentId) { setRelatedJobs([]); return }
    fetch(`/api/jobs?parent_id=${parentId}`)
      .then(r => r.ok ? r.json() as Promise<RelatedJob[]> : [])
      .then(d => setRelatedJobs(Array.isArray(d) ? d.filter(j => j.id !== job.id) : []))
      .catch(() => setRelatedJobs([]))
  }, [job])

  useEffect(() => {
    fetch('/api/cases?status=qualification_done')
      .then(r => r.ok ? r.json() as Promise<QualifiedCase[]> : [])
      .then(d => setQualifiedCases(Array.isArray(d) ? d : []))
      .catch(() => null)
    fetch('/api/job-departments')
      .then(r => r.ok ? r.json() as Promise<JobDepartment[]> : [])
      .then(d => setAllDepartments(Array.isArray(d) ? d : []))
      .catch(() => null)
  }, [])

  // Charge posts existants quand on ouvre l'onglet captions
  useEffect(() => {
    if (activeTab !== 'captions' || !id) return
    fetch(`/api/content/posts?job_id=${id}`)
      .then(r => r.ok ? r.json() as Promise<SocialPost[]> : [])
      .then(d => {
        const byP: Partial<Record<Platform, SocialPost>> = {}
        ;(Array.isArray(d) ? d : []).forEach(p => { byP[p.platform] = p })
        setPostsByPlatform(byP)
      })
      .catch(() => null)
  }, [activeTab, id])

  // Charge activité
  useEffect(() => {
    if (activeTab !== 'activite' || !id) return
    setActivityLoading(true)
    fetch(`/api/jobs/${id}/activity`)
      .then(r => r.ok ? r.json() as Promise<ActivityItem[]> : [])
      .then(d => setActivity(Array.isArray(d) ? d : []))
      .catch(() => setActivity([]))
      .finally(() => setActivityLoading(false))
  }, [activeTab, id])

  async function patchJob(patch: Record<string, unknown>) {
    if (!job) return
    setSaving(true)
    setJob(prev => prev ? { ...prev, ...patch } as typeof prev : prev)
    const res = await fetch(`/api/jobs/${job.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (res.ok) { setEditing({}); showToast('Sauvegardé ✓') }
    else { void load(); showToast('Erreur lors de la sauvegarde') }
    setSaving(false)
  }

  async function addCandidate() {
    if (!selectedCaseId || !job) return
    setAddingCandidate(true)
    const res = await fetch('/api/job-submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ case_id: selectedCaseId, job_id: job.id }),
    })
    if (res.ok) { void load(); setSelectedCaseId(''); showToast('Candidat ajouté') }
    else showToast("Erreur lors de l'ajout")
    setAddingCandidate(false)
  }

  async function updateSubmission(subId: string, status: string) {
    const res = await fetch(`/api/job-submissions/${subId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) { void load(); showToast(status === 'retained' ? 'Candidat retenu !' : 'Status mis à jour') }
  }

  // ── Image generation ──
  const generateCover = useCallback(async () => {
    if (!job) return
    setMediaError(null); setGeneratingCover(true)
    try {
      const res = await fetch('/api/content/generate-image', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: imagePromptFor(job, 'cover'), job_id: job.id, platform: 'cover' }),
      })
      const d = await res.json() as { image_url?: string; error?: string }
      if (!res.ok || !d.image_url) {
        setMediaError(d.error ?? 'Erreur génération cover')
        return
      }
      void patchJob({ cover_image_url: d.image_url })
    } catch (err) {
      setMediaError(err instanceof Error ? err.message : 'Erreur réseau')
    } finally {
      setGeneratingCover(false)
    }
  }, [job]) // eslint-disable-line react-hooks/exhaustive-deps

  const generatePlatformImg = useCallback(async (platform: Platform) => {
    if (!job) return
    setMediaError(null); setGeneratingImg(platform)
    try {
      const res = await fetch('/api/content/generate-image', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: imagePromptFor(job, platform), job_id: job.id, platform }),
      })
      const d = await res.json() as { image_url?: string; error?: string }
      if (!res.ok || !d.image_url) {
        setMediaError(d.error ?? `Erreur génération ${platform}`)
        return
      }
      setPlatformImages(prev => ({ ...prev, [platform]: d.image_url }))
    } catch (err) {
      setMediaError(err instanceof Error ? err.message : 'Erreur réseau')
    } finally {
      setGeneratingImg(null)
    }
  }, [job])

  // ── Post generation ──
  const generatePost = useCallback(async (platform: Platform) => {
    if (!job) return
    setGeneratingPost(platform)
    try {
      const res = await fetch('/api/ai-assist', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'raw_prompt', prompt: textPromptFor(job, platform, tone, lang) }),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({})) as { error?: string }
        setAiError(e.error ?? 'Erreur génération post')
        return
      }
      const data = await res.json() as { result: string }
      const raw = data.result ?? ''
      const hashtags = raw.match(/#[\w\u00C0-\u017F]+/g) ?? []
      const content = raw.replace(/#[\w\u00C0-\u017F]+/g, '').trim()
      const post: SocialPost = {
        id: `${Date.now()}-${platform}`, platform, lang, tone, content, hashtags,
        image_url: platformImages[platform] ?? null, status: 'draft', created_at: new Date().toISOString(),
      }
      setPostsByPlatform(prev => ({ ...prev, [platform]: post }))
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Erreur réseau')
    } finally {
      setGeneratingPost(null)
    }
  }, [job, tone, lang, platformImages])

  const savePost = useCallback(async (platform: Platform) => {
    const post = postsByPlatform[platform]
    if (!job || !post) return
    await fetch('/api/content/posts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...post, job_id: job.id }),
    })
    setSavedPosts(prev => [...prev, platform])
  }, [postsByPlatform, job])

  function copy(text: string, platform: Platform) {
    void navigator.clipboard.writeText(text)
    setCopiedPost(platform)
    setTimeout(() => setCopiedPost(null), 2000)
  }

  function downloadImage(url: string, name: string) {
    const a = document.createElement('a'); a.href = url; a.download = name; a.target = '_blank'; a.click()
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        {[1, 2, 3].map(i => <div key={i} className="h-20 bg-zinc-100 rounded-xl animate-pulse" />)}
      </div>
    )
  }

  if (error || !job) {
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-4">
        <div className="px-5 py-8 bg-white border border-zinc-100 rounded-xl text-center">
          <p className="text-lg font-semibold text-[#1a1918] mb-1">Job introuvable</p>
          <p className="text-sm text-zinc-400 mb-4">Ce job n&apos;existe pas ou a été supprimé.</p>
          <button
            onClick={() => router.push(`/${locale}/jobs`)}
            className="px-4 py-2 text-sm font-medium bg-[#c8a96e] text-white rounded-lg hover:bg-[#b8945a] transition-colors"
          >
            Retour aux jobs
          </button>
        </div>
      </div>
    )
  }

  const statusBadge = STATUS_BADGE[job.status ?? 'open'] ?? STATUS_BADGE.open
  const displayTitle = job.public_title ?? job.title ?? 'Job sans titre'
  const departmentName = job.job_departments?.name ?? job.department ?? null
  const submissionsCount = (job.job_submissions ?? []).length

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'infos',         label: '📋 Infos' },
    { key: 'publication',   label: '🌐 Publication' },
    { key: 'background',    label: '🎨 Background' },
    { key: 'job-card',      label: '📸 Job Card' },
    { key: 'video',         label: '🎬 Vidéo' },
    { key: 'captions',      label: '✍️ Captions' },
    { key: 'candidatures',  label: `👥 Candidatures${submissionsCount > 0 ? ` (${submissionsCount})` : ''}` },
    { key: 'activite',      label: '📊 Activité' },
  ]

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white bg-[#0d9e75]">
          {toastMsg}
        </div>
      )}

      {/* Back */}
      <button onClick={() => router.push(`/${locale}/jobs`)} className="text-sm text-zinc-500 hover:text-[#1a1918] flex items-center gap-1 transition-colors">
        &larr; Retour aux jobs
      </button>

      {/* ═══ HEADER ═══ */}
      <div className="bg-white border border-zinc-100 rounded-xl p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1">
            {editing.public_title ? (
              <input
                className="text-xl font-bold text-[#1a1918] border border-[#c8a96e] rounded-lg px-2 py-1 w-full focus:outline-none"
                defaultValue={job.public_title ?? job.title ?? ''}
                autoFocus
                onBlur={e => void patchJob({ public_title: e.target.value || null })}
                onKeyDown={e => { if (e.key === 'Enter') void patchJob({ public_title: (e.target as HTMLInputElement).value || null }); if (e.key === 'Escape') setEditing({}) }}
              />
            ) : (
              <h1 className="text-xl font-bold text-[#1a1918] cursor-pointer hover:text-[#c8a96e] transition-colors" onClick={() => setEditing(p => ({ ...p, public_title: true }))}>
                {displayTitle}
              </h1>
            )}
            {job.title && job.title !== displayTitle && (
              <p className="text-xs text-zinc-400 mt-0.5">Internal title : {job.title}</p>
            )}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ background: statusBadge.bg, color: statusBadge.color }}>
                {statusBadge.label}
              </span>
              {editing.job_department_id ? (
                <select
                  className="text-xs px-2 py-0.5 rounded-full border border-[#c8a96e] bg-amber-50 text-[#c8a96e] font-medium focus:outline-none"
                  defaultValue={job.job_department_id ?? ''}
                  autoFocus
                  onChange={e => void patchJob({ job_department_id: e.target.value || null })}
                  onBlur={() => setEditing({})}
                >
                  <option value="">— Aucun —</option>
                  {allDepartments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              ) : (
                <button onClick={() => setEditing(p => ({ ...p, job_department_id: true }))} className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-[#c8a96e] font-medium hover:bg-amber-100 transition-colors">
                  {departmentName ?? 'Définir métier'}
                </button>
              )}
              {job.companies?.industry && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600">{job.companies.industry}</span>
              )}
              {(job.remote_ok || job.remote_work) && (
                <span className="text-xs px-2 py-0.5 rounded bg-violet-100 text-violet-700 font-medium">Remote</span>
              )}
              {job.is_active === false && (
                <span className="text-xs px-2 py-0.5 rounded bg-red-50 text-[#dc2626] font-medium">Inactif</span>
              )}
            </div>
          </div>
          {job.companies?.name && (
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-[#c8a96e]/15 flex items-center justify-center text-sm font-bold text-[#c8a96e] flex-shrink-0 overflow-hidden">
                {job.companies.logo_url
                  /* eslint-disable-next-line @next/next/no-img-element */
                  ? <img src={job.companies.logo_url} alt="" className="w-10 h-10 rounded-xl object-cover" />
                  : job.companies.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <button
                  onClick={() => router.push(`/${locale}/companies/${job.companies!.id}`)}
                  className="text-sm font-medium text-[#1a1918] hover:text-[#c8a96e] transition-colors text-left"
                >
                  {job.companies.name}
                </button>
                {job.companies.location && <p className="text-xs text-zinc-400">{job.companies.location}</p>}
              </div>
            </div>
          )}
        </div>

        {/* Barre publication (header) */}
        <div className="flex items-center gap-3 pt-3 mt-2 border-t border-zinc-100 flex-wrap">
          <label className="relative inline-flex items-center cursor-pointer gap-2">
            <input type="checkbox" checked={!!job.is_public}
              onChange={e => void patchJob({ is_public: e.target.checked })}
              className="sr-only peer" />
            <div className="w-9 h-5 bg-zinc-200 peer-checked:bg-[#0d9e75] rounded-full transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4" />
            <span className={`text-xs font-semibold ${job.is_public ? 'text-[#0d9e75]' : 'text-zinc-400'}`}>
              {job.is_public ? '🟢 Published' : '⚪ Draft'}
            </span>
          </label>

          {job.is_public && job.seo_slug ? (
            <a href={`https://sunny-interns-os.vercel.app/jobs/${job.seo_slug}`} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-[#c8a96e] hover:underline font-medium">
              🌐 sunny-interns-os.vercel.app/jobs/{job.seo_slug} ↗
            </a>
          ) : job.is_public && !job.seo_slug ? (
            <button onClick={() => setActiveTab('publication')}
              className="text-xs text-amber-600 hover:underline">
              ⚠️ Slug manquant — définir dans Publication
            </button>
          ) : job.seo_slug ? (
            <span className="text-xs text-zinc-300 font-mono">/jobs/{job.seo_slug}</span>
          ) : (
            <button onClick={() => setActiveTab('publication')}
              className="text-xs text-zinc-400 hover:text-zinc-600">
              + Définir un slug pour publier
            </button>
          )}
        </div>

        {/* Grille infos */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-sm">
          <div>
            <p className="text-xs text-zinc-400 mb-1">Duration</p>
            {editing.wished_duration_months ? (
              <select
                className="px-2 py-1 text-sm border border-[#c8a96e] rounded-lg focus:outline-none"
                defaultValue={job.wished_duration_months ?? ''}
                autoFocus
                onChange={e => void patchJob({ wished_duration_months: Number(e.target.value) || null })}
                onBlur={() => setEditing({})}
              >
                <option value="">—</option>
                {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => <option key={n} value={n}>{n} mois</option>)}
              </select>
            ) : (
              <button onClick={() => setEditing(p => ({ ...p, wished_duration_months: true }))} className="text-sm text-[#1a1918] font-medium hover:text-[#c8a96e] transition-colors">
                {job.wished_duration_months ? `${job.wished_duration_months} mois` : <span className="text-zinc-300 italic text-xs">Définir</span>}
              </button>
            )}
          </div>
          <div>
            <p className="text-xs text-zinc-400 mb-1">Date démarrage</p>
            {editing.wished_start_date ? (
              <input type="date" className="flex-1 px-2 py-1 text-sm border border-[#c8a96e] rounded-lg" defaultValue={job.wished_start_date?.slice(0, 10) ?? ''} onBlur={e => void patchJob({ wished_start_date: e.target.value || null })} autoFocus />
            ) : (
              <button onClick={() => setEditing(p => ({ ...p, wished_start_date: true }))} className="text-sm text-[#1a1918] font-medium hover:text-[#c8a96e] transition-colors">
                {job.wished_start_date ? new Date(job.wished_start_date).toLocaleDateString('fr-FR') : <span className="text-zinc-300 italic text-xs">Définir</span>}
              </button>
            )}
          </div>
          <div>
            <p className="text-xs text-zinc-400 mb-1">Required level</p>
            {editing.required_level ? (
              <select
                className="px-2 py-1 text-sm border border-[#c8a96e] rounded-lg focus:outline-none"
                defaultValue={job.required_level ?? ''}
                autoFocus
                onChange={e => void patchJob({ required_level: e.target.value || null })}
                onBlur={() => setEditing({})}
              >
                <option value="">—</option>
                {['Bac', 'Bac+2', 'Bac+3', 'Bac+4', 'Bac+5'].map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            ) : (
              <button onClick={() => setEditing(p => ({ ...p, required_level: true }))} className="text-sm text-[#1a1918] font-medium hover:text-[#c8a96e] transition-colors">
                {job.required_level ?? <span className="text-zinc-300 italic text-xs">Définir</span>}
              </button>
            )}
          </div>
          <div>
            <p className="text-xs text-zinc-400 mb-1">Langues</p>
            <div className="flex gap-1 flex-wrap">
              {job.required_languages && job.required_languages.length > 0
                ? job.required_languages.map(l => (
                    <span key={l} className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-medium">{l}</span>
                  ))
                : <span className="text-sm text-zinc-300">—</span>
              }
            </div>
          </div>
        </div>

        {/* Status + date fin prévue */}
        <div className="flex gap-2 mt-4 pt-3 border-t border-zinc-50 flex-wrap items-center">
          <select
            value={job.status ?? 'open'}
            onChange={e => void patchJob({ status: e.target.value })}
            disabled={saving}
            className="text-xs px-2 py-1 rounded-lg border border-zinc-200 focus:outline-none focus:border-[#c8a96e]"
          >
            <option value="open">🟢 Cherche stagiaire</option>
            <option value="staffed">🔵 Staffed</option>
            <option value="cancelled">⚫ Cancelled</option>
          </select>
          {job.status === 'staffed' && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400">Fin prévue stagiaire</span>
              <input
                type="date"
                defaultValue={job.actual_end_date ?? ''}
                onBlur={e => void patchJob({ actual_end_date: e.target.value || null })}
                className="text-sm border border-zinc-200 rounded-lg px-2 py-1 focus:outline-none focus:border-[#c8a96e]"
              />
              {job.actual_end_date && daysUntil(job.actual_end_date) <= 60 && daysUntil(job.actual_end_date) >= 0 && (
                <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                  ⏰ J-{daysUntil(job.actual_end_date)} passation
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ═══ TABS (barre identique à cases/[id]) ═══ */}
      <div className="relative z-10 isolate flex gap-0 overflow-x-auto border-b border-zinc-100">
        {tabs.map(t => (
          <button
            type="button"
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`relative px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap -mb-px ${
              activeTab === t.key ? 'border-[#c8a96e] text-[#c8a96e]' : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ═══ CONTENU DES ONGLETS ═══ */}

      {/* ─── ONGLET INFOS ─── */}
      {activeTab === 'infos' && (
        <div className="space-y-5">

          {/* Missions & outils */}
          {((job.missions && job.missions.length > 0) || (job.tools_required && job.tools_required.length > 0)) && (
            <div className="bg-white border border-zinc-100 rounded-xl p-5 space-y-4">
              {job.missions && job.missions.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Missions</p>
                  <ul className="space-y-1">
                    {job.missions.map((m, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-[#1a1918]">
                        <span className="text-[#c8a96e] flex-shrink-0 mt-0.5">→</span>
                        {m}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {job.tools_required && job.tools_required.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Required tools</p>
                  <div className="flex flex-wrap gap-1.5">
                    {job.tools_required.map(t => (
                      <span key={t} className="text-xs bg-zinc-100 text-zinc-600 px-2.5 py-1 rounded-full">{t}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Internal description + profil + notes */}
          <div className="bg-white border border-zinc-100 rounded-xl p-5 space-y-4">
            <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Description</h2>

            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-zinc-400">Internal description</p>
                <button type="button" disabled={isLoading('generate_description') || isLoading('improve_description') || !job.title} onClick={async () => {
                  const r = job.description
                    ? await assist('improve_description', { lang: 'en', text: job.description })
                    : await assist('generate_description', { lang: 'en', title: job.title ?? '', company_name: job.companies?.name ?? '', missions: (job.missions ?? []).join(', '), profile_sought: job.profile_sought ?? '', tools: (job.tools_required ?? []).join(', ') })
                  if (r) void patchJob({ description: r })
                }} className="text-[10px] px-2 py-0.5 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 disabled:opacity-50">{isLoading('generate_description') || isLoading('improve_description') ? '...' : '✨ AI'}</button>
              </div>
              {editing.description ? (
                <textarea
                  className="w-full text-sm text-zinc-600 border border-[#c8a96e] rounded-lg px-3 py-2 focus:outline-none"
                  rows={4}
                  defaultValue={job.description ?? ''}
                  autoFocus
                  onBlur={e => void patchJob({ description: e.target.value || null })}
                  style={{ resize: 'vertical' }}
                />
              ) : (
                <button onClick={() => setEditing(p => ({ ...p, description: true }))} className="text-left w-full text-sm text-zinc-600 hover:text-[#c8a96e] transition-colors whitespace-pre-wrap">
                  {job.description || <span className="text-zinc-300 italic">Cliquer pour ajouter une description...</span>}
                </button>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-zinc-400">Required profile</p>
                <button type="button" disabled={isLoading('generate_profile') || isLoading('improve_profile') || !job.title} onClick={async () => {
                  const r = job.profile_sought
                    ? await assist('improve_profile', { text: job.profile_sought })
                    : await assist('generate_profile', { lang: 'en', title: job.title ?? '', department: departmentName ?? '', required_level: job.required_level ?? '', tools: (job.tools_required ?? []).join(', '), languages: (job.required_languages ?? []).join(', ') })
                  if (r) void patchJob({ profile_sought: r })
                }} className="text-[10px] px-2 py-0.5 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 disabled:opacity-50">{isLoading('generate_profile') || isLoading('improve_profile') ? '...' : '✨ AI'}</button>
              </div>
              {editing.profile_sought ? (
                <textarea
                  className="w-full text-sm text-zinc-600 border border-[#c8a96e] rounded-lg px-3 py-2 focus:outline-none"
                  rows={3}
                  defaultValue={job.profile_sought ?? ''}
                  autoFocus
                  onBlur={e => void patchJob({ profile_sought: e.target.value || null })}
                  style={{ resize: 'vertical' }}
                />
              ) : (
                <button onClick={() => setEditing(p => ({ ...p, profile_sought: true }))} className="text-left w-full text-sm text-zinc-600 hover:text-[#c8a96e] transition-colors whitespace-pre-wrap">
                  {job.profile_sought || <span className="text-zinc-300 italic">Cliquer pour définir le profil recherché...</span>}
                </button>
              )}
            </div>

            <div>
              <p className="text-xs text-zinc-400 mb-1">Notes internes</p>
              {editing.notes_internal ? (
                <textarea
                  className="w-full text-sm text-zinc-500 italic border border-[#c8a96e] rounded-lg px-3 py-2 focus:outline-none"
                  rows={3}
                  defaultValue={job.notes_internal ?? ''}
                  autoFocus
                  onBlur={e => void patchJob({ notes_internal: e.target.value || null })}
                  style={{ resize: 'vertical' }}
                />
              ) : (
                <button onClick={() => setEditing(p => ({ ...p, notes_internal: true }))} className="text-left w-full text-sm text-zinc-500 italic hover:text-[#c8a96e] transition-colors whitespace-pre-wrap">
                  {job.notes_internal || <span className="text-zinc-300 not-italic">Cliquer pour ajouter des notes...</span>}
                </button>
              )}
            </div>
          </div>

          {/* Employer contact */}
          {(job.contacts || job.companies?.contact_email) && (
            <div className="bg-white border border-zinc-100 rounded-xl p-5">
              <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Employer contact</h2>
              {job.contacts ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-[#c8a96e]/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-[#c8a96e] font-bold text-sm">{(job.contacts.first_name?.[0] ?? '?').toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#1a1918]">{job.contacts.first_name} {job.contacts.last_name ?? ''}</p>
                      {job.contacts.job_title && <p className="text-xs text-zinc-400">{job.contacts.job_title}</p>}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {job.contacts.email && <a href={`mailto:${job.contacts.email}`} className="flex items-center gap-2 text-xs text-zinc-600 hover:text-[#c8a96e]"><span className="w-4 text-center text-zinc-400">@</span>{job.contacts.email}</a>}
                    {job.contacts.whatsapp && <a href={`https://wa.me/${job.contacts.whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-zinc-600 hover:text-[#0d9e75]"><span className="w-4 text-center text-zinc-400">WA</span>{job.contacts.whatsapp}</a>}
                  </div>
                  <Link href={`/${locale}/contacts/${job.contacts.id}`} className="text-xs text-[#c8a96e] hover:underline mt-2 block">Voir fiche contact →</Link>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <p className="text-sm font-medium text-[#1a1918]">{job.companies?.contact_name ?? job.companies?.name}</p>
                  {job.companies?.contact_email && <a href={`mailto:${job.companies.contact_email}`} className="flex items-center gap-2 text-xs text-zinc-600 hover:text-[#c8a96e]"><span className="w-4 text-center text-zinc-400">@</span>{job.companies.contact_email}</a>}
                </div>
              )}
            </div>
          )}

          {/* Instances récurrentes */}
          {(job.is_recurring || job.parent_job_id) && relatedJobs.length > 0 && (
            <div className="bg-white border border-zinc-100 rounded-xl p-5">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                {job.is_recurring ? 'Instances liées' : 'Autres instances'}
              </p>
              {relatedJobs.map(r => (
                <Link key={r.id} href={`/${locale}/jobs/${r.id}`} className="flex items-center justify-between py-2 border-b border-zinc-50 hover:text-[#c8a96e] transition-colors">
                  <span className="text-xs">{r.title}</span>
                  <span className="text-xs text-zinc-400">{r.wished_start_date ?? '—'}</span>
                </Link>
              ))}
            </div>
          )}

        </div>
      )}

      {/* ─── ONGLET PUBLICATION ─── */}
      {activeTab === 'publication' && (
        <section className="bg-white border border-zinc-100 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">🌐 Publication</h2>
            <button
              type="button"
              disabled={!job.title || isLoading('generate_public_description') || isLoading('generate_hook') || isLoading('generate_vibe') || isLoading('generate_perks') || isLoading('generate_slug')}
              onClick={async () => {
                if (generatingAllRef.current) return
                generatingAllRef.current = true
                setAiError(null)
                let generated = 0
                const ctx = {
                  title: job.title ?? '', public_title: job.public_title ?? '',
                  company_name: job.companies?.name ?? '', company_type: job.company_type ?? '',
                  missions: (job.missions ?? []).join(','), tools: (job.tools_required ?? []).join(', '),
                  department: departmentName ?? '', duration: job.wished_duration_months ? `${job.wished_duration_months}mois` : '',
                }
                if (!job.public_description) {
                  const r = await assist('generate_public_description', ctx)
                  if (r) { void patchJob({ public_description: r }); generated++ }
                }
                if (!job.public_hook) {
                  const r = await assist('generate_hook', ctx)
                  if (r) { void patchJob({ public_hook: r.slice(0, 100) }); generated++ }
                }
                if (!job.public_vibe) {
                  const r = await assist('generate_vibe', ctx)
                  if (r) { void patchJob({ public_vibe: r }); generated++ }
                }
                if (!(job.public_perks?.filter(Boolean).length)) {
                  const r = await assist('generate_perks', ctx)
                  if (r) { void patchJob({ public_perks: r.split('\n').map((s: string) => s.trim()).filter(Boolean) }); generated++ }
                }
                if (!job.seo_slug) {
                  const r = await assist('generate_slug', ctx)
                  if (r) { void patchJob({ seo_slug: r.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-') }); generated++ }
                }
                if (generated === 0) setAiError('💳 Crédit API épuisé — recharger sur console.anthropic.com ou aistudio.google.com')
                generatingAllRef.current = false
              }}
              className="text-xs px-3 py-1.5 bg-purple-50 text-purple-600 rounded-xl font-semibold hover:bg-purple-100 disabled:opacity-40 transition-all"
            >
              {isLoading('generate_public_description') || isLoading('generate_hook') || isLoading('generate_vibe') || isLoading('generate_perks') || isLoading('generate_slug') ? '⏳ Génération…' : '✨ Generate tout'}
            </button>
          </div>

          {aiError && (
            <div className="px-3 py-2 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 flex items-center justify-between">
              <span>{aiError}</span>
              <button onClick={() => setAiError(null)} className="ml-2 text-red-400 hover:text-red-600">×</button>
            </div>
          )}

          {/* Public description EN */}
          <div>
            <p className="text-xs text-zinc-400 mb-1">Public description <span className="text-amber-600 text-[10px]">🇬🇧 visible candidats</span></p>
            {editing.public_description ? (
              <textarea className="w-full px-3 py-2 text-sm border border-[#c8a96e] rounded-xl focus:outline-none resize-none" autoFocus rows={3}
                defaultValue={job.public_description ?? ''}
                onBlur={e => void patchJob({ public_description: e.target.value || null })}
                onKeyDown={e => { if (e.key === 'Escape') setEditing({}) }} />
            ) : (
              <button onClick={() => setEditing(p => ({ ...p, public_description: true }))} className="text-left w-full text-sm text-zinc-600 hover:text-[#c8a96e] transition-colors">
                {job.public_description || <span className="text-zinc-300 italic">{isLoading('generate_public_description') ? '⏳ Génération...' : 'Cliquer pour ajouter une description publique...'}</span>}
              </button>
            )}
          </div>

          {/* Accroche */}
          <div>
            <p className="text-xs text-zinc-400 mb-1">Accroche (hook) <span className="text-zinc-300">(100 car. max)</span></p>
            {editing.public_hook ? (
              <input className="w-full px-3 py-2 text-sm border border-[#c8a96e] rounded-xl focus:outline-none" autoFocus
                defaultValue={job.public_hook ?? ''} maxLength={100}
                onBlur={e => void patchJob({ public_hook: e.target.value || null })}
                onKeyDown={e => { if (e.key === 'Enter') void patchJob({ public_hook: (e.target as HTMLInputElement).value || null }); if (e.key === 'Escape') setEditing({}) }} />
            ) : (
              <button onClick={() => setEditing(p => ({ ...p, public_hook: true }))} className="text-left w-full text-sm text-zinc-600 hover:text-[#c8a96e] transition-colors italic">
                {job.public_hook || <span className="text-zinc-300 not-italic">{isLoading('generate_hook') ? '⏳ Génération...' : 'Cliquer pour ajouter une accroche...'}</span>}
              </button>
            )}
          </div>

          {/* Ambiance / vibe */}
          <div>
            <p className="text-xs text-zinc-400 mb-1">Ambiance / vibe</p>
            {editing.public_vibe ? (
              <input className="w-full px-3 py-2 text-sm border border-[#c8a96e] rounded-xl focus:outline-none" autoFocus
                defaultValue={job.public_vibe ?? ''}
                onBlur={e => void patchJob({ public_vibe: e.target.value || null })}
                onKeyDown={e => { if (e.key === 'Enter') void patchJob({ public_vibe: (e.target as HTMLInputElement).value || null }); if (e.key === 'Escape') setEditing({}) }} />
            ) : (
              <button onClick={() => setEditing(p => ({ ...p, public_vibe: true }))} className="text-left w-full text-sm text-zinc-600 hover:text-[#c8a96e] transition-colors italic">
                {job.public_vibe || <span className="text-zinc-300 not-italic">{isLoading('generate_vibe') ? '⏳ Génération...' : 'Cliquer pour décrire l\'ambiance...'}</span>}
              </button>
            )}
          </div>

          {/* Avantages */}
          <div>
            <p className="text-xs text-zinc-400 mb-1">Avantages (perks) <span className="text-zinc-300">(un par ligne)</span></p>
            {editing.public_perks ? (
              <textarea className="w-full px-3 py-2 text-sm border border-[#c8a96e] rounded-xl focus:outline-none resize-none" autoFocus rows={3}
                defaultValue={(job.public_perks ?? []).join('\n')}
                onBlur={e => void patchJob({ public_perks: e.target.value.split('\n').map(s => s.trim()).filter(Boolean) })} />
            ) : (
              <button onClick={() => setEditing(p => ({ ...p, public_perks: true }))} className="text-left w-full text-sm text-zinc-600 hover:text-[#c8a96e] transition-colors">
                {job.public_perks?.filter(Boolean).length ? (
                  <div className="flex flex-wrap gap-1">{job.public_perks.filter(Boolean).map((p, i) => <span key={i} className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">✨ {p}</span>)}</div>
                ) : <span className="text-zinc-300 italic text-sm">{isLoading('generate_perks') ? '⏳ Génération...' : 'Cliquer pour ajouter des avantages...'}</span>}
              </button>
            )}
          </div>

          {/* Slug SEO */}
          <div>
            <p className="text-xs text-zinc-400 mb-1">Slug SEO <span className="text-zinc-300">(ex: social-media-manager-bali)</span></p>
            {editing.seo_slug ? (
              <input className="w-full px-3 py-2 text-sm border border-[#c8a96e] rounded-xl focus:outline-none font-mono" autoFocus
                defaultValue={job.seo_slug ?? ''}
                onBlur={e => void patchJob({ seo_slug: e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || null })}
                onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setEditing({}) }} />
            ) : (
              <button onClick={() => setEditing(p => ({ ...p, seo_slug: true }))} className="text-left text-sm font-mono text-zinc-600 hover:text-[#c8a96e] transition-colors">
                {job.seo_slug || <span className="text-zinc-300 font-sans">{isLoading('generate_slug') ? '⏳ Génération...' : 'Cliquer pour définir le slug...'}</span>}
              </button>
            )}
          </div>

          {/* is_public toggle */}
          <div className="flex items-center justify-between pt-3 border-t border-zinc-100">
            <div>
              <p className="text-sm font-medium text-[#1a1918]">Page publique activée</p>
              <p className="text-xs text-zinc-400">Page visible on sunny-interns-os.vercel.app</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={!!job.is_public} onChange={e => void patchJob({ is_public: e.target.checked })} className="sr-only peer" />
              <div className="w-9 h-5 bg-zinc-200 peer-checked:bg-[#c8a96e] rounded-full transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4" />
            </label>
          </div>

          {/* CV Drop */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#1a1918]">CV Drop activé</p>
              <p className="text-xs text-zinc-400">Les candidats peuvent déposer leur CV directement</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={!!job.cv_drop_enabled} onChange={e => void patchJob({ cv_drop_enabled: e.target.checked })} className="sr-only peer" />
              <div className="w-9 h-5 bg-zinc-200 peer-checked:bg-[#c8a96e] rounded-full transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4" />
            </label>
          </div>
        </section>
      )}

      {/* ─── ONGLET MEDIA ─── */}
      {/* ─── ONGLET BACKGROUND IMAGE ─── */}
      {activeTab === 'background' && (
        <div className="space-y-5">
          {mediaError && (
            <div className="px-3 py-2 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 flex items-center justify-between">
              <span>{mediaError}</span>
              <button onClick={() => setMediaError(null)} className="ml-2 text-red-400 hover:text-red-600">×</button>
            </div>
          )}

          {/* Prompt éditable — auto-généré, modifiable */}
          <div className="bg-white rounded-xl border border-zinc-100 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">🎨 Background Image Prompt</h3>
                <p className="text-[10px] text-zinc-400 mt-0.5">Auto-generated from job data — edit to refine. Never includes employer name.</p>
              </div>
              <button onClick={() => { const p = buildBackgroundPrompt(job!); setBgPrompt(p); setBgPromptDirty(false) }}
                className="text-[10px] px-2 py-1 bg-zinc-100 rounded-lg hover:bg-zinc-200 text-zinc-500">↺ Reset</button>
            </div>
            <textarea
              value={bgPrompt || (job?.background_image_prompt ?? buildBackgroundPrompt(job!))}
              onChange={e => { setBgPrompt(e.target.value); setBgPromptDirty(true) }}
              rows={4}
              className="w-full text-xs text-zinc-700 border border-zinc-200 rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-[#c8a96e] font-mono"
            />
            <div className="flex gap-2">
              {bgPromptDirty && (
                <button onClick={() => void patchJob({ background_image_prompt: bgPrompt }).then(() => setBgPromptDirty(false))}
                  className="text-xs px-3 py-1.5 bg-[#c8a96e] text-white rounded-xl font-bold hover:bg-[#b8945a]">
                  💾 Save prompt
                </button>
              )}
              <button
                onClick={async () => {
                  if (!job) return
                  const prompt = bgPrompt || job.background_image_prompt || buildBackgroundPrompt(job)
                  setMediaError(null); setGeneratingCover(true)
                  try {
                    const res = await fetch('/api/content/generate-image', {
                      method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ prompt, job_id: job.id, platform: 'background' }),
                    })
                    const d = await res.json() as { image_url?: string; error?: string }
                    if (!res.ok || !d.image_url) { setMediaError(d.error ?? 'Generation error'); return }
                    void patchJob({ background_image_url: d.image_url, background_image_prompt: prompt })
                  } catch (err) {
                    setMediaError(err instanceof Error ? err.message : 'Network error')
                  } finally { setGeneratingCover(false) }
                }}
                disabled={generatingCover}
                className="text-xs px-4 py-1.5 bg-[#1a1918] text-white rounded-xl font-bold disabled:opacity-40 hover:bg-zinc-800 transition-colors">
                {generatingCover ? '⏳ Generating…' : job?.background_image_url ? '🔄 Regenerate background' : '✨ Generate background'}
              </button>
            </div>
          </div>

          {/* Aperçu de l'image de fond */}
          {job?.background_image_url ? (
            <div className="bg-white rounded-xl border border-zinc-100 p-5">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">📸 Background preview</h3>
              <div className="relative group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={job.background_image_url} alt="" className="w-full aspect-video object-cover rounded-xl" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-3">
                  <button onClick={() => downloadImage(job.background_image_url!, `background-${job.id}.png`)}
                    className="text-xs px-3 py-2 bg-[#c8a96e] text-white rounded-lg font-bold">⬇ Download</button>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full aspect-video bg-zinc-50 rounded-xl flex flex-col items-center justify-center text-zinc-300 border-2 border-dashed border-zinc-200">
              <span className="text-5xl mb-3">🎨</span>
              <p className="text-sm font-medium text-zinc-400">Edit the prompt above then click Generate</p>
            </div>
          )}
        </div>
      )}

      {/* ─── ONGLET JOB CARD ─── */}
      {activeTab === 'job-card' && (
        <div className="space-y-5">
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
            <p className="text-xs text-amber-700 font-medium">📸 Job Card = Background image + Bali Interns overlay (title, duration, department, logo).</p>
            <p className="text-[11px] text-amber-600 mt-1">Generate the background first in the 🎨 Background tab, then come back here to compose the card.</p>
          </div>

          {job?.background_image_url ? (
            <div className="bg-white rounded-xl border border-zinc-100 p-5 space-y-4">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">📐 Job Card formats</h3>

              {/* Preview — Square (Instagram/TikTok) */}
              <div>
                <p className="text-[10px] font-bold text-zinc-500 uppercase mb-2">Square 1:1 — Instagram / TikTok</p>
                <div className="relative w-full max-w-sm mx-auto aspect-square rounded-xl overflow-hidden shadow-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={job.background_image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  {/* Bali Interns badge */}
                  <div className="absolute top-4 right-4 bg-[#c8a96e] text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-wider shadow">
                    Bali Interns
                  </div>
                  {/* Exclusivité badge */}
                  <div className="absolute top-4 left-4 bg-white/10 backdrop-blur text-white text-[9px] font-bold px-2.5 py-1 rounded-full border border-white/30 uppercase tracking-wider">
                    Exclusivité 🌴
                  </div>
                  {/* Bottom info */}
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <p className="text-[10px] font-bold text-[#c8a96e] uppercase tracking-widest mb-1">{job.department ?? 'Internship'}</p>
                    <h2 className="text-white text-xl font-black leading-tight mb-2">{job.public_title ?? job.title}</h2>
                    <div className="flex items-center gap-3">
                      {job.wished_duration_months && (
                        <span className="text-white/80 text-xs font-medium">⏱ {job.wished_duration_months} months</span>
                      )}
                      {job.location && (
                        <span className="text-white/80 text-xs font-medium">📍 {job.location}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex justify-center mt-3">
                  <button
                    onClick={() => {
                      // CSS-rendered card — user screenshots or we generate server-side
                      alert('💡 To download: right-click on the card → Save image, or use the screenshot shortcut.')
                    }}
                    className="text-xs px-4 py-2 bg-zinc-100 rounded-xl text-zinc-600 hover:bg-zinc-200">
                    ⬇ Download (screenshot)
                  </button>
                </div>
              </div>

              {/* Story 9:16 */}
              <div>
                <p className="text-[10px] font-bold text-zinc-500 uppercase mb-2">Story 9:16 — Instagram / TikTok</p>
                <div className="relative w-48 mx-auto aspect-[9/16] rounded-xl overflow-hidden shadow-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={job.background_image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-[#c8a96e] text-white text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-wider">Bali Interns</div>
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <p className="text-[9px] font-bold text-[#c8a96e] uppercase tracking-widest mb-1">{job.department}</p>
                    <h2 className="text-white text-base font-black leading-tight mb-2">{job.public_title ?? job.title}</h2>
                    {job.wished_duration_months && <p className="text-white/70 text-[10px]">⏱ {job.wished_duration_months} months · 📍 {job.location ?? 'Bali'}</p>}
                    <div className="mt-3 text-center">
                      <span className="text-[9px] bg-white/20 backdrop-blur text-white px-3 py-1 rounded-full border border-white/30">🌴 Exclusivité Bali Interns</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-zinc-100 p-10 text-center">
              <p className="text-5xl mb-4">🎨</p>
              <p className="text-zinc-500 text-sm font-medium">Generate a background image first</p>
              <p className="text-zinc-400 text-xs mt-1">Go to the 🎨 Background tab to generate your background image</p>
              <button onClick={() => setActiveTab('background')}
                className="mt-4 text-xs px-4 py-2 bg-[#c8a96e] text-white rounded-xl font-bold hover:bg-[#b8945a]">
                → Go to Background tab
              </button>
            </div>
          )}
        </div>
      )}

      {/* ─── ONGLET VIDEO ─── */}
      {activeTab === 'video' && (
        <div className="bg-white rounded-xl border border-zinc-100 p-10 text-center">
          <div className="text-6xl mb-4">🎬</div>
          <h3 className="text-lg font-bold text-[#1a1918] mb-2">Job Video</h3>
          <p className="text-sm text-zinc-500 mb-2 max-w-sm mx-auto">Animated videos for Reels, TikTok, and Stories — coming soon via Remotion templates.</p>
          <p className="text-xs text-zinc-400 mb-5">Remotion will let you generate branded videos automatically from job data using a pre-built Bali Interns template.</p>
          <div className="inline-block px-5 py-2 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-700 font-bold">🔜 Coming soon</div>
        </div>
      )}

      {activeTab === 'captions' && (
        <div className="space-y-4">
          {aiError && (
            <div className="px-3 py-2 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 flex items-center justify-between">
              <span>{aiError}</span>
              <button onClick={() => setAiError(null)} className="ml-2 text-red-400 hover:text-red-600">×</button>
            </div>
          )}

          {/* Config */}
          <div className="bg-white rounded-xl border border-zinc-100 p-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Ton</p>
                <div className="flex flex-wrap gap-1">
                  {['Enthousiaste', 'Professionnel', 'Décontracté', 'Inspirant', 'Urgence'].map(t => (
                    <button key={t} onClick={() => setTone(t)} className={`px-2.5 py-1 text-[10px] rounded-full font-medium border transition-all ${tone === t ? 'bg-[#c8a96e] text-white border-[#c8a96e]' : 'border-zinc-200 text-zinc-500 hover:border-zinc-400'}`}>{t}</button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Langue</p>
                <div className="flex gap-1">
                  <button onClick={() => setLang('fr')} className={`flex-1 py-1.5 text-xs rounded-xl font-bold border transition-all ${lang === 'fr' ? 'bg-[#c8a96e] text-white border-[#c8a96e]' : 'border-zinc-200 text-zinc-400'}`}>🇫🇷 FR</button>
                  <button onClick={() => setLang('en')} className={`flex-1 py-1.5 text-xs rounded-xl font-bold border transition-all ${lang === 'en' ? 'bg-[#c8a96e] text-white border-[#c8a96e]' : 'border-zinc-200 text-zinc-400'}`}>🇬🇧 EN</button>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs par réseau */}
          <div className="flex gap-1 bg-zinc-100 p-1 rounded-xl">
            {(Object.entries(PD) as [Platform, typeof PD[Platform]][]).map(([p, pd]) => (
              <button key={p} onClick={() => setActivePlatform(p)}
                className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${activePlatform === p ? 'bg-white text-[#1a1918] shadow-sm' : 'text-zinc-400'}`}>
                <span>{pd.icon}</span><span className="hidden sm:inline">{pd.label}</span>
              </button>
            ))}
          </div>

          {/* Post card plateforme active */}
          {(() => {
            const pd = PD[activePlatform]
            const post = postsByPlatform[activePlatform]
            return (
              <div className="bg-white rounded-xl border border-zinc-100 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-50">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{pd.icon}</span>
                    <span className="text-sm font-bold" style={{ color: pd.color }}>{pd.label}</span>
                    <span className="text-[10px] text-zinc-400">{pd.desc}</span>
                  </div>
                  <button onClick={() => void generatePost(activePlatform)} disabled={generatingPost === activePlatform}
                    className="text-xs px-3 py-1.5 bg-[#c8a96e] text-white rounded-xl font-bold disabled:opacity-40 hover:bg-[#b8945a] transition-colors">
                    {generatingPost === activePlatform ? '⏳ Génération…' : post ? '🔄 Regénérer' : '✨ Generate'}
                  </button>
                </div>
                <div className={`${post?.image_url || platformImages[activePlatform] ? 'grid grid-cols-2' : ''}`}>
                  {(post?.image_url || platformImages[activePlatform]) && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={post?.image_url || platformImages[activePlatform]} alt="" className="w-full aspect-square object-cover" />
                  )}
                  <div className="p-4 space-y-3">
                    {!post ? (
                      <div className="py-8 text-center text-zinc-300">
                        <p className="text-3xl mb-2">✍️</p>
                        <p className="text-xs">Clique &quot;Generate&quot; pour créer le post {pd.label}</p>
                      </div>
                    ) : editingPost === activePlatform ? (
                      <div className="space-y-2">
                        <textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={7}
                          className="w-full text-sm text-zinc-700 border border-zinc-200 rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-[#c8a96e]" />
                        <div className="flex gap-2">
                          <button onClick={() => { setPostsByPlatform(prev => ({ ...prev, [activePlatform]: { ...post, content: editContent } })); setEditingPost(null) }}
                            className="px-3 py-1.5 text-xs font-bold bg-[#c8a96e] text-white rounded-lg">✓ Valider</button>
                          <button onClick={() => setEditingPost(null)} className="px-3 py-1.5 text-xs border border-zinc-200 rounded-lg text-zinc-500">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-zinc-700 leading-relaxed whitespace-pre-wrap">{post.content}</p>
                        {post.hashtags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {post.hashtags.map((h, i) => <span key={i} className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: `${pd.color}15`, color: pd.color }}>{h}</span>)}
                          </div>
                        )}
                      </>
                    )}
                    {post && editingPost !== activePlatform && (
                      <div className="flex gap-2 pt-1">
                        <button onClick={() => copy(`${post.content}\n\n${post.hashtags.join(' ')}`, activePlatform)}
                          className="flex-1 py-1.5 text-xs border border-zinc-200 rounded-lg text-zinc-600 hover:bg-zinc-50">
                          {copiedPost === activePlatform ? '✓ Copié !' : '📋 Copier'}
                        </button>
                        <button onClick={() => { setEditingPost(activePlatform); setEditContent(post.content) }}
                          className="px-3 py-1.5 text-xs border border-zinc-200 rounded-lg text-zinc-500">✏️</button>
                        <button onClick={() => void savePost(activePlatform)} disabled={savedPosts.includes(activePlatform)}
                          className={`px-3 py-1.5 text-xs rounded-lg font-bold ${savedPosts.includes(activePlatform) ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}>
                          {savedPosts.includes(activePlatform) ? '✓' : '💾'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })()}
        </div>
      )}

      {/* ─── ONGLET CANDIDATURES ─── */}
      {activeTab === 'candidatures' && (
        <div className="bg-white border border-zinc-100 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[#1a1918] mb-3">
            Candidatures en cours <span className="text-zinc-400 font-normal">({submissionsCount})</span>
          </h2>

          {submissionsCount === 0 ? (
            <p className="text-sm text-zinc-400 italic">Aucun candidat proposé pour ce job.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100">
                    <th className="text-left text-xs font-medium text-zinc-400 pb-2">Candidat</th>
                    <th className="text-left text-xs font-medium text-zinc-400 pb-2">Status</th>
                    <th className="text-left text-xs font-medium text-zinc-400 pb-2">Réponse</th>
                    <th className="text-left text-xs font-medium text-zinc-400 pb-2">CV</th>
                    <th className="text-left text-xs font-medium text-zinc-400 pb-2">Date</th>
                    <th className="text-left text-xs font-medium text-zinc-400 pb-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {(job.job_submissions ?? []).map(sub => {
                    const subBadge = SUB_STATUS[sub.status] ?? { bg: '#f3f4f6', color: '#374151', label: sub.status }
                    const internName = sub.cases?.interns
                      ? `${sub.cases.interns.first_name} ${sub.cases.interns.last_name}`
                      : 'Candidat inconnu'
                    return (
                      <tr key={sub.id}>
                        <td className="py-2 pr-3">
                          {sub.cases?.id ? (
                            <Link href={`/${locale}/cases/${sub.cases.id}`} className="font-medium text-[#1a1918] hover:text-[#c8a96e] transition-colors">
                              {internName}
                            </Link>
                          ) : (
                            <span className="text-zinc-500">{internName}</span>
                          )}
                        </td>
                        <td className="py-2 pr-3">
                          <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ background: subBadge.bg, color: subBadge.color }}>
                            {subBadge.label}
                          </span>
                        </td>
                        <td className="py-2 pr-3">
                          {sub.intern_interested === true && <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-[#0d9e75] font-medium">Intéressé</span>}
                          {sub.intern_interested === false && <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-500 font-medium">Pas intéressé</span>}
                          {(sub.intern_interested === null || sub.intern_interested === undefined) && <span className="text-xs text-zinc-300">—</span>}
                        </td>
                        <td className="py-2 pr-3">
                          <span className={`text-xs ${sub.cv_sent ? 'text-[#0d9e75]' : 'text-zinc-300'}`}>{sub.cv_sent ? 'Oui' : '—'}</span>
                        </td>
                        <td className="py-2 pr-3 text-xs text-zinc-400">
                          {sub.created_at ? new Date(sub.created_at).toLocaleDateString('fr-FR') : '—'}
                        </td>
                        <td className="py-2">
                          <div className="flex gap-1">
                            {sub.status === 'submitted' && (
                              <>
                                <button onClick={() => void updateSubmission(sub.id, 'retained')}
                                  className="text-xs px-2 py-1 bg-green-100 text-[#0d9e75] rounded-lg hover:bg-green-200 font-medium transition-colors">
                                  Retenu
                                </button>
                                <button onClick={() => void updateSubmission(sub.id, 'rejected')}
                                  className="text-xs px-2 py-1 bg-red-50 text-[#dc2626] rounded-lg hover:bg-red-100 font-medium transition-colors">
                                  Refusé
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Proposer un candidat */}
          <div className="mt-4 pt-4 border-t border-zinc-50">
            <p className="text-xs font-medium text-zinc-500 mb-2">Proposer un candidat (qualification_done)</p>
            <div className="space-y-2">
              <SearchableSelect
                items={qualifiedCases.map((c): SearchableSelectItem => ({
                  id: c.id,
                  label: c.interns ? `${c.interns.first_name} ${c.interns.last_name}` : 'Candidat inconnu',
                  sublabel: c.status ?? undefined,
                  avatar: c.interns?.first_name?.[0]?.toUpperCase() ?? '?',
                  avatarColor: '#f0ebe2',
                }))}
                value={selectedCaseId || null}
                onChange={item => setSelectedCaseId(item?.id ?? '')}
                placeholder="Rechercher un candidat…"
                searchPlaceholder="Nom, prénom, statut…"
                emptyText="Aucun candidat en qualification"
              />
              <button
                onClick={() => void addCandidate()}
                disabled={!selectedCaseId || addingCandidate}
                className="w-full px-3 py-2 text-sm font-medium bg-[#c8a96e] text-white rounded-xl hover:bg-[#b8945a] disabled:opacity-50 transition-colors"
              >
                {addingCandidate ? 'Proposition en cours…' : '→ Proposer ce candidat'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── ONGLET ACTIVITÉ ─── */}
      {activeTab === 'activite' && (
        <div className="bg-white border border-zinc-100 rounded-xl p-5">
          <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">📊 Activité du job</h2>
          {activityLoading ? (
            <div className="space-y-2 animate-pulse">
              {[1, 2, 3].map(i => <div key={i} className="h-12 bg-zinc-50 rounded-lg" />)}
            </div>
          ) : activity.length === 0 ? (
            <p className="text-sm text-zinc-400 italic">Aucune activité enregistrée pour ce job — les soumissions de candidats, posts générés et publications programmées apparaîtront ici.</p>
          ) : (
            <div className="space-y-2">
              {activity.map(a => (
                <div key={a.id} className="flex items-start gap-3 px-3 py-2 border-b border-zinc-50 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#1a1918] truncate">{a.title}</p>
                    {a.description && <p className="text-xs text-zinc-400 truncate">{a.description}</p>}
                  </div>
                  <span className="text-xs text-zinc-400 flex-shrink-0 whitespace-nowrap">
                    {new Date(a.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  )
}
