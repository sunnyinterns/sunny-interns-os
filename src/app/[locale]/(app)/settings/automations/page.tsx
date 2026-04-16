'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

type AutomationType = 'email' | 'internal' | 'cron'

interface Automation {
  key: string
  type: AutomationType
  label: string
  desc: string
  template_slug?: string
  default: boolean
}

interface StageGroup {
  stage: string
  label: string
  color: string
  automations: Automation[]
}

const AUTOMATIONS_BY_STAGE: StageGroup[] = [
  {
    stage: 'lead',
    label: 'Lead',
    color: '#6b7280',
    automations: [
      { key: 'notif_new_lead', type: 'internal', label: 'New lead notification', desc: 'Slack/email to manager when a new application is received', default: true },
    ],
  },
  {
    stage: 'rdv_booked',
    label: 'RDV Booked',
    color: '#3b82f6',
    automations: [
      { key: 'email_booking_confirmation', type: 'email', label: 'Booking confirmation to intern', desc: 'Sends booking_confirmation email with Google Meet link', template_slug: 'booking_confirmation', default: true },
      { key: 'email_rdv_reminder', type: 'email', label: 'Interview reminder (J-1)', desc: 'Sends rdv_reminder email the day before', template_slug: 'rdv_reminder', default: true },
    ],
  },
  {
    stage: 'qualification_done',
    label: 'Qualification Done',
    color: '#8b5cf6',
    automations: [
      { key: 'email_qualification_recap', type: 'email', label: 'Qualification recap to intern', desc: 'Sends qualification_recap after the interview', template_slug: 'qualification_recap', default: true },
      { key: 'email_welcome_portal', type: 'email', label: 'Portal access email', desc: 'Sends portal login credentials', template_slug: 'welcome_portal', default: true },
    ],
  },
  {
    stage: 'job_submitted',
    label: 'Job Submitted',
    color: '#f59e0b',
    automations: [
      { key: 'email_job_submitted_employer', type: 'email', label: 'CV submission to employer', desc: 'Sends candidate profile to employer', template_slug: 'job_submitted_employer', default: true },
      { key: 'email_new_job_alert', type: 'email', label: 'Job opportunity to intern', desc: 'Notifies intern of the submission', template_slug: 'new_job_alert', default: true },
    ],
  },
  {
    stage: 'convention_signed',
    label: 'Convention Signed',
    color: '#10b981',
    automations: [
      { key: 'email_sponsor_contract', type: 'email', label: 'Sponsor contract to employer', desc: 'Auto-sends sponsor contract when convention is signed', template_slug: 'sponsor_contract_employer', default: true },
      { key: 'email_payment_request', type: 'email', label: 'Invoice to intern', desc: 'Sends payment request with IBAN details', template_slug: 'payment_request', default: true },
    ],
  },
  {
    stage: 'payment_received',
    label: 'Payment Received',
    color: '#10b981',
    automations: [
      { key: 'email_payment_confirmed', type: 'email', label: 'Payment confirmation to intern', desc: 'Confirms receipt and explains next steps', template_slug: 'payment_confirmed', default: true },
      { key: 'email_visa_docs_request', type: 'email', label: 'Visa documents request to intern', desc: 'Asks intern to upload visa documents', template_slug: 'visa_docs_request', default: true },
    ],
  },
  {
    stage: 'visa_in_progress',
    label: 'Visa In Progress',
    color: '#f97316',
    automations: [
      { key: 'email_visa_agent_submission', type: 'email', label: 'Dossier to visa agent', desc: 'Sends full visa dossier to the agent', template_slug: 'visa_agent_submission', default: true },
      { key: 'email_visa_submitted', type: 'email', label: 'Visa submission confirmation to intern', desc: 'Tells intern the dossier is submitted', template_slug: 'visa_submitted', default: true },
    ],
  },
  {
    stage: 'visa_received',
    label: 'Visa Received',
    color: '#10b981',
    automations: [
      { key: 'email_visa_received', type: 'email', label: 'Visa approval to intern', desc: 'Sends visa approval with download link', template_slug: 'visa_received', default: true },
    ],
  },
  {
    stage: 'arrival_prep',
    label: 'Pre-Departure (J-14)',
    color: '#c8a96e',
    automations: [
      { key: 'email_arrival_prep', type: 'email', label: 'Arrival guide to intern', desc: 'Sends complete Bali arrival checklist', template_slug: 'arrival_prep', default: true },
      { key: 'cron_all_indonesia_j3', type: 'cron', label: 'All Indonesia app reminder (J-3)', desc: 'Auto-sends J-3 departure reminder', template_slug: 'all_indonesia_j3', default: true },
    ],
  },
  {
    stage: 'active',
    label: 'Active (Internship)',
    color: '#0ea5e9',
    automations: [
      { key: 'cron_touchpoint_j3', type: 'cron', label: 'D+3 check-in', desc: 'Auto-sent 3 days after internship start', template_slug: 'touchpoint_j3', default: true },
      { key: 'cron_touchpoint_j30', type: 'cron', label: 'D+30 check-in', desc: 'Auto-sent 30 days after start', template_slug: 'touchpoint_j30', default: true },
      { key: 'cron_touchpoint_j60', type: 'cron', label: 'D+60 check-in', desc: 'Auto-sent 60 days after start', template_slug: 'touchpoint_j60', default: true },
      { key: 'cron_touchpoint_end', type: 'cron', label: 'End of internship notice', desc: 'Auto-sent 14 days before end date', template_slug: 'touchpoint_end', default: true },
    ],
  },
]

