'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type AutomationType = 'email' | 'notif' | 'cron' | 'wait'

type AutomationItem = {
  type: AutomationType
  slug: string
  label: string
  fixed?: boolean
}

const ACTORS = [
  { id: 'intern',   label: 'Intern',            color: '#8b5cf6' },
  { id: 'employer', label: 'Employer',           color: '#3b82f6' },
  { id: 'agent',    label: 'Agent visa',         color: '#f97316' },
  { id: 'school',   label: 'School',             color: '#10b981' },
  { id: 'manager',  label: 'Manager (internal)', color: '#6b7280' },
]

const STAGES = [
  { id: 'lead',               label: 'Lead',         color: '#9ca3af' },
  { id: 'rdv_booked',         label: 'RDV',          color: '#3b82f6' },
  { id: 'qualification_done', label: 'Qualification', color: '#8b5cf6' },
  { id: 'job_submitted',      label: 'Job submitted', color: '#f59e0b' },
  { id: 'job_retained',       label: 'Job retained',  color: '#f97316' },
  { id: 'convention_signed',  label: 'Convention',    color: '#10b981' },
  { id: 'payment_received',   label: 'Payment',       color: '#10b981' },
  { id: 'visa_in_progress',   label: 'Visa',          color: '#f97316' },
  { id: 'visa_received',      label: 'Visa received', color: '#0ea5e9' },
  { id: 'arrival_prep',       label: 'Arrival prep',  color: '#c8a96e' },
  { id: 'active',             label: 'Active',        color: '#22c55e' },
  { id: 'alumni',             label: 'Alumni',        color: '#8b5cf6' },
]

const AUTOMATIONS: Record<string, Record<string, AutomationItem[]>> = {
  intern: {
    rdv_booked: [
      { type: 'email', slug: 'booking_confirmation', label: 'Booking confirmation' },
      { type: 'cron',  slug: 'rdv_reminder',         label: 'Reminder J-1' },
    ],
    qualification_done: [
      { type: 'email', slug: 'qualification_recap', label: 'Qualification recap' },
      { type: 'email', slug: 'welcome_portal',      label: 'Portal access + login' },
    ],
    job_submitted: [
      { type: 'email', slug: 'new_job_alert', label: 'New job opportunity' },
    ],
    job_retained: [
      { type: 'email', slug: 'convention_request', label: 'Convention request' },
    ],
    convention_signed: [
      { type: 'email', slug: 'payment_request', label: 'Invoice + IBAN' },
    ],
    payment_received: [
      { type: 'email', slug: 'payment_confirmed',  label: 'Payment confirmed' },
      { type: 'email', slug: 'visa_docs_request',  label: 'Visa docs request' },
      { type: 'wait',  slug: 'visa_docs',          label: 'En Attente: visa docs', fixed: true },
    ],
    visa_in_progress: [
      { type: 'email', slug: 'visa_submitted', label: 'Visa submitted' },
    ],
    visa_received: [
      { type: 'email', slug: 'visa_received', label: 'Visa approved + PDF' },
    ],
    arrival_prep: [
      { type: 'email', slug: 'arrival_prep', label: 'Bali arrival guide J-14' },
      { type: 'wait',  slug: 'flight_info',  label: 'En Attente: flight info', fixed: true },
    ],
    active: [
      { type: 'cron', slug: 'touchpoint_j3',  label: 'D+3 check-in' },
      { type: 'cron', slug: 'touchpoint_j30', label: 'D+30 check-in' },
      { type: 'cron', slug: 'touchpoint_j60', label: 'D+60 check-in' },
      { type: 'cron', slug: 'touchpoint_end', label: 'End notice J-14' },
    ],
    alumni: [
      { type: 'email', slug: 'alumni_welcome', label: 'Alumni welcome' },
    ],
  },
  employer: {
    job_submitted: [
      { type: 'email', slug: 'job_submitted_employer', label: 'CV profile sent' },
    ],
    convention_signed: [
      { type: 'email', slug: 'sponsor_contract_employer', label: 'Sponsor contract' },
    ],
  },
  agent: {
    visa_in_progress: [
      { type: 'email', slug: 'visa_agent_submission', label: 'Full visa dossier' },
    ],
  },
  school: {
    job_retained: [
      { type: 'wait', slug: 'convention', label: 'En Attente: convention', fixed: true },
    ],
  },
  manager: {
    lead: [
      { type: 'notif', slug: 'new_lead_internal', label: 'New application alert' },
    ],
    qualification_done: [
      { type: 'wait', slug: 'engagement_letter', label: 'En Attente: engagement letter', fixed: true },
    ],
    job_submitted: [
      { type: 'wait', slug: 'employer_response', label: 'En Attente: employer response', fixed: true },
    ],
    convention_signed: [
      { type: 'notif', slug: 'notif_convention_signed', label: 'Convention signed' },
    ],
    payment_received: [
      { type: 'notif', slug: 'notif_payment_received', label: 'Payment received' },
    ],
    visa_received: [
      { type: 'notif', slug: 'notif_visa_received', label: 'Visa received' },
    ],
    arrival_prep: [
      { type: 'email', slug: 'driver_notification', label: 'Driver pickup request' },
      { type: 'cron',  slug: 'all_indonesia_j3',   label: 'All Indonesia J-3' },
    ],
    active: [
      { type: 'email', slug: 'welcome_kit', label: 'Welcome kit J0' },
    ],
    alumni: [
      { type: 'email', slug: 'ugc_thank_you', label: 'UGC thank you' },
    ],
  },
}

