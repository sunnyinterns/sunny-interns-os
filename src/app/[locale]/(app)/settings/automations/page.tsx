'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

type AutomationType = 'email' | 'internal' | 'cron' | 'waiting'

interface Automation {
  key: string
  type: AutomationType
  icon: string
  label: string
  desc: string
  trigger: string
  template_slug?: string
  toggleable: boolean
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
      {
        key: 'notif_new_lead', type: 'internal', icon: '🔔',
        label: 'New application alert',
        desc: 'Creates an admin notification when a new application is received',
        trigger: 'Fires immediately on new /apply submission',
        toggleable: true, default: true,
      },
    ],
  },
  {
    stage: 'rdv_booked',
    label: 'RDV Booked',
    color: '#3b82f6',
    automations: [
      {
        key: 'email_booking_confirmation', type: 'email', icon: '📧',
        label: 'Interview confirmation to intern',
        desc: 'Sends booking_confirmation with Google Meet link',
        trigger: 'Fires immediately when status → rdv_booked',
        template_slug: 'booking_confirmation',
        toggleable: true, default: true,
      },
      {
        key: 'email_rdv_reminder', type: 'cron', icon: '⏰',
        label: 'Interview reminder (J-1)',
        desc: 'Sends rdv_reminder email the day before the interview',
        trigger: 'Cron: J-1 before intern_first_meeting_date',
        template_slug: 'rdv_reminder',
        toggleable: true, default: true,
      },
    ],
  },
  {
    stage: 'qualification_done',
    label: 'Qualification Done',
    color: '#8b5cf6',
    automations: [
      {
        key: 'email_qualification_recap', type: 'email', icon: '📧',
        label: 'Qualification recap to intern',
        desc: 'Sends qualification_recap after the interview debrief',
        trigger: 'Fires immediately when status → qualification_done',
        template_slug: 'qualification_recap',
        toggleable: true, default: true,
      },
      {
        key: 'email_welcome_portal', type: 'email', icon: '📧',
        label: 'Portal access + credentials',
        desc: 'Sends portal login (temp_password) to intern',
        trigger: 'Fires immediately when status → qualification_done',
        template_slug: 'welcome_portal',
        toggleable: true, default: true,
      },
      {
        key: 'waiting_engagement_letter', type: 'waiting', icon: '⏳',
        label: 'En Attente: engagement letter',
        desc: 'Creates a waiting item (intern) for engagement letter signature',
        trigger: 'Auto-created when status → qualification_done',
        toggleable: false, default: true,
      },
    ],
  },
  {
    stage: 'job_submitted',
    label: 'Job Submitted',
    color: '#f59e0b',
    automations: [
      {
        key: 'email_job_submitted_employer', type: 'email', icon: '📧',
        label: 'CV to employer',
        desc: 'Sends candidate profile to employer contact',
        trigger: 'Fires immediately on "Send to employer" button click',
        template_slug: 'job_submitted_employer',
        toggleable: true, default: true,
      },
      {
        key: 'email_new_job_alert', type: 'email', icon: '📧',
        label: 'Job opportunity to intern',
        desc: 'Notifies intern that their CV was submitted',
        trigger: 'Fires immediately on "Send to employer" button click',
        template_slug: 'new_job_alert',
        toggleable: true, default: true,
      },
      {
        key: 'waiting_employer_response', type: 'waiting', icon: '⏳',
        label: 'En Attente: employer response',
        desc: 'Creates a waiting item (employer) until employer decision comes in',
        trigger: 'Auto-created when CV is sent to employer',
        toggleable: false, default: true,
      },
    ],
  },
  {
    stage: 'job_retained',
    label: 'Job Retained',
    color: '#10b981',
    automations: [
      {
        key: 'email_convention_request', type: 'email', icon: '📧',
        label: 'Convention request to intern',
        desc: 'Asks intern to get the internship agreement from their school',
        trigger: 'Fires immediately when status → job_retained',
        template_slug: 'convention_request',
        toggleable: true, default: true,
      },
      {
        key: 'waiting_convention', type: 'waiting', icon: '⏳',
        label: 'En Attente: internship convention',
        desc: 'Creates a waiting item (school) for convention signature',
        trigger: 'Auto-created when status → job_retained',
        toggleable: false, default: true,
      },
    ],
  },
  {
    stage: 'convention_signed',
    label: 'Convention Signed',
    color: '#10b981',
    automations: [
      {
        key: 'email_sponsor_contract', type: 'email', icon: '📧',
        label: 'Sponsor contract to employer',
        desc: 'Auto-sends sponsor contract to employer when convention is signed',
        trigger: 'Fires immediately when status → convention_signed',
        template_slug: 'sponsor_contract_employer',
        toggleable: true, default: true,
      },
      {
        key: 'email_payment_request', type: 'email', icon: '📧',
        label: 'Invoice to intern',
        desc: 'Sends payment request with IBAN details',
        trigger: 'Fires immediately when status → convention_signed',
        template_slug: 'payment_request',
        toggleable: true, default: true,
      },
      {
        key: 'notif_convention_signed', type: 'internal', icon: '🔔',
        label: 'Convention signed — internal notification',
        desc: 'Creates an admin notification so manager can track',
        trigger: 'Fires immediately when status → convention_signed',
        toggleable: true, default: true,
      },
    ],
  },
  {
    stage: 'payment_received',
    label: 'Payment Received',
    color: '#10b981',
    automations: [
      {
        key: 'email_payment_confirmed', type: 'email', icon: '📧',
        label: 'Payment confirmation to intern',
        desc: 'Confirms receipt and explains visa next steps',
        trigger: 'Fires immediately when status → payment_received',
        template_slug: 'payment_confirmed',
        toggleable: true, default: true,
      },
      {
        key: 'email_visa_docs_request', type: 'email', icon: '📧',
        label: 'Visa documents request to intern',
        desc: 'Asks intern to upload visa documents in the portal',
        trigger: 'Fires immediately when status → payment_received',
        template_slug: 'visa_docs_request',
        toggleable: true, default: true,
      },
      {
        key: 'waiting_visa_docs', type: 'waiting', icon: '⏳',
        label: 'En Attente: visa documents',
        desc: 'Creates a waiting item (intern) for visa doc upload',
        trigger: 'Auto-created when status → payment_received',
        toggleable: false, default: true,
      },
      {
        key: 'notif_payment_received', type: 'internal', icon: '🔔',
        label: 'Payment received — internal notification',
        desc: 'Creates an admin notification so manager can validate',
        trigger: 'Fires immediately when status → payment_received',
        toggleable: true, default: true,
      },
    ],
  },
  {
    stage: 'visa_in_progress',
    label: 'Visa In Progress',
    color: '#f97316',
    automations: [
      {
        key: 'email_visa_agent_submission', type: 'email', icon: '📧',
        label: 'Visa dossier to agent',
        desc: 'Sends full visa dossier to the visa agent (🔏 Agent email)',
        trigger: 'Fires immediately when status → visa_in_progress',
        template_slug: 'visa_agent_submission',
        toggleable: true, default: true,
      },
      {
        key: 'email_visa_submitted', type: 'email', icon: '📧',
        label: 'Submission confirmation to intern',
        desc: 'Tells intern the dossier is submitted and gives timeline',
        trigger: 'Fires immediately when status → visa_in_progress',
        template_slug: 'visa_submitted',
        toggleable: true, default: true,
      },
      {
        key: 'waiting_visa_agent', type: 'waiting', icon: '⏳',
        label: 'En Attente: visa processing',
        desc: 'Creates a waiting item (agent) while visa is processing',
        trigger: 'Auto-created when status → visa_in_progress',
        toggleable: false, default: true,
      },
    ],
  },
  {
    stage: 'visa_received',
    label: 'Visa Received',
    color: '#10b981',
    automations: [
      {
        key: 'email_visa_received', type: 'email', icon: '📧',
        label: 'Visa approval to intern',
        desc: 'Sends visa approval with download link',
        trigger: 'Fires immediately when status → visa_received',
        template_slug: 'visa_received',
        toggleable: true, default: true,
      },
      {
        key: 'notif_visa_received', type: 'internal', icon: '🔔',
        label: 'Visa received — internal notification',
        desc: 'Creates an admin notification to confirm visa is in hand',
        trigger: 'Fires immediately when status → visa_received',
        toggleable: true, default: true,
      },
    ],
  },
  {
    stage: 'arrival_prep',
    label: 'Pre-Departure (J-14)',
    color: '#c8a96e',
    automations: [
      {
        key: 'email_arrival_prep', type: 'email', icon: '📧',
        label: 'Bali arrival guide to intern',
        desc: 'Sends complete Bali arrival checklist when status reaches arrival_prep',
        trigger: 'Fires immediately when status → arrival_prep',
        template_slug: 'arrival_prep',
        toggleable: true, default: true,
      },
      {
        key: 'cron_all_indonesia_j3', type: 'cron', icon: '⏰',
        label: 'All Indonesia app reminder (J-3)',
        desc: 'Reminds intern to download All Indonesia app before arrival',
        trigger: 'Cron: J-3 before desired_start_date',
        template_slug: 'all_indonesia_j3',
        toggleable: true, default: true,
      },
      {
        key: 'email_driver_notification', type: 'email', icon: '📧',
        label: 'Airport transfer notification to driver',
        desc: 'Notifies driver partner with flight details for pickup',
        trigger: 'Fires immediately when flight_number is saved',
        template_slug: 'driver_notification',
        toggleable: true, default: true,
      },
      {
        key: 'email_welcome_kit', type: 'email', icon: '📧',
        label: 'Welcome to Bali (J0)',
        desc: 'Auto-sent on actual_start_date to welcome intern',
        trigger: 'Cron: J0 = actual_start_date',
        template_slug: 'welcome_kit',
        toggleable: true, default: true,
      },
      {
        key: 'waiting_flight_info', type: 'waiting', icon: '⏳',
        label: 'En Attente: flight info',
        desc: 'Creates a waiting item (intern) if no flight details entered',
        trigger: 'Auto-created when flight_number is missing at arrival_prep',
        toggleable: false, default: true,
      },
    ],
  },
  {
    stage: 'active',
    label: 'Active (Internship)',
    color: '#0ea5e9',
    automations: [
      {
        key: 'cron_touchpoint_j3', type: 'cron', icon: '⏰',
        label: 'D+3 check-in',
        desc: 'First check-in 3 days after start — how is everything going?',
        trigger: 'Cron: D+3 after actual_start_date',
        template_slug: 'touchpoint_j3',
        toggleable: true, default: true,
      },
      {
        key: 'cron_touchpoint_j30', type: 'cron', icon: '⏰',
        label: 'D+30 check-in',
        desc: 'Month check-in — gathering feedback and spotting issues early',
        trigger: 'Cron: D+30 after actual_start_date',
        template_slug: 'touchpoint_j30',
        toggleable: true, default: true,
      },
      {
        key: 'cron_touchpoint_j60', type: 'cron', icon: '⏰',
        label: 'D+60 check-in',
        desc: 'Mid-internship check-in for longer placements',
        trigger: 'Cron: D+60 after actual_start_date',
        template_slug: 'touchpoint_j60',
        toggleable: true, default: true,
      },
      {
        key: 'cron_touchpoint_end', type: 'cron', icon: '⏰',
        label: 'End of internship notice (J-14)',
        desc: 'Reminds intern of return logistics and asks for testimonial',
        trigger: 'Cron: J-14 before actual_end_date',
        template_slug: 'touchpoint_end',
        toggleable: true, default: true,
      },
    ],
  },
  {
    stage: 'alumni',
    label: 'Alumni',
    color: '#6b7280',
    automations: [
      {
        key: 'email_alumni_welcome', type: 'email', icon: '📧',
        label: 'Alumni welcome email',
        desc: 'Welcome to the alumni community + next steps',
        trigger: 'Fires immediately when status → alumni',
        template_slug: 'alumni_welcome',
        toggleable: true, default: true,
      },
      {
        key: 'email_ugc_thank_you', type: 'email', icon: '📧',
        label: 'Testimonial thank-you',
        desc: 'Thank intern after submitting a review or testimonial',
        trigger: 'Fires when testimonial is submitted via portal',
        template_slug: 'ugc_thank_you',
        toggleable: true, default: true,
      },
    ],
  },
]

