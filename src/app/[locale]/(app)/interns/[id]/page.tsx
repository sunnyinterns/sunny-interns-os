'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Intern {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  whatsapp: string | null
  nationality: string | null
  birth_date: string | null
  avatar_url: string | null
  linkedin_url: string | null
  school_name: string | null
  school_country: string | null
  school_contact_first_name: string | null
  school_contact_last_name: string | null
  school_contact_email: string | null
  desired_start_date: string | null
  desired_end_date: string | null
  desired_duration_months: number | null
  cv_url: string | null
  qualification_debrief: string | null
  private_comment_for_employer: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  emergency_contact_email: string | null
  created_at: string
}

interface CaseRow {
  id: string
  status: string
  created_at: string
  updated_at: string | null
  intern_first_meeting_date: string | null
}

interface ActivityRow {
  id: string
  type: string
  title: string
  description: string | null
  created_at: string
}

const STATUS_CLS: Record<string, string> = {
  lead:               'bg-zinc-100 text-zinc-600',
  rdv_booked:         'bg-blue-100 text-blue-700',
  qualification_done: 'bg-purple-100 text-purple-700',
  job_submitted:      'bg-amber-100 text-amber-600',
  job_retained:       'bg-orange-100 text-orange-600',
  convention_signed:  'bg-teal-100 text-teal-700',
  payment_pending:    'bg-red-100 text-red-600',
  payment_received:   'bg-emerald-100 text-emerald-700',
  visa_in_progress:   'bg-blue-100 text-blue-600',
  visa_received:      'bg-teal-100 text-teal-600',
  arrival_prep:       'bg-amber-100 text-amber-700',
  active:             'bg-emerald-100 text-emerald-700',
  alumni:             'bg-purple-100 text-purple-700',
  completed:          'bg-zinc-100 text-zinc-500',
}

