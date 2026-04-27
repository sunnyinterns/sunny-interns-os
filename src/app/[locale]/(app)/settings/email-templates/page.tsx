'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/Button'

interface EmailTemplate {
  id: string
  name: string
  slug?: string | null
  category?: string | null
  subject: string
  body_html: string
  version?: number | null
  updated_at?: string | null
}

const EXAMPLE_VARIABLES: Record<string, string> = {
  first_name: 'Emma',
  last_name: 'Johnson',
  email: 'emma.johnson@gmail.com',
  arrival_date: 'July 15, 2026',
  flight_number: 'QR957',
  job_title: 'Marketing Assistant',
  company_name: 'Digital Agency Bali',
  duration_weeks: '12',
  dropoff_address: 'Villa Sunset, Seminyak',
  payment_amount: '€990',
  payment_link: 'https://pay.sunnyinterns.com/xxx',
  invoice_number: 'INV-2026-042',
  package_name: 'Bali Standard',
  intern_name: 'Emma Johnson',
  rdv_time: '10:00 AM',
  score: '85',
}

function substituteVariables(text: string): string {
  return text.replace(/\{(\w+)\}/g, (_, key: string) => EXAMPLE_VARIABLES[key] ?? `{${key}}`)
}

// ─── Architecture workflow ────────────────────────────────────────────────────
// Each section maps to a stage in the intern journey
// recipient: who receives this email
// trigger: when it fires

interface WorkflowSection {
  id: string
  label: string
  emoji: string
  description: string
  recipient: 'intern' | 'employer' | 'agent' | 'internal' | 'partner'
  badgeCls: string
  slugs: string[]
}

const WORKFLOW: WorkflowSection[] = [
  // ── INTERN JOURNEY ──────────────────────────────────────────────────────────
  {
    id: 'leads',
    label: 'Leads',
    emoji: '📋',
    description: 'Application submitted — not yet qualified',
    recipient: 'intern',
    badgeCls: 'bg-zinc-100 text-zinc-600',
    slugs: ['apply_confirmation_en', 'new_lead_internal'],
  },
  {
    id: 'candidates',
    label: 'Candidates',
    emoji: '🎓',
    description: 'Interview booked → qualification done',
    recipient: 'intern',
    badgeCls: 'bg-blue-100 text-blue-700',
    slugs: ['booking_confirmation', 'rdv_reminder', 'qualification_recap', 'welcome_portal'],
  },
  {
    id: 'jobs',
    label: 'Jobs',
    emoji: '💼',
    description: 'Job matching & submission',
    recipient: 'intern',
    badgeCls: 'bg-violet-100 text-violet-700',
    slugs: ['new_job_alert'],
  },
  {
    id: 'convention',
    label: 'Convention',
    emoji: '📝',
    description: 'Internship agreement to sign',
    recipient: 'intern',
    badgeCls: 'bg-amber-100 text-amber-700',
    slugs: ['convention_request'],
  },
  {
    id: 'payment',
    label: 'Payment',
    emoji: '💳',
    description: 'Invoice & payment confirmation',
    recipient: 'intern',
    badgeCls: 'bg-emerald-100 text-emerald-700',
    slugs: ['payment_request', 'payment_confirmed', 'invoice_sent'],
  },
  {
    id: 'visa',
    label: 'Visa',
    emoji: '🛂',
    description: 'Visa documents, processing & result',
    recipient: 'intern',
    badgeCls: 'bg-indigo-100 text-indigo-700',
    slugs: ['visa_docs_request', 'visa_submitted', 'visa_received', 'visa_refused'],
  },
  {
    id: 'predeparture',
    label: 'Pre-departure',
    emoji: '✈️',
    description: 'J-14 & J-3 crons — triggered by start date',
    recipient: 'intern',
    badgeCls: 'bg-orange-100 text-orange-700',
    slugs: ['arrival_prep', 'all_indonesia_j3', 'welcome_kit', 'intern_card_ready'],
  },
  {
    id: 'internship',
    label: 'During & After',
    emoji: '🌴',
    description: 'D+3, D+30, D+60 crons + alumni',
    recipient: 'intern',
    badgeCls: 'bg-teal-100 text-teal-700',
    slugs: ['touchpoint_j3', 'touchpoint_j30', 'touchpoint_j60', 'touchpoint_end', 'ugc_thank_you', 'alumni_welcome'],
  },
  // ── EMPLOYERS ───────────────────────────────────────────────────────────────
  {
    id: 'employers',
    label: 'Employers',
    emoji: '🏢',
    description: 'Onboarding, CV submission, documents',
    recipient: 'employer',
    badgeCls: 'bg-orange-100 text-orange-700',
    slugs: ['employer_welcome', 'job_submitted_employer', 'employer_document_reminder', 'sponsor_contract_employer'],
  },
  // ── PARTNERS & AGENTS ───────────────────────────────────────────────────────
  {
    id: 'partners',
    label: 'Partners & Agents',
    emoji: '🤝',
    description: 'Visa agent & partner network',
    recipient: 'agent',
    badgeCls: 'bg-purple-100 text-purple-700',
    slugs: ['visa_agent_submission', 'partner_welcome'],
  },
  // ── SYSTEM / INTERNAL ────────────────────────────────────────────────────────
  {
    id: 'system',
    label: 'System',
    emoji: '⚙️',
    description: 'Internal notifications & auth',
    recipient: 'internal',
    badgeCls: 'bg-zinc-100 text-zinc-500',
    slugs: ['driver_notification', 'password_reset'],
  },
]