const STORAGE_KEY = 'automation_settings'

const TYPE_BADGE: Record<AutomationType, { label: string; cls: string }> = {
  email: { label: 'Email', cls: 'bg-blue-100 text-blue-700' },
  internal: { label: 'Internal', cls: 'bg-zinc-100 text-zinc-600' },
  cron: { label: 'Scheduled', cls: 'bg-amber-100 text-amber-700' },
}

const TYPE_ICON: Record<AutomationType, string> = {
  email: '📧',
  internal: '🔔',
  cron: '⏰',
}

export default function AutomationsPage() {
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'fr'

  const [prefs, setPrefs] = useState<Record<string, boolean>>({})
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        setPrefs(JSON.parse(raw) as Record<string, boolean>)
      } else {
        // Init with defaults
        const defaults: Record<string, boolean> = {}
        for (const group of AUTOMATIONS_BY_STAGE) {
          for (const a of group.automations) {
            defaults[a.key] = a.default
          }
        }
        setPrefs(defaults)
      }
    } catch {
      // ignore
    }
    setMounted(true)
  }, [])

  function isEnabled(key: string, defaultVal: boolean): boolean {
    if (!mounted) return defaultVal
    return key in prefs ? !!prefs[key] : defaultVal
  }

  function toggle(key: string, defaultVal: boolean) {
    const current = isEnabled(key, defaultVal)
    const next = { ...prefs, [key]: !current }
    setPrefs(next)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // ignore
    }
  }

  const totalCount = AUTOMATIONS_BY_STAGE.reduce((s, g) => s + g.automations.length, 0)
  const activeCount = AUTOMATIONS_BY_STAGE.reduce(
    (s, g) => s + g.automations.filter(a => isEnabled(a.key, a.default)).length,
    0,
  )

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#1a1918]">Automations</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Control which emails and notifications fire automatically at each stage. Changes take effect immediately.
        </p>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 p-4 bg-white border border-zinc-100 rounded-2xl">
        <div className="text-center">
          <p className="text-2xl font-bold text-[#1a1918]">{activeCount}</p>
          <p className="text-xs text-zinc-400">active</p>
        </div>
        <div className="h-8 w-px bg-zinc-100" />
        <div className="text-center">
          <p className="text-2xl font-bold text-zinc-300">{totalCount}</p>
          <p className="text-xs text-zinc-400">total</p>
        </div>
        <div className="flex-1" />
        <div className="h-2 flex-1 max-w-48 bg-zinc-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#c8a96e] rounded-full transition-all"
            style={{ width: `${totalCount > 0 ? Math.round((activeCount / totalCount) * 100) : 0}%` }}
          />
        </div>
      </div>

      {/* Stages */}
      {AUTOMATIONS_BY_STAGE.map(group => {
        const groupActive = group.automations.filter(a => isEnabled(a.key, a.default)).length
        return (
          <div key={group.stage} className="bg-white border border-zinc-100 rounded-2xl overflow-hidden">
            {/* Stage header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-50">
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: group.color }}
                />
                <span className="text-sm font-semibold text-[#1a1918]">{group.label}</span>
              </div>
              <span className="text-xs text-zinc-400">
                {groupActive}/{group.automations.length} active
              </span>
            </div>

            {/* Automations */}
            <div className="divide-y divide-zinc-50">
              {group.automations.map(auto => {
                const enabled = isEnabled(auto.key, auto.default)
                const badge = TYPE_BADGE[auto.type]
                return (
                  <div key={auto.key} className="flex items-center gap-4 px-5 py-3.5">
                    <span className="text-lg flex-shrink-0">{TYPE_ICON[auto.type]}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center flex-wrap gap-2">
                        <span className="text-sm font-medium text-[#1a1918]">{auto.label}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5">{auto.desc}</p>
                      {auto.template_slug && (
                        <Link
                          href={`/${locale}/settings/email-templates`}
                          className="text-xs text-[#c8a96e] hover:underline mt-0.5 inline-block"
                        >
                          View template →
                        </Link>
                      )}
                    </div>
                    {/* Toggle */}
                    <button
                      onClick={() => toggle(auto.key, auto.default)}
                      aria-label={enabled ? 'Disable' : 'Enable'}
                      className={[
                        'relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200',
                        enabled ? 'bg-[#c8a96e]' : 'bg-zinc-200',
                      ].join(' ')}
                    >
                      <span
                        className={[
                          'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform duration-200',
                          enabled ? 'translate-x-4' : 'translate-x-0',
                        ].join(' ')}
                      />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