const STORAGE_KEY = 'automation_prefs'

const TYPE_STYLE: Record<AutomationType, { bg: string; icon: string; label: string }> = {
  email: { bg: 'bg-green-50 border border-green-200',  icon: '📧', label: 'Email' },
  notif: { bg: 'bg-blue-50 border border-blue-200',    icon: '🔔', label: 'Notif' },
  cron:  { bg: 'bg-violet-50 border border-violet-200', icon: '⏰', label: 'Cron' },
  wait:  { bg: 'bg-amber-50 border border-amber-200',  icon: '⏳', label: 'Wait' },
}

// Collect all toggleable keys + defaults
function buildDefaults(): Record<string, boolean> {
  const d: Record<string, boolean> = {}
  for (const [actor, stages] of Object.entries(AUTOMATIONS)) {
    for (const [stage, items] of Object.entries(stages)) {
      for (const item of items) {
        if (!item.fixed) d[`${actor}__${stage}__${item.slug}`] = true
      }
    }
  }
  return d
}

export default function AutomationsMatrixPage() {
  const [prefs, setPrefs] = useState<Record<string, boolean>>({})
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      setPrefs(raw ? (JSON.parse(raw) as Record<string, boolean>) : buildDefaults())
    } catch {
      setPrefs(buildDefaults())
    }
    setMounted(true)
  }, [])

  function isOn(actor: string, stage: string, slug: string): boolean {
    if (!mounted) return true
    const k = `${actor}__${stage}__${slug}`
    return k in prefs ? !!prefs[k] : true
  }

  function toggle(actor: string, stage: string, slug: string) {
    const k = `${actor}__${stage}__${slug}`
    const next = { ...prefs, [k]: !isOn(actor, stage, slug) }
    setPrefs(next)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch { /* ignore */ }
  }

  // Stats
  const allItems: { actor: string; stage: string; item: AutomationItem }[] = []
  for (const [actor, stages] of Object.entries(AUTOMATIONS)) {
    for (const [stage, items] of Object.entries(stages)) {
      for (const item of items) allItems.push({ actor, stage, item })
    }
  }
  const toggleable = allItems.filter(x => !x.item.fixed)
  const activeCount  = toggleable.filter(x => isOn(x.actor, x.stage, x.item.slug)).length
  const totalCount   = toggleable.length
  const emailCount   = toggleable.filter(x => x.item.type === 'email').length
  const cronCount    = toggleable.filter(x => x.item.type === 'cron').length

  return (
    <div className="px-4 sm:px-6 py-8 space-y-6 min-h-full">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#1a1918]">Automations</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Cross-table: actors (rows) × pipeline stages (columns). Toggle each automation on/off.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Active',  value: activeCount,  cls: 'text-[#1a1918]' },
          { label: 'Total',   value: totalCount,   cls: 'text-zinc-400' },
          { label: 'Emails',  value: emailCount,   cls: 'text-green-600' },
          { label: 'Crons',   value: cronCount,    cls: 'text-violet-600' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-zinc-100 rounded-2xl p-4 text-center">
            <p className={`text-2xl font-bold ${s.cls}`}>{s.value}</p>
            <p className="text-xs text-zinc-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 text-xs">
        {(Object.entries(TYPE_STYLE) as [AutomationType, typeof TYPE_STYLE[AutomationType]][]).map(([type, s]) => (
          <span key={type} className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg ${s.bg}`}>
            <span>{s.icon}</span> {s.label}
          </span>
        ))}
        <span className="text-zinc-400 self-center ml-1">⏳ Always on = auto-created, not toggleable</span>
      </div>

      {/* Matrix */}
      <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
        <table className="w-full border-collapse text-xs" style={{ minWidth: `${STAGES.length * 120 + 140}px` }}>
          <thead>
            <tr>
              {/* Actor header */}
              <th className="w-36 bg-zinc-50 border-b border-r border-zinc-200 px-3 py-3 text-left text-[10px] font-bold text-zinc-400 uppercase tracking-wider sticky left-0 z-10">
                Actor / Stage
              </th>
              {STAGES.map(stage => (
                <th key={stage.id} className="border-b border-r border-zinc-100 px-2 py-0 align-top min-w-[110px]">
                  <div className="h-0.5 w-full mb-2 rounded-full" style={{ backgroundColor: stage.color }} />
                  <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-wide pb-2 px-1 whitespace-nowrap">
                    {stage.label}
                  </p>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ACTORS.map((actor, actorIdx) => (
              <tr key={actor.id} className={actorIdx % 2 === 0 ? 'bg-white' : 'bg-zinc-50/50'}>
                {/* Actor label */}
                <td className="border-r border-zinc-200 px-3 py-3 align-top sticky left-0 z-10 bg-inherit">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: actor.color }} />
                    <span className="font-semibold text-[#1a1918] text-xs whitespace-nowrap">{actor.label}</span>
                  </div>
                </td>

                {STAGES.map(stage => {
                  const items = AUTOMATIONS[actor.id]?.[stage.id] ?? []
                  return (
                    <td
                      key={stage.id}
                      className={[
                        'border-r border-zinc-100 px-2 py-2 align-top',
                        items.length === 0 ? 'bg-zinc-50/80' : '',
                      ].join(' ')}
                    >
                      {items.length === 0 ? (
                        <div className="h-4" />
                      ) : (
                        <div className="space-y-1.5">
                          {items.map(item => {
                            const style = TYPE_STYLE[item.type]
                            const on = item.fixed ? true : isOn(actor.id, stage.id, item.slug)
                            return (
                              <div
                                key={item.slug}
                                className={[
                                  'rounded-lg px-2 py-1.5 transition-opacity',
                                  style.bg,
                                  !on ? 'opacity-40' : '',
                                ].join(' ')}
                              >
                                <div className="flex items-start justify-between gap-1">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1 flex-wrap">
                                      <span>{style.icon}</span>
                                      <span className="font-medium text-[#1a1918] leading-tight">{item.label}</span>
                                    </div>
                                    {item.type === 'email' && (
                                      <Link
                                        href={`/fr/settings/email-templates`}
                                        target="_blank"
                                        className="text-[#c8a96e] hover:underline text-[9px] leading-none mt-0.5 block"
                                      >
                                        {item.slug} →
                                      </Link>
                                    )}
                                  </div>
                                  {item.fixed ? (
                                    <span className="text-[8px] font-bold px-1 py-0.5 bg-amber-100 text-amber-700 rounded flex-shrink-0 whitespace-nowrap">
                                      Always on
                                    </span>
                                  ) : (
                                    <button
                                      onClick={() => toggle(actor.id, stage.id, item.slug)}
                                      className={[
                                        'relative inline-flex h-4 w-7 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-150 mt-0.5',
                                        on ? 'bg-[#c8a96e]' : 'bg-zinc-300',
                                      ].join(' ')}
                                      title={on ? 'Disable' : 'Enable'}
                                    >
                                      <span className={[
                                        'pointer-events-none inline-block h-3 w-3 rounded-full bg-white shadow transform transition-transform duration-150',
                                        on ? 'translate-x-3' : 'translate-x-0',
                                      ].join(' ')} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