// Slug → section ID mapping (built from WORKFLOW)
const SLUG_TO_SECTION: Record<string, string> = {}
for (const section of WORKFLOW) {
  for (const slug of section.slugs) {
    SLUG_TO_SECTION[slug] = section.id
  }
}

function getSectionId(slug: string | null | undefined): string {
  if (!slug) return 'system'
  return SLUG_TO_SECTION[slug] ?? 'system'
}

const RECIPIENT_BADGE: Record<string, string> = {
  intern: 'bg-blue-100 text-blue-700',
  employer: 'bg-orange-100 text-orange-700',
  agent: 'bg-purple-100 text-purple-700',
  internal: 'bg-zinc-100 text-zinc-600',
  partner: 'bg-purple-100 text-purple-700',
}

// Group label separators for the journey timeline
const GROUPS = [
  { label: 'Intern Journey', sectionIds: ['leads','candidates','jobs','convention','payment','visa','predeparture','internship'] },
  { label: 'Employer', sectionIds: ['employers'] },
  { label: 'Partners & System', sectionIds: ['partners','system'] },
]

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<EmailTemplate | null>(null)
  const [editSubject, setEditSubject] = useState('')
  const [editBody, setEditBody] = useState('')
  const [showEditor, setShowEditor] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const fetchTemplates = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/email-templates')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json() as EmailTemplate[]
      setTemplates(data)
      if (data.length > 0 && !selected) {
        const first = data[0]
        setSelected(first)
        setEditSubject(first.subject)
        setEditBody(first.body_html)
      }
    } catch {
      setTemplates([])
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { void fetchTemplates() }, [])

  function selectTemplate(tpl: EmailTemplate) {
    setSelected(tpl)
    setEditSubject(tpl.subject)
    setEditBody(tpl.body_html)
    setShowEditor(false)
    setSavedMsg(null)
  }

  async function handleSave() {
    if (!selected) return
    setSaving(true)
    setSavedMsg(null)
    try {
      const res = await fetch(`/api/email-templates/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: editSubject, body_html: editBody }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const updated = await res.json() as EmailTemplate
      setTemplates(prev => prev.map(t => t.id === updated.id ? updated : t))
      setSelected(updated)
      setSavedMsg('Saved!')
      setShowEditor(false)
    } catch (e) {
      setSavedMsg(e instanceof Error ? e.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  // Group templates by section
  const bySection = new Map<string, EmailTemplate[]>()
  for (const section of WORKFLOW) {
    bySection.set(section.id, [])
  }
  for (const tpl of templates) {
    const sid = getSectionId(tpl.slug)
    const arr = bySection.get(sid) ?? bySection.get('system')!
    arr.push(tpl)
  }

  const previewSubject = substituteVariables(editSubject)
  const previewBody = substituteVariables(editBody)

  const selectedSection = selected ? WORKFLOW.find(s => s.id === getSectionId(selected.slug)) : null

  return (
    <div className="flex h-full">
      {/* ── Sidebar ── */}
      <div className="w-64 flex-shrink-0 border-r border-zinc-100 bg-white flex flex-col">
        <div className="px-4 py-3.5 border-b border-zinc-100">
          <h1 className="text-sm font-semibold text-[#1a1918]">Email Templates</h1>
          <p className="text-[10px] text-zinc-400 mt-0.5">{templates.length} templates · all in English</p>
        </div>

        {loading ? (
          <div className="p-4 space-y-2 animate-pulse">
            {[1,2,3,4].map(i => <div key={i} className="h-10 bg-zinc-100 rounded-lg" />)}
          </div>
        ) : (
          <nav className="flex-1 overflow-y-auto py-2">
            {GROUPS.map(group => (
              <div key={group.label} className="mb-1">
                {/* Group separator */}
                <div className="px-3 pt-3 pb-1">
                  <p className="text-[9px] font-black uppercase tracking-[2px] text-zinc-300">{group.label}</p>
                </div>

                {group.sectionIds.map(sid => {
                  const section = WORKFLOW.find(s => s.id === sid)!
                  const tpls = bySection.get(sid) ?? []
                  if (tpls.length === 0) return null
                  const isCollapsed = !!collapsed[sid]

                  return (
                    <div key={sid}>
                      <button
                        onClick={() => setCollapsed(prev => ({ ...prev, [sid]: !prev[sid] }))}
                        className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-zinc-50 transition-colors"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">{section.emoji}</span>
                          <span className="text-xs font-semibold text-[#1a1918]">{section.label}</span>
                          <span className="text-[10px] text-zinc-400">{tpls.length}</span>
                        </div>
                        <span className="text-zinc-300 text-[10px]">{isCollapsed ? '▶' : '▼'}</span>
                      </button>

                      {!isCollapsed && tpls.map(tpl => (
                        <button
                          key={tpl.id}
                          onClick={() => selectTemplate(tpl)}
                          className={[
                            'w-full text-left px-4 py-2 transition-colors border-l-2',
                            selected?.id === tpl.id
                              ? 'bg-amber-50 border-[#c8a96e]'
                              : 'hover:bg-zinc-50 border-transparent',
                          ].join(' ')}
                        >
                          <p className="text-xs font-medium text-[#1a1918] truncate">{tpl.name}</p>
                          <p className="text-[10px] text-zinc-400 truncate mt-0.5">{tpl.subject.replace(/\{[\w]+\}/g, '…').slice(0, 45)}</p>
                        </button>
                      ))}
                    </div>
                  )
                })}
              </div>
            ))}
          </nav>
        )}
      </div>

      {/* ── Main panel ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selected ? (
          <div className="flex-1 flex items-center justify-center text-sm text-zinc-400">
            Select a template
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-6 py-4 border-b border-zinc-100 bg-white flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {selectedSection && <span className="text-base">{selectedSection.emoji}</span>}
                  <h2 className="text-base font-semibold text-[#1a1918] truncate">{selected.name}</h2>
                </div>
                <div className="flex items-center flex-wrap gap-1.5 mt-1">
                  {selectedSection && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${selectedSection.badgeCls}`}>
                      {selectedSection.label.toUpperCase()}
                    </span>
                  )}
                  {selectedSection && (
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${RECIPIENT_BADGE[selectedSection.recipient]}`}>
                      → {selectedSection.recipient}
                    </span>
                  )}
                  {selected.slug && (
                    <code className="text-[10px] text-zinc-400 bg-zinc-50 px-1.5 py-0.5 rounded">{selected.slug}</code>
                  )}
                  {selected.updated_at && (
                    <span className="text-[10px] text-zinc-400">
                      {new Date(selected.updated_at).toLocaleDateString('en-GB')}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {savedMsg && <span className="text-xs text-[#0d9e75]">{savedMsg}</span>}
                {showEditor ? (
                  <>
                    <Button variant="secondary" size="sm" onClick={() => setShowEditor(false)}>← Preview</Button>
                    <Button variant="primary" size="sm" onClick={() => { void handleSave() }} disabled={saving}>
                      {saving ? 'Saving…' : 'Save'}
                    </Button>
                  </>
                ) : (
                  <Button variant="secondary" size="sm" onClick={() => setShowEditor(true)}>✏️ Edit</Button>
                )}
              </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
              {/* Content */}
              {showEditor ? (
                <div className="flex-1 p-6 space-y-4 overflow-y-auto">
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-1">Subject</label>
                    <input
                      value={editSubject}
                      onChange={e => setEditSubject(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
                    />
                    <p className="text-[10px] text-zinc-400 mt-1">Preview: {substituteVariables(editSubject)}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-1">HTML body</label>
                    <textarea
                      value={editBody}
                      onChange={e => setEditBody(e.target.value)}
                      rows={22}
                      className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c8a96e] font-mono resize-y"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex-1 p-6 overflow-y-auto bg-zinc-50">
                  {/* Subject bar */}
                  <div className="max-w-2xl mx-auto mb-3 bg-white rounded-xl border border-zinc-200 px-4 py-3 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-0.5">Subject</p>
                      <p className="text-sm font-medium text-[#1a1918]">{previewSubject}</p>
                    </div>
                  </div>
                  {/* Email body preview */}
                  <div className="max-w-2xl mx-auto bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-sm">
                    <div
                      className="p-5 prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: previewBody }}
                    />
                  </div>
                  {selectedSection && (
                    <p className="text-center text-[10px] text-zinc-400 mt-3">
                      {selectedSection.description}
                    </p>
                  )}
                </div>
              )}

              {/* Variables panel */}
              <div className="w-52 flex-shrink-0 border-l border-zinc-100 bg-white p-4 overflow-y-auto">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-3">Variables</p>
                <div className="space-y-2.5">
                  {Object.entries(EXAMPLE_VARIABLES).map(([key, example]) => (
                    <div key={key}>
                      <code className="text-[11px] text-[#c8a96e] font-mono">{`{${key}}`}</code>
                      <p className="text-[10px] text-zinc-400 mt-0.5 truncate">{example}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
