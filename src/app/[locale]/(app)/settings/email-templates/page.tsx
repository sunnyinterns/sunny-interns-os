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
  first_name: 'Marie',
  last_name: 'Dupont',
  email: 'marie.dupont@gmail.com',
  arrival_date: '15 juillet 2026',
  flight_number: 'QR957',
  job_title: 'Assistante Marketing',
  company_name: 'Digital Agency Bali',
  duration_weeks: '12',
  dropoff_address: 'Villa Sunset, Seminyak',
  payment_amount: '2 890 €',
  payment_link: 'https://pay.sunnyinterns.com/xxx',
}

function substituteVariables(text: string): string {
  return text.replace(/\{(\w+)\}/g, (_, key: string) => EXAMPLE_VARIABLES[key] ?? `{${key}}`)
}

// Normalize legacy categories to current ones
function normalizeCategory(cat: string | null | undefined): string {
  const legacyMap: Record<string, string> = {
    onboarding: 'intern_qualification',
    billing: 'intern_payment',
    arrival: 'intern_departure',
    visa: 'intern_visa',
    general: 'intern_lead',
  }
  if (!cat) return 'internal'
  return legacyMap[cat] ?? cat
}

// Derive category from slug (DB has slug, not category)
function getCategoryFromSlug(slug: string | null | undefined): string {
  if (!slug) return 'internal'
  if (slug === 'visa_agent_submission') return 'agent'
  if (slug.startsWith('employer_') || slug === 'job_submitted_employer' || slug === 'sponsor_contract_employer') return 'employer'
  if (slug.startsWith('visa_')) return 'intern_visa'
  if (slug.startsWith('touchpoint_') || slug === 'alumni_welcome' || slug === 'ugc_thank_you') return 'intern_internship'
  if (slug === 'arrival_prep' || slug === 'welcome_kit' || slug === 'all_indonesia_j3') return 'intern_departure'
  if (slug === 'invoice_sent' || slug === 'payment_request' || slug === 'payment_confirmed') return 'intern_payment'
  if (slug === 'new_job_alert') return 'intern_jobs'
  if (slug === 'booking_confirmation' || slug === 'rdv_confirmation' || slug === 'rdv_reminder') return 'intern_lead'
  if (slug === 'convention_request') return 'intern_convention'
  if (slug === 'driver_notification' || slug === 'new_lead_internal' || slug === 'intern_card_ready' || slug === 'partner_welcome') return 'internal'
  return 'intern_qualification'
}

// Recipient for a normalized category
function getRecipient(normalizedCat: string): string {
  if (normalizedCat.startsWith('intern_')) return 'intern'
  if (normalizedCat === 'employer') return 'employer'
  if (normalizedCat === 'agent') return 'agent'
  return 'internal'
}

type Stage = { id: string; label: string; statuses: string[] }
type RecipientGroup = { id: string; label: string; badgeCls: string; stages: Stage[] }

const RECIPIENT_GROUPS: RecipientGroup[] = [
  {
    id: 'intern',
    label: 'Intern',
    badgeCls: 'bg-blue-100 text-blue-700',
    stages: [
      { id: 'intern_lead', label: 'Lead & Booking', statuses: ['lead'] },
      { id: 'intern_qualification', label: 'Qualification', statuses: ['rdv_booked', 'qualification_done'] },
      { id: 'intern_jobs', label: 'Jobs', statuses: ['job_submitted', 'job_retained'] },
      { id: 'intern_convention', label: 'Convention', statuses: ['convention_signed'] },
      { id: 'intern_payment', label: 'Payment', statuses: ['payment_pending', 'payment_received'] },
      { id: 'intern_visa', label: 'Visa', statuses: ['visa_in_progress', 'visa_received'] },
      { id: 'intern_departure', label: 'Pre-departure', statuses: ['arrival_prep'] },
      { id: 'intern_internship', label: 'During & After', statuses: ['active', 'alumni'] },
    ],
  },
  {
    id: 'employer',
    label: 'Employer',
    badgeCls: 'bg-orange-100 text-orange-700',
    stages: [
      { id: 'employer', label: 'Employer emails', statuses: ['job_submitted', 'convention_signed'] },
    ],
  },
  {
    id: 'agent',
    label: 'Visa Agent',
    badgeCls: 'bg-purple-100 text-purple-700',
    stages: [
      { id: 'agent', label: 'Visa process', statuses: ['visa_in_progress'] },
    ],
  },
  {
    id: 'internal',
    label: 'Internal',
    badgeCls: 'bg-zinc-100 text-zinc-600',
    stages: [
      { id: 'internal', label: 'Manager notifications', statuses: [] },
    ],
  },
]