const STORAGE_KEY = 'automation_settings'

const TYPE_BADGE: Record<AutomationType, { label: string; cls: string }> = {
  email:    { label: 'Email',      cls: 'bg-blue-100 text-blue-700' },
  internal: { label: 'Internal',   cls: 'bg-zinc-100 text-zinc-600' },
  cron:     { label: 'Scheduled',  cls: 'bg-amber-100 text-amber-700' },
  waiting:  { label: 'En Attente', cls: 'bg-purple-100 text-purple-700' },
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
        const defaults: Record<string, boolean> = {}
        for (const group of AUTOMATIONS_BY_STAGE) {
          for (const a of group.automations) {
            if (a.toggleable) defaults[a.key] = a.default
          }
        }
        setPrefs(defaults)
      }
    } catch { /* ignore */ }
    setMounted(true)
  }, [])

  function isEnabled(key: string, defaultVal: boolean): boolean {
    if (!mounted) return defaultVal
    return key in prefs ? !!prefs[key] : defaultVal
  }

  function toggle(key: string, defaultVal: boolean) {
    const next = { ...prefs, [key]: !isEnabled(key, defaultVal) }
    setPrefs(next)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch { /* ignore */ }
  }

  const toggleableAll = AUTOMATIONS_BY_STAGE.flatMap(g => g.automations.filter(a => a.toggleable))
  const totalCount = toggleableAll.length
  const activeCount = toggleableAll.filter(a => isEnabled(a.key, a.default)).length

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1a1918]">Automations</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Control which emails and notifications fire automatically at each stage. Changes take effect immediately.
        </p>
      </div>

      {/* Stats bar */}
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

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {(Object.entries(TYPE_BADGE) as [AutomationType, { label: string; cls: string }][]).map(([type, badge]) => (
          <div key={type} className="flex items-center gap-1.5">
            <span className="text-sm">
              {type === 'email' ? '📧' : type === 'internal' ? '🔔' : type === 'cron' ? '⏰' : '⏳'}
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
          </div>
        ))}
        <span className="text-xs text-zinc-400 self-center">⏳ En Attente items are always auto-created (not toggleable)</span>
      </div>

      {/* Stages */}
      {AUTOMATIONS_BY_STAGE.map(group => {
        const groupToggleable = group.automations.filter(a => a.toggleable)
        const groupActive = groupToggleable.filter(a => isEnabled(a.key, a.default)).length
        return (
          <div key={group.stage} className="bg-white border border-zinc-100 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-50">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: group.color }} />
                <span className="text-sm font-semibold text-[#1a1918]">{group.label}</span>
              </div>
              {groupToggleable.length > 0 && (
                <span className="text-xs text-zinc-400">
                  {groupActive}/{groupToggleable.length} active
                </span>
              )}
            </div>

            <div className="divide-y divide-zinc-50">
              {group.automations.map(auto => {
                const enabled = auto.toggleable ? isEnabled(auto.key, auto.default) : true
                const badge = TYPE_BADGE[auto.type]
                return (
                  <div key={auto.key} className={`flex items-start gap-3 px-5 py-3.5 ${!auto.toggleable ? 'opacity-70' : ''}`}>
                    <span className="text-lg flex-shrink-0 mt-0.5">{auto.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center flex-wrap gap-2">
                        <span className="text-sm font-medium text-[#1a1918]">{auto.label}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5">{auto.desc}</p>
                      <p className="text-[11px] text-zinc-300 mt-0.5 italic">{auto.trigger}</p>
                      {auto.template_slug && (
                        <Link
                          href={`/${locale}/settings/email-templates`}
                          className="text-xs text-[#c8a96e] hover:underline mt-0.5 inline-block"
                        >
                          View template →
                        </Link>
                      )}
                    </div>
                    {auto.toggleable ? (
                      <button
                        onClick={() => toggle(auto.key, auto.default)}
                        aria-label={enabled ? 'Disable' : 'Enable'}
                        className={[
                          'relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 mt-0.5',
                          enabled ? 'bg-[#c8a96e]' : 'bg-zinc-200',
                        ].join(' ')}
                      >
                        <span className={[
                          'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform duration-200',
                          enabled ? 'translate-x-4' : 'translate-x-0',
                        ].join(' ')} />
                      </button>
                    ) : (
                      <span className="text-[10px] text-zinc-300 mt-1 flex-shrink-0">always on</span>
                    )}
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