function formatDate(d: string | null | undefined) {
  if (!d) return null
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function internCategoryLabel(status: string | null | undefined): { label: string; cls: string } {
  if (!status) return { label: 'No case', cls: 'bg-zinc-100 text-zinc-500' }
  if (status === 'lead') return { label: 'Lead', cls: 'bg-zinc-100 text-zinc-600' }
  if (['rdv_booked', 'qualification_done'].includes(status)) return { label: 'Candidate', cls: 'bg-blue-100 text-blue-700' }
  if (['job_submitted', 'job_retained', 'convention_signed', 'payment_pending', 'payment_received',
    'visa_docs_sent', 'visa_submitted', 'visa_in_progress', 'visa_received', 'arrival_prep'].includes(status))
    return { label: 'Client', cls: 'bg-green-100 text-green-700' }
  if (status === 'active') return { label: 'Active', cls: 'bg-emerald-100 text-emerald-700' }
  if (['alumni', 'completed'].includes(status)) return { label: 'Alumni', cls: 'bg-purple-100 text-purple-700' }
  return { label: status, cls: 'bg-zinc-100 text-zinc-500' }
}

type Tab = 'profile' | 'cases' | 'activity'

export default function InternProfilePage() {
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'fr'
  const id = typeof params?.id === 'string' ? params.id : ''

  const [intern, setIntern] = useState<Intern | null>(null)
  const [cases, setCases] = useState<CaseRow[]>([])
  const [activity, setActivity] = useState<ActivityRow[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('profile')

  useEffect(() => {
    if (!id) return
    const supabase = createClient()

    void Promise.all([
      supabase.from('interns').select('*').eq('id', id).single(),
      supabase.from('cases').select('id, status, created_at, updated_at, intern_first_meeting_date').eq('intern_id', id).order('created_at', { ascending: false }),
    ]).then(([{ data: internData }, { data: casesData }]) => {
      setIntern(internData as Intern | null)
      setCases((casesData ?? []) as CaseRow[])
      setLoading(false)
    })
  }, [id])

  useEffect(() => {
    if (tab !== 'activity' || !cases[0] || activity.length > 0) return
    const supabase = createClient()
    void supabase
      .from('activity_feed')
      .select('id, type, title, description, created_at')
      .eq('case_id', cases[0].id)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => setActivity((data ?? []) as ActivityRow[]))
  }, [tab, cases, activity.length])

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-4 animate-pulse">
        <div className="h-24 bg-zinc-100 rounded-2xl" />
        <div className="h-64 bg-zinc-100 rounded-2xl" />
      </div>
    )
  }

  if (!intern) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-10 text-center text-zinc-400">
        <p className="text-4xl mb-3">🤷</p>
        <p>Intern not found</p>
      </div>
    )
  }

  const latestCase = cases[0] ?? null
  const { label: categoryLabel, cls: categoryCls } = internCategoryLabel(latestCase?.status)
  const initials = `${intern.first_name[0] ?? ''}${intern.last_name?.[0] ?? ''}`.toUpperCase()
  const fullName = `${intern.first_name} ${intern.last_name}`

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex gap-6 items-start">

        {/* ── LEFT SIDEBAR ───────────────────────────────────────────── */}
        <div className="w-56 flex-shrink-0 space-y-4">

          {/* Avatar + name */}
          <div className="bg-white border border-zinc-100 rounded-2xl p-5 text-center">
            {intern.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={intern.avatar_url} alt={fullName} className="w-20 h-20 rounded-full object-cover mx-auto mb-3" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-[#c8a96e]/15 flex items-center justify-center text-2xl font-bold text-[#c8a96e] mx-auto mb-3">
                {initials}
              </div>
            )}
            <h1 className="text-base font-bold text-[#1a1918]">{fullName}</h1>
            <span className={`inline-block mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${categoryCls}`}>
              {categoryLabel}
            </span>
            {latestCase && (
              <div className="mt-1">
                <span className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded-full ${STATUS_CLS[latestCase.status] ?? 'bg-zinc-100 text-zinc-500'}`}>
                  {latestCase.status.replace(/_/g, ' ')}
                </span>
              </div>
            )}
          </div>

          {/* Contact info */}
          <div className="bg-white border border-zinc-100 rounded-2xl p-4 space-y-2">
            {intern.email && (
              <a href={`mailto:${intern.email}`} className="flex items-center gap-2 text-xs text-zinc-600 hover:text-[#c8a96e] transition-colors">
                <span>✉️</span><span className="truncate">{intern.email}</span>
              </a>
            )}
            {intern.whatsapp && (
              <a href={`https://wa.me/${intern.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs text-zinc-600 hover:text-green-600 transition-colors">
                <span>💬</span><span>{intern.whatsapp}</span>
              </a>
            )}
            {intern.phone && (
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <span>📞</span><span>{intern.phone}</span>
              </div>
            )}
            {intern.nationality && (
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <span>🌍</span><span>{intern.nationality}</span>
              </div>
            )}
            {intern.school_name && (
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <span>🎓</span><span className="truncate">{intern.school_name}</span>
              </div>
            )}
            {intern.linkedin_url && (
              <a href={intern.linkedin_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs text-blue-600 hover:underline">
                <span>💼</span><span>LinkedIn</span>
              </a>
            )}
            <div className="flex items-center gap-2 text-xs text-zinc-400 pt-1 border-t border-zinc-50">
              <span>📅</span><span>Since {formatDate(intern.created_at)}</span>
            </div>
          </div>

          {/* Case link */}
          {latestCase && (
            <Link
              href={`/${locale}/cases/${latestCase.id}`}
              className="block w-full text-center text-sm font-medium py-2.5 rounded-xl bg-[#c8a96e] text-white hover:bg-[#b8995e] transition-colors"
            >
              Open case →
            </Link>
          )}
        </div>

        {/* ── MAIN CONTENT ───────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* Tabs */}
          <div className="flex gap-1 bg-zinc-100 rounded-xl p-1 w-fit">
            {(['profile', 'cases', 'activity'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={['px-4 py-1.5 text-sm rounded-lg transition-colors font-medium capitalize', tab === t ? 'bg-white shadow-sm text-[#1a1918]' : 'text-zinc-500 hover:text-zinc-700'].join(' ')}
              >
                {t === 'cases' ? `Cases (${cases.length})` : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {/* ── PROFILE TAB ─────────────────────────────────────────── */}
          {tab === 'profile' && (
            <div className="space-y-4">

              {/* Internship goals */}
              <div className="bg-white border border-zinc-100 rounded-2xl p-5">
                <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wide mb-3">Internship Goals</h2>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {intern.desired_start_date && (
                    <div><p className="text-xs text-zinc-400">Desired start</p><p className="font-medium text-[#1a1918]">{formatDate(intern.desired_start_date)}</p></div>
                  )}
                  {intern.desired_duration_months && (
                    <div><p className="text-xs text-zinc-400">Duration</p><p className="font-medium text-[#1a1918]">{intern.desired_duration_months} months</p></div>
                  )}
                  {intern.desired_end_date && (
                    <div><p className="text-xs text-zinc-400">Desired end</p><p className="font-medium text-[#1a1918]">{formatDate(intern.desired_end_date)}</p></div>
                  )}
                  {intern.cv_url && (
                    <div className="col-span-2">
                      <a href={intern.cv_url} target="_blank" rel="noreferrer" className="text-xs text-[#c8a96e] hover:underline">📄 View CV →</a>
                    </div>
                  )}
                </div>
              </div>

              {/* School info */}
              {(intern.school_name || intern.school_contact_email) && (
                <div className="bg-white border border-zinc-100 rounded-2xl p-5">
                  <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wide mb-3">School</h2>
                  <div className="text-sm space-y-1">
                    {intern.school_name && <p className="font-medium text-[#1a1918]">{intern.school_name}{intern.school_country ? ` · ${intern.school_country}` : ''}</p>}
                    {(intern.school_contact_first_name || intern.school_contact_last_name) && (
                      <p className="text-zinc-500">Contact: {[intern.school_contact_first_name, intern.school_contact_last_name].filter(Boolean).join(' ')}</p>
                    )}
                    {intern.school_contact_email && (
                      <a href={`mailto:${intern.school_contact_email}`} className="text-xs text-[#c8a96e] hover:underline">{intern.school_contact_email}</a>
                    )}
                  </div>
                </div>
              )}

              {/* Emergency contact */}
              {intern.emergency_contact_name && (
                <div className="bg-white border border-zinc-100 rounded-2xl p-5">
                  <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wide mb-3">Emergency Contact</h2>
                  <div className="text-sm space-y-1">
                    <p className="font-medium text-[#1a1918]">{intern.emergency_contact_name}</p>
                    {intern.emergency_contact_phone && <p className="text-zinc-500">{intern.emergency_contact_phone}</p>}
                    {intern.emergency_contact_email && <a href={`mailto:${intern.emergency_contact_email}`} className="text-xs text-[#c8a96e] hover:underline">{intern.emergency_contact_email}</a>}
                  </div>
                </div>
              )}

              {/* Internal notes */}
              {intern.qualification_debrief && (
                <div className="bg-white border border-zinc-100 rounded-2xl p-5">
                  <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wide mb-3">Qualification Notes</h2>
                  <p className="text-sm text-zinc-600 whitespace-pre-wrap">{intern.qualification_debrief}</p>
                </div>
              )}
            </div>
          )}

          {/* ── CASES TAB ───────────────────────────────────────────── */}
          {tab === 'cases' && (
            <div className="space-y-3">
              {cases.length === 0 ? (
                <div className="bg-white border border-zinc-100 rounded-2xl p-8 text-center text-zinc-400">
                  <p>No cases found for this intern</p>
                </div>
              ) : (
                cases.map(c => (
                  <div key={c.id} className="bg-white border border-zinc-100 rounded-2xl p-5 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_CLS[c.status] ?? 'bg-zinc-100 text-zinc-500'}`}>
                          {c.status.replace(/_/g, ' ')}
                        </span>
                        <span className="text-xs text-zinc-400">{formatDate(c.created_at)}</span>
                        {c.intern_first_meeting_date && (
                          <span className="text-xs text-zinc-400">RDV: {formatDate(c.intern_first_meeting_date)}</span>
                        )}
                      </div>
                    </div>
                    <Link
                      href={`/${locale}/cases/${c.id}`}
                      className="text-xs px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-600 font-medium transition-colors flex-shrink-0"
                    >
                      Open case →
                    </Link>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── ACTIVITY TAB ────────────────────────────────────────── */}
          {tab === 'activity' && (
            <div className="bg-white border border-zinc-100 rounded-2xl p-5">
              {activity.length === 0 ? (
                <div className="text-center py-8 text-zinc-400">
                  <p>No activity recorded yet</p>
                  {cases[0] && (
                    <Link href={`/${locale}/cases/${cases[0].id}`} className="text-xs text-[#c8a96e] hover:underline mt-2 block">
                      View case activity →
                    </Link>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {activity.map(ev => (
                    <div key={ev.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-2 h-2 rounded-full bg-[#c8a96e] mt-1.5 flex-shrink-0" />
                        <div className="flex-1 w-px bg-zinc-100 mt-1" />
                      </div>
                      <div className="pb-3 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-[#1a1918]">{ev.title}</p>
                          <p className="text-xs text-zinc-400">{formatDate(ev.created_at)}</p>
                        </div>
                        {ev.description && <p className="text-xs text-zinc-500 mt-0.5">{ev.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