const STATUS_BADGE_CLS: Record<string, string> = {
  lead: 'bg-zinc-100 text-zinc-600',
  rdv_booked: 'bg-blue-100 text-blue-700',
  qualification_done: 'bg-emerald-100 text-emerald-700',
  job_submitted: 'bg-purple-100 text-purple-700',
  job_retained: 'bg-orange-100 text-orange-700',
  convention_signed: 'bg-amber-100 text-amber-700',
  payment_pending: 'bg-red-100 text-red-700',
  payment_received: 'bg-teal-100 text-teal-700',
  visa_in_progress: 'bg-blue-100 text-blue-700',
  visa_received: 'bg-emerald-100 text-emerald-700',
  arrival_prep: 'bg-red-100 text-red-700',
  active: 'bg-emerald-100 text-emerald-700',
  alumni: 'bg-amber-100 text-amber-700',
}

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<EmailTemplate | null>(null)
  const [editSubject, setEditSubject] = useState('')
  const [editBody, setEditBody] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState<string | null>(null)
  // Collapsed state per recipient
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const fetchTemplates = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/email-templates')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json() as EmailTemplate[]
      setTemplates(data)
      if (data.length > 0 && !selected) {
        setSelected(data[0])
        setEditSubject(data[0].subject)
        setEditBody(data[0].body_html)
      }
    } catch {
      setTemplates([])
    } finally {
      setLoading(false)
    }
  }, [selected])

  useEffect(() => {
    void fetchTemplates()
  // Only on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function selectTemplate(tpl: EmailTemplate) {
    setSelected(tpl)
    setEditSubject(tpl.subject)
    setEditBody(tpl.body_html)
    setShowPreview(false)
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
      setTemplates((prev) => prev.map((t) => t.id === updated.id ? updated : t))
      setSelected(updated)
      setSavedMsg('Saved!')
    } catch (e) {
      setSavedMsg(e instanceof Error ? e.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  function toggleCollapsed(recipientId: string) {
    setCollapsed(prev => ({ ...prev, [recipientId]: !prev[recipientId] }))
  }

  // Group templates: recipient → stageId → EmailTemplate[]
  const grouped = new Map<string, Map<string, EmailTemplate[]>>()
  for (const group of RECIPIENT_GROUPS) {
    grouped.set(group.id, new Map(group.stages.map(s => [s.id, []])))
  }
  for (const tpl of templates) {
    const norm = getCategoryFromSlug(tpl.slug)
    const recipient = getRecipient(norm)
    const recipientMap = grouped.get(recipient)
    if (recipientMap) {
      const arr = recipientMap.get(norm) ?? recipientMap.get(recipient)
      if (arr) arr.push(tpl)
    }
  }

  const previewSubject = substituteVariables(editSubject)
  const previewBody = substituteVariables(editBody)

  // Find recipient + stage info for selected template
  const selectedNorm = selected ? getCategoryFromSlug(selected.slug) : null
  const selectedRecipient = selectedNorm ? RECIPIENT_GROUPS.find(g => g.id === getRecipient(selectedNorm)) : null
  const selectedStage = selectedRecipient?.stages.find(s => s.id === selectedNorm)

  return (
    <div className="flex h-full">
      {/* Left panel — 2-level sidebar */}
      <div className="w-64 flex-shrink-0 border-r border-zinc-100 bg-white flex flex-col">
        <div className="px-4 py-4 border-b border-zinc-100">
          <h1 className="text-sm font-semibold text-[#1a1918]">Email Templates</h1>
        </div>
        {loading ? (
          <div className="p-4 space-y-2 animate-pulse">
            {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-zinc-100 rounded-lg" />)}
          </div>
        ) : (
          <nav className="flex-1 overflow-y-auto py-2">
            {RECIPIENT_GROUPS.map(group => {
              const isCollapsed = !!collapsed[group.id]
              const recipientMap = grouped.get(group.id)
              // Count templates in this group
              let groupCount = 0
              recipientMap?.forEach(arr => { groupCount += arr.length })

              return (
                <div key={group.id}>
                  {/* Recipient header */}
                  <button
                    onClick={() => toggleCollapsed(group.id)}
                    className="w-full flex items-center justify-between px-3 py-2 hover:bg-zinc-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${group.badgeCls}`}>
                        {group.label.toUpperCase()}
                      </span>
                      {groupCount > 0 && (
                        <span className="text-[10px] text-zinc-400">{groupCount}</span>
                      )}
                    </div>
                    <span className="text-zinc-300 text-xs">{isCollapsed ? '▶' : '▼'}</span>
                  </button>

                  {!isCollapsed && group.stages.map(stage => {
                    const stageTpls = recipientMap?.get(stage.id) ?? []
                    if (stageTpls.length === 0) return null
                    return (
                      <div key={stage.id} className="mb-1">
                        {/* Stage label */}
                        <p className="px-4 pt-1 pb-0.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                          {stage.label}
                        </p>
                        {/* Templates */}
                        {stageTpls.map(tpl => (
                          <button
                            key={tpl.id}
                            onClick={() => selectTemplate(tpl)}
                            className={[
                              'w-full text-left px-4 py-2 transition-colors',
                              selected?.id === tpl.id
                                ? 'bg-amber-50 border-l-2 border-[#c8a96e]'
                                : 'hover:bg-zinc-50 border-l-2 border-transparent',
                            ].join(' ')}
                          >
                            <p className="text-xs font-medium text-[#1a1918] truncate">{tpl.name}</p>
                          </button>
                        ))}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </nav>
        )}
      </div>

      {/* Right panel — editor */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selected ? (
          <div className="flex-1 flex items-center justify-center text-sm text-zinc-400">
            Select a template
          </div>
        ) : (
          <>
            {/* Editor header */}
            <div className="px-6 py-4 border-b border-zinc-100 bg-white flex items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-[#1a1918]">{selected.name}</h2>
                <div className="flex items-center flex-wrap gap-1.5 mt-1">
                  {/* Recipient badge */}
                  {selectedRecipient && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${selectedRecipient.badgeCls}`}>
                      {selectedRecipient.label.toUpperCase()}
                    </span>
                  )}
                  {/* Stage */}
                  {selectedStage && (
                    <span className="text-[10px] text-zinc-500">{selectedStage.label}</span>
                  )}
                  {/* Status badges */}
                  {selectedStage && selectedStage.statuses.map(st => (
                    <span key={st} className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_BADGE_CLS[st] ?? 'bg-zinc-100 text-zinc-500'}`}>
                      {st.replace(/_/g, ' ')}
                    </span>
                  ))}
                  {selected.version != null && (
                    <span className="text-[10px] text-zinc-400">v{selected.version}</span>
                  )}
                  {selected.updated_at && (
                    <span className="text-[10px] text-zinc-400">
                      {new Date(selected.updated_at).toLocaleDateString('en-GB')}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {savedMsg && (
                  <span className="text-xs text-[#0d9e75]">{savedMsg}</span>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowPreview((v) => !v)}
                >
                  {showPreview ? 'Editor' : 'Preview'}
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => { void handleSave() }}
                  disabled={saving}
                >
                  {saving ? 'Saving…' : 'Save'}
                </Button>
              </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
              {/* Editor fields */}
              {!showPreview ? (
                <div className="flex-1 p-6 space-y-4 overflow-y-auto">
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-1">Subject</label>
                    <input
                      value={editSubject}
                      onChange={(e) => setEditSubject(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c8a96e]"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-zinc-500 mb-1">HTML body</label>
                    <textarea
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                      rows={20}
                      className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c8a96e] font-mono resize-y"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex-1 p-6 overflow-y-auto">
                  <div className="max-w-2xl mx-auto bg-white rounded-xl border border-zinc-100 overflow-hidden">
                    <div className="px-5 py-3 bg-zinc-50 border-b border-zinc-100">
                      <p className="text-xs text-zinc-500">Subject:</p>
                      <p className="text-sm font-medium text-[#1a1918]">{previewSubject}</p>
                    </div>
                    <div
                      className="p-5 prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: previewBody }}
                    />
                  </div>
                </div>
              )}

              {/* Variables sidebar */}
              <div className="w-56 flex-shrink-0 border-l border-zinc-100 bg-zinc-50 p-4 overflow-y-auto">
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">Variables</p>
                <div className="space-y-2">
                  {Object.entries(EXAMPLE_VARIABLES).map(([key, example]) => (
                    <div key={key}>
                      <code className="text-xs text-[#c8a96e] font-mono">{`{${key}}`}</code>
                      <p className="text-xs text-zinc-400 mt-0.5">{example}</p>
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
