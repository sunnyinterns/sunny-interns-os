'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'


// ─── Lang helper ────────────────────────────────────────────────────────────
function T(fr: string, en: string, lang: 'fr'|'en') { return lang === 'fr' ? fr : en }

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────

const ANGLOPHONE_COUNTRIES = [
  'United Kingdom', 'United States', 'Canada', 'Australia',
  'Ireland', 'New Zealand', 'Singapore', 'South Africa',
]

const COUNTRY_PHONE_CODES: { flag: string; code: string; name: string }[] = [
  { flag: '\u{1F1EB}\u{1F1F7}', code: '+33', name: 'France' },
  { flag: '\u{1F1EC}\u{1F1E7}', code: '+44', name: 'United Kingdom' },
  { flag: '\u{1F1FA}\u{1F1F8}', code: '+1', name: 'United States' },
  { flag: '\u{1F1E9}\u{1F1EA}', code: '+49', name: 'Germany' },
  { flag: '\u{1F1EA}\u{1F1F8}', code: '+34', name: 'Spain' },
  { flag: '\u{1F1EE}\u{1F1F9}', code: '+39', name: 'Italy' },
  { flag: '\u{1F1F5}\u{1F1F9}', code: '+351', name: 'Portugal' },
  { flag: '\u{1F1E7}\u{1F1EA}', code: '+32', name: 'Belgium' },
  { flag: '\u{1F1E8}\u{1F1ED}', code: '+41', name: 'Switzerland' },
  { flag: '\u{1F1F3}\u{1F1F1}', code: '+31', name: 'Netherlands' },
  { flag: '\u{1F1E6}\u{1F1F9}', code: '+43', name: 'Austria' },
  { flag: '\u{1F1F5}\u{1F1F1}', code: '+48', name: 'Poland' },
  { flag: '\u{1F1F7}\u{1F1F4}', code: '+40', name: 'Romania' },
  { flag: '\u{1F1E8}\u{1F1FF}', code: '+420', name: 'Czech Republic' },
  { flag: '\u{1F1ED}\u{1F1FA}', code: '+36', name: 'Hungary' },
  { flag: '\u{1F1F8}\u{1F1EA}', code: '+46', name: 'Sweden' },
  { flag: '\u{1F1F3}\u{1F1F4}', code: '+47', name: 'Norway' },
  { flag: '\u{1F1E9}\u{1F1F0}', code: '+45', name: 'Denmark' },
  { flag: '\u{1F1EB}\u{1F1EE}', code: '+358', name: 'Finland' },
  { flag: '\u{1F1EE}\u{1F1EA}', code: '+353', name: 'Ireland' },
  { flag: '\u{1F1EC}\u{1F1F7}', code: '+30', name: 'Greece' },
  { flag: '\u{1F1ED}\u{1F1F7}', code: '+385', name: 'Croatia' },
  { flag: '\u{1F1E7}\u{1F1EC}', code: '+359', name: 'Bulgaria' },
  { flag: '\u{1F1F7}\u{1F1F8}', code: '+381', name: 'Serbia' },
  { flag: '\u{1F1F8}\u{1F1F0}', code: '+421', name: 'Slovakia' },
  { flag: '\u{1F1F8}\u{1F1EE}', code: '+386', name: 'Slovenia' },
  { flag: '\u{1F1F1}\u{1F1F9}', code: '+370', name: 'Lithuania' },
  { flag: '\u{1F1F1}\u{1F1FB}', code: '+371', name: 'Latvia' },
  { flag: '\u{1F1EA}\u{1F1EA}', code: '+372', name: 'Estonia' },
  { flag: '\u{1F1E8}\u{1F1E6}', code: '+1', name: 'Canada' },
  { flag: '\u{1F1F2}\u{1F1FD}', code: '+52', name: 'Mexico' },
  { flag: '\u{1F1E7}\u{1F1F7}', code: '+55', name: 'Brazil' },
  { flag: '\u{1F1E6}\u{1F1F7}', code: '+54', name: 'Argentina' },
  { flag: '\u{1F1E8}\u{1F1F4}', code: '+57', name: 'Colombia' },
  { flag: '\u{1F1E8}\u{1F1F1}', code: '+56', name: 'Chile' },
  { flag: '\u{1F1F5}\u{1F1EA}', code: '+51', name: 'Peru' },
  { flag: '\u{1F1FB}\u{1F1EA}', code: '+58', name: 'Venezuela' },
  { flag: '\u{1F1EA}\u{1F1E8}', code: '+593', name: 'Ecuador' },
  { flag: '\u{1F1E7}\u{1F1F4}', code: '+591', name: 'Bolivia' },
  { flag: '\u{1F1FA}\u{1F1FE}', code: '+598', name: 'Uruguay' },
  { flag: '\u{1F1F5}\u{1F1FE}', code: '+595', name: 'Paraguay' },
  { flag: '\u{1F1E6}\u{1F1FA}', code: '+61', name: 'Australia' },
  { flag: '\u{1F1F3}\u{1F1FF}', code: '+64', name: 'New Zealand' },
  { flag: '\u{1F1EF}\u{1F1F5}', code: '+81', name: 'Japan' },
  { flag: '\u{1F1F0}\u{1F1F7}', code: '+82', name: 'South Korea' },
  { flag: '\u{1F1E8}\u{1F1F3}', code: '+86', name: 'China' },
  { flag: '\u{1F1EE}\u{1F1F3}', code: '+91', name: 'India' },
  { flag: '\u{1F1EE}\u{1F1E9}', code: '+62', name: 'Indonesia' },
  { flag: '\u{1F1F9}\u{1F1ED}', code: '+66', name: 'Thailand' },
  { flag: '\u{1F1FB}\u{1F1F3}', code: '+84', name: 'Vietnam' },
  { flag: '\u{1F1F5}\u{1F1ED}', code: '+63', name: 'Philippines' },
  { flag: '\u{1F1F2}\u{1F1FE}', code: '+60', name: 'Malaysia' },
  { flag: '\u{1F1F8}\u{1F1EC}', code: '+65', name: 'Singapore' },
  { flag: '\u{1F1F9}\u{1F1FC}', code: '+886', name: 'Taiwan' },
  { flag: '\u{1F1ED}\u{1F1F0}', code: '+852', name: 'Hong Kong' },
  { flag: '\u{1F1F5}\u{1F1F0}', code: '+92', name: 'Pakistan' },
  { flag: '\u{1F1E7}\u{1F1E9}', code: '+880', name: 'Bangladesh' },
  { flag: '\u{1F1F1}\u{1F1F0}', code: '+94', name: 'Sri Lanka' },
  { flag: '\u{1F1F3}\u{1F1F5}', code: '+977', name: 'Nepal' },
  { flag: '\u{1F1F2}\u{1F1F2}', code: '+95', name: 'Myanmar' },
  { flag: '\u{1F1F0}\u{1F1ED}', code: '+855', name: 'Cambodia' },
  { flag: '\u{1F1F1}\u{1F1E6}', code: '+856', name: 'Laos' },
  { flag: '\u{1F1F2}\u{1F1F3}', code: '+976', name: 'Mongolia' },
  { flag: '\u{1F1E6}\u{1F1EA}', code: '+971', name: 'UAE' },
  { flag: '\u{1F1F8}\u{1F1E6}', code: '+966', name: 'Saudi Arabia' },
  { flag: '\u{1F1F6}\u{1F1E6}', code: '+974', name: 'Qatar' },
  { flag: '\u{1F1F0}\u{1F1FC}', code: '+965', name: 'Kuwait' },
  { flag: '\u{1F1E7}\u{1F1ED}', code: '+973', name: 'Bahrain' },
  { flag: '\u{1F1F4}\u{1F1F2}', code: '+968', name: 'Oman' },
  { flag: '\u{1F1EF}\u{1F1F4}', code: '+962', name: 'Jordan' },
  { flag: '\u{1F1F1}\u{1F1E7}', code: '+961', name: 'Lebanon' },
  { flag: '\u{1F1EE}\u{1F1F1}', code: '+972', name: 'Israel' },
  { flag: '\u{1F1F9}\u{1F1F7}', code: '+90', name: 'Turkey' },
  { flag: '\u{1F1EE}\u{1F1F7}', code: '+98', name: 'Iran' },
  { flag: '\u{1F1EE}\u{1F1F6}', code: '+964', name: 'Iraq' },
  { flag: '\u{1F1EA}\u{1F1EC}', code: '+20', name: 'Egypt' },
  { flag: '\u{1F1F2}\u{1F1E6}', code: '+212', name: 'Morocco' },
  { flag: '\u{1F1E9}\u{1F1FF}', code: '+213', name: 'Algeria' },
  { flag: '\u{1F1F9}\u{1F1F3}', code: '+216', name: 'Tunisia' },
  { flag: '\u{1F1F1}\u{1F1FE}', code: '+218', name: 'Libya' },
  { flag: '\u{1F1F3}\u{1F1EC}', code: '+234', name: 'Nigeria' },
  { flag: '\u{1F1EC}\u{1F1ED}', code: '+233', name: 'Ghana' },
  { flag: '\u{1F1F0}\u{1F1EA}', code: '+254', name: 'Kenya' },
  { flag: '\u{1F1F9}\u{1F1FF}', code: '+255', name: 'Tanzania' },
  { flag: '\u{1F1FA}\u{1F1EC}', code: '+256', name: 'Uganda' },
  { flag: '\u{1F1EA}\u{1F1F9}', code: '+251', name: 'Ethiopia' },
  { flag: '\u{1F1FF}\u{1F1E6}', code: '+27', name: 'South Africa' },
  { flag: '\u{1F1F8}\u{1F1F3}', code: '+221', name: 'Senegal' },
  { flag: '\u{1F1E8}\u{1F1EE}', code: '+225', name: "C\u00f4te d'Ivoire" },
  { flag: '\u{1F1E8}\u{1F1F2}', code: '+237', name: 'Cameroon' },
  { flag: '\u{1F1E8}\u{1F1E9}', code: '+243', name: 'Congo (DRC)' },
  { flag: '\u{1F1F2}\u{1F1EC}', code: '+261', name: 'Madagascar' },
  { flag: '\u{1F1F2}\u{1F1FA}', code: '+230', name: 'Mauritius' },
  { flag: '\u{1F1F7}\u{1F1EA}', code: '+262', name: 'La R\u00e9union' },
  { flag: '\u{1F1EC}\u{1F1F5}', code: '+590', name: 'Guadeloupe' },
  { flag: '\u{1F1F2}\u{1F1F6}', code: '+596', name: 'Martinique' },
  { flag: '\u{1F1EC}\u{1F1EB}', code: '+594', name: 'French Guiana' },
  { flag: '\u{1F1F5}\u{1F1EB}', code: '+689', name: 'French Polynesia' },
  { flag: '\u{1F1F3}\u{1F1E8}', code: '+687', name: 'New Caledonia' },
  { flag: '\u{1F1F7}\u{1F1FA}', code: '+7', name: 'Russia' },
  { flag: '\u{1F1FA}\u{1F1E6}', code: '+380', name: 'Ukraine' },
  { flag: '\u{1F1EC}\u{1F1EA}', code: '+995', name: 'Georgia' },
  { flag: '\u{1F1E6}\u{1F1F2}', code: '+374', name: 'Armenia' },
  { flag: '\u{1F1E6}\u{1F1FF}', code: '+994', name: 'Azerbaijan' },
  { flag: '\u{1F1F0}\u{1F1FF}', code: '+7', name: 'Kazakhstan' },
  { flag: '\u{1F1FA}\u{1F1FF}', code: '+998', name: 'Uzbekistan' },
]

const COUNTRIES = [
  'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua and Barbuda',
  'Argentina', 'Armenia', 'Australia', 'Austria', 'Azerbaijan', 'Bahamas', 'Bahrain',
  'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bhutan',
  'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria',
  'Burkina Faso', 'Burundi', 'Cabo Verde', 'Cambodia', 'Cameroon', 'Canada',
  'Central African Republic', 'Chad', 'Chile', 'China', 'Colombia', 'Comoros',
  'Congo (DRC)', 'Congo (Republic)', 'Costa Rica', 'Croatia', "C\u00f4te d'Ivoire",
  'Cuba', 'Cyprus', 'Czech Republic', 'Denmark', 'Djibouti', 'Dominica',
  'Dominican Republic', 'East Timor', 'Ecuador', 'Egypt', 'El Salvador',
  'Equatorial Guinea', 'Eritrea', 'Estonia', 'Eswatini', 'Ethiopia', 'Fiji',
  'Finland', 'France', 'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece',
  'Grenada', 'Guatemala', 'Guinea', 'Guinea-Bissau', 'Guyana', 'Haiti', 'Honduras',
  'Hungary', 'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel',
  'Italy', 'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kiribati', 'Kosovo',
  'Kuwait', 'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya',
  'Liechtenstein', 'Lithuania', 'Luxembourg', 'Madagascar', 'Malawi', 'Malaysia',
  'Maldives', 'Mali', 'Malta', 'Marshall Islands', 'Mauritania', 'Mauritius', 'Mexico',
  'Micronesia', 'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique',
  'Myanmar', 'Namibia', 'Nauru', 'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua',
  'Niger', 'Nigeria', 'North Korea', 'North Macedonia', 'Norway', 'Oman', 'Pakistan',
  'Palau', 'Palestine', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines',
  'Poland', 'Portugal', 'Qatar', 'Romania', 'Russia', 'Rwanda', 'Saint Kitts and Nevis',
  'Saint Lucia', 'Saint Vincent and the Grenadines', 'Samoa', 'San Marino',
  'Sao Tome and Principe', 'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles',
  'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia', 'Solomon Islands', 'Somalia',
  'South Africa', 'South Korea', 'South Sudan', 'Spain', 'Sri Lanka', 'Sudan',
  'Suriname', 'Sweden', 'Switzerland', 'Syria', 'Taiwan', 'Tajikistan', 'Tanzania',
  'Thailand', 'Togo', 'Tonga', 'Trinidad and Tobago', 'Tunisia', 'Turkey',
  'Turkmenistan', 'Tuvalu', 'UAE', 'Uganda', 'Ukraine', 'United Kingdom',
  'United States', 'Uruguay', 'Uzbekistan', 'Vanuatu', 'Vatican City', 'Venezuela',
  'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe',
  // French overseas
  'La R\u00e9union', 'Guadeloupe', 'Martinique', 'French Guiana', 'Mayotte',
  'French Polynesia', 'New Caledonia',
]

const LANGUAGES_LIST_FR = [
  'Français', 'Anglais', 'Espagnol', 'Allemand', 'Mandarin', 'Arabe',
  'Italien', 'Portugais', 'Japonais', 'Coréen', 'Néerlandais', 'Russe', 'Hindi', 'Indonésien', 'Autre',
]
const LANGUAGES_LIST_EN = [
  'French', 'English', 'Spanish', 'German', 'Mandarin', 'Arabic',
  'Italian', 'Portuguese', 'Japanese', 'Korean', 'Dutch', 'Russian', 'Hindi', 'Indonesian', 'Other',
]

const DURATIONS: { value: string; fr: string; en: string }[] = [
  { value: '3', fr: '3 mois', en: '3 months' },
  { value: '4', fr: '4 mois', en: '4 months' },
  { value: '5', fr: '5 mois', en: '5 months' },
  { value: '6', fr: '6 mois', en: '6 months' },
  { value: '7', fr: '+6 mois', en: '+6 months' },
]

const TOUCHPOINTS: { value: string; fr: string; en: string }[] = [
  { value: 'Instagram', fr: 'Instagram', en: 'Instagram' },
  { value: 'TikTok', fr: 'TikTok', en: 'TikTok' },
  { value: 'Facebook', fr: 'Facebook', en: 'Facebook' },
  { value: 'Google', fr: 'Google', en: 'Google' },
  { value: 'Bouche \u00e0 oreille', fr: 'Bouche \u00e0 oreille', en: 'Word of mouth' },
  { value: 'École', fr: 'École', en: 'School' },
  { value: 'Ambassadeur Bali Interns', fr: 'Ambassadeur Bali Interns', en: 'Bali Interns Ambassador' },
]

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

interface JobType {
  id: string
  name: string
  name_fr: string | null
  name_en: string | null
  category_fr: string | null
  category_en: string | null
}

interface School {
  id: string
  name: string
  city: string | null
  country: string | null
}

interface CalendarSlot {
  start: string
  label: string
  dayLabel?: string
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function generateStaticSlots(lang: 'fr' | 'en' = 'fr'): CalendarSlot[] {
  const slots: CalendarSlot[] = []
  const now = new Date()
  const date = new Date(now)
  date.setDate(date.getDate() + 1)

  let daysAdded = 0
  while (daysAdded < 5) {
    const dayOfWeek = date.getDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      for (const hour of [9, 10, 11, 14, 15, 16]) {
        const slotDate = new Date(date)
        slotDate.setHours(hour, 0, 0, 0)
        const frLabel = slotDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
        const enLabel = slotDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
        const pad = (n: number) => String(n).padStart(2, '0')
        slots.push({
          start: slotDate.toISOString(),
          label: `${pad(hour)}h00`,
          dayLabel: lang === 'fr' ? frLabel : enLabel,
        })
      }
      daysAdded++
    }
    date.setDate(date.getDate() + 1)
  }
  return slots
}

function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr)
  d.setMonth(d.getMonth() + months)
  return d.toISOString().slice(0, 10)
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// ─────────────────────────────────────────────────────────────
// REUSABLE SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────

const inputClass = 'w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl text-[#1a1918] placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#c8a96e] text-sm'
const labelClass = 'block text-sm font-medium text-[#c8a96e] mb-1.5'
const helperClass = 'text-xs text-zinc-500 mt-1'
const chipSelectedClass = 'bg-[#c8a96e] text-[#1a1410]'
const chipUnselectedClass = 'bg-white text-[#8a7d6d] border border-zinc-200 hover:border-[#c8a96e]'

function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${selected ? chipSelectedClass : chipUnselectedClass}`}
    >
      {children}
    </button>
  )
}

function FileUpload({
  label,
  helper,
  fileName,
  onFileSelect,
  inputRef,
  accept = '.pdf,.doc,.docx,.jpg,.jpeg,.png,.odt,.rtf',
  lang,
}: {
  label: string
  helper?: string
  fileName: string
  onFileSelect: (file: File) => void
  inputRef: React.RefObject<HTMLInputElement | null>
  accept?: string
  lang: 'fr' | 'en'
}) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={e => {
          const f = e.target.files?.[0]
          if (f) onFileSelect(f)
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={`w-full py-8 border-2 border-dashed rounded-xl text-center transition-all ${
          fileName
            ? 'border-[#c8a96e] bg-[#c8a96e]/10'
            : 'border-zinc-200 hover:border-[#c8a96e] bg-white'
        }`}
      >
        {fileName ? (
          <span className="text-sm text-[#c8a96e] font-medium">{fileName}</span>
        ) : (
          <span className="text-sm text-zinc-500">
            {lang === 'fr' ? 'Glisse ton fichier ici ou clique' : 'Drag & drop or click to select'}
          </span>
        )}
      </button>
      {helper && <p className={helperClass}>{helper}</p>}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────

export default function ApplyPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [lang, setLang] = useState<'fr'|'en'>('fr')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [stepErrors, setStepErrors] = useState<Record<number, string>>({})
  const [cvUploading, setCvUploading] = useState(false)
  const [cvLocalUploading, setCvLocalUploading] = useState(false)
  const [price, setPrice] = useState(990)
  const [phoneDropOpen, setPhoneDropOpen] = useState(false)

  const cvEnRef = useRef<HTMLInputElement>(null)
  const cvLocalRef = useRef<HTMLInputElement>(null)
  const docsRef = useRef<HTMLInputElement>(null)
  const phoneDropRef = useRef<HTMLDivElement>(null)

  // ── Close phone dropdown on outside click ──
  useEffect(() => {
    if (!phoneDropOpen) return
    function handleClick(e: MouseEvent) {
      if (phoneDropRef.current && !phoneDropRef.current.contains(e.target as Node)) {
        setPhoneDropOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [phoneDropOpen])

  // ── Form state ──
  const [form, setForm] = useState(() => {
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('apply_form_v1') : null
      if (saved) {
        const parsed = JSON.parse(saved) as Record<string, unknown>
        return { ...parsed, cv_en_file: null, cv_local_file: null, extra_docs_files: [] }
      }
    } catch { /* ignore */ }
    return {
    // Step 1
    first_name: '',
    last_name: '',
    email: '',
    whatsapp_code: '+33',
    whatsapp_number: '',
    nationalities: [] as string[],
    birth_date: '',
    passport_expiry: '',
    school_country: '',
    // Step 2
    linkedin_url: '',
    cv_en_file: null as File | null,
    cv_en_filename: '',
    cv_local_file: null as File | null,
    cv_local_filename: '',
    cv_url: '',
    local_cv_url: '',
    extra_docs_files: [] as File[],
    extra_docs_names: [] as string[],
    spoken_languages: [] as string[],
    // Step 3
    school_search: '',
    school_id: null as string | null,
    school_name: '',
    school_not_found: false,
    school_custom_name: '',
    end_date: '' as string,
    desired_jobs: [] as string[],
    custom_jobs: [] as string[],
    custom_job_input: '',
    duration: '',
    start_date: '',
    stage_ideal: '',
    // Step 4
    commitment_price: false,
    commitment_budget: false,
    commitment_terms: false,
    // Step 5
    touchpoints: [] as string[],
    touchpoint: '',
    referred_by_code: '',
    // Step 6
    rdv_slot: '',
    }
  })

  // ── Fetched data ──
  const [jobTypes, setJobTypes] = useState<JobType[]>([])
  const [isSearchingSchool, setIsSearchingSchool] = useState(false)
  const [schoolResults, setSchoolResults] = useState<School[]>([])
  const [calendarSlots, setCalendarSlots] = useState<CalendarSlot[]>([])
  const [nationalitySearch, setNationalitySearch] = useState('')
  const [showNationalityDropdown, setShowNationalityDropdown] = useState(false)

  // ── Fetch on mount ──
  useEffect(() => {
    fetch('/api/public/form-price')
      .then(r => r.ok ? r.json() : null)
      .then((d: { price?: number } | null) => { if (d?.price) setPrice(Number(d.price)) })
      .catch(() => {})

    fetch('/api/public/job-types')
      .then(r => r.ok ? r.json() : [])
      .then((data: JobType[]) => { if (Array.isArray(data)) setJobTypes(data) })
      .catch(() => {})

    fetch('/api/calendar/slots')
      .then(r => r.ok ? r.json() : null)
      .then((data: { slots?: { date: string; dayLabel: string; slots: { start: string; label: string }[] }[] } | CalendarSlot[] | null) => {
        if (data && 'slots' in data && Array.isArray(data.slots) && data.slots.length > 0) {
          const flat: CalendarSlot[] = []
          for (const day of data.slots) {
            for (const s of day.slots) {
              flat.push({ start: s.start, label: s.label, dayLabel: day.dayLabel })
            }
          }
          setCalendarSlots(flat)
        } else if (Array.isArray(data) && data.length > 0) {
          setCalendarSlots(data as CalendarSlot[])
        } else {
          setCalendarSlots(generateStaticSlots(lang))
        }
      })
      .catch(() => setCalendarSlots(generateStaticSlots(lang)))
  }, [])

  // ── School search ──
  const searchSchoolsTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchSchools = useCallback((q: string) => {
    if (searchSchoolsTimeout.current) clearTimeout(searchSchoolsTimeout.current)
    if (q.length < 2) { setSchoolResults([]); setIsSearchingSchool(false); return }
    setIsSearchingSchool(true)
    searchSchoolsTimeout.current = setTimeout(() => {
      const countryParam = form.school_country ? `&country=${encodeURIComponent(form.school_country)}` : ''
      fetch(`/api/public/schools?q=${encodeURIComponent(q)}${countryParam}`)
        .then(r => r.ok ? r.json() : [])
        .then((data: School[]) => { setSchoolResults(Array.isArray(data) ? data : []); setIsSearchingSchool(false) })
        .catch(() => { setSchoolResults([]); setIsSearchingSchool(false) })
    }, 400)
  }, [])



  // Sauvegarder le formulaire dans localStorage (hors fichiers)
  useEffect(() => {
    try {
      const toSave = { ...form, cv_en_file: null, cv_local_file: null, extra_docs_files: [] }
      localStorage.setItem('apply_form_v1', JSON.stringify(toSave))
    } catch { /* ignore */ }
  }, [form])

  // Fillout script loader + pré-remplissage URL params
  useEffect(() => {
    if (step !== 4) return
    const params = new URLSearchParams()
    const fullName = `${form.first_name} ${form.last_name}`.trim()
    if (fullName) params.set('name', fullName)
    if (form.email) params.set('email', form.email)
    if (form.first_name) params.set('firstName', form.first_name)
    if (form.last_name) params.set('lastName', form.last_name)
    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`)
    const existing = document.getElementById('fillout-script')
    if (existing) existing.remove()
    const script = document.createElement('script')
    script.id = 'fillout-script'
    script.src = 'https://server.fillout.com/embed/v1/'
    script.async = true
    document.head.appendChild(script)
    return () => {
      const s = document.getElementById('fillout-script')
      if (s) s.remove()
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [step, form.first_name, form.last_name, form.email])

  // ── Setters ──
  function setStepError(step: number, msg: string) {
    setStepErrors(e => ({ ...e, [step]: msg }))
  }
  function clearStepError(step: number) {
    setStepErrors(e => { const n = {...e}; delete n[step]; return n })
  }

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function toggleArrayField(key: 'spoken_languages' | 'desired_jobs' | 'nationalities', value: string, max?: number) {
    setForm(f => {
      const arr = f[key]
      if (arr.includes(value)) return { ...f, [key]: arr.filter((v: string) => v !== value) }
      if (max && arr.length >= max) return f
      return { ...f, [key]: [...arr, value] }
    })
  }

  // ── Computed ──
  const isAnglophone = ANGLOPHONE_COUNTRIES.includes(form.school_country)

  const selectedPhone = COUNTRY_PHONE_CODES.find(c => c.code === form.whatsapp_code) ?? COUNTRY_PHONE_CODES[0]

  const computedEndDate = form.start_date && form.duration
    ? addMonths(form.start_date, parseInt(form.duration))
    : ''

  const passportWarning = (() => {
    if (!form.passport_expiry || !form.start_date) return false
    const startPlus6 = new Date(form.start_date)
    startPlus6.setMonth(startPlus6.getMonth() + 6)
    return new Date(form.passport_expiry) < startPlus6
  })()

  const stepTitles = [
    T('Qui es-tu ?', 'Who are you?', lang),
    T('Ton profil', 'Your profile', lang),
    T('Ton stage', 'Your internship', lang),
    T('Prix & engagement', 'Pricing & Commitment', lang),
    T('Comment tu nous as trouv\u00e9 ?', 'How did you find us?', lang),
    T('Prends ton RDV', 'Book your call', lang),
  ]

  // ── Validation ──
  function canNext(): boolean {
    switch (step) {
      case 0:
        return !!(
          form.first_name.trim() && form.last_name.trim() &&
          form.email.trim() && isValidEmail(form.email) &&
          form.whatsapp_number.trim() &&
          form.nationalities.length > 0 &&
          form.birth_date && form.passport_expiry
        )
      case 1:
        return !!(form.cv_en_file && form.spoken_languages.length > 0 && !cvUploading)
      case 2:
        return !!(
          form.duration &&
          form.start_date &&
          form.stage_ideal.trim().length > 0
        )
      case 3:
        return !!(form.commitment_price && form.commitment_budget && form.commitment_terms)
      case 4:
        return true
      default:
        return false
    }
  }

  // ── Submit ──
  async function handleSubmit() {
    if (!canNext()) return
    setSubmitting(true)
    setError('')
    try {
      // CV déjà uploadé en temps réel à l'étape 2
      const cv_url = form.cv_url || ''
      const local_cv_url = form.local_cv_url || ''

      // If school not found -> create pending
      if (form.school_not_found && form.school_custom_name.trim()) {
        await fetch('/api/schools-pending', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.school_custom_name,
            submitted_by_email: form.email,
          }),
        })
      }

      const body = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim().toLowerCase(),
        whatsapp: `${form.whatsapp_code}${form.whatsapp_number.replace(/\s/g, '')}`,
        school_country: form.school_country,
        nationalities: form.nationalities,
        birth_date: form.birth_date,
        passport_expiry: form.passport_expiry,
        linkedin_url: form.linkedin_url || null,
        cv_url,
        local_cv_url: local_cv_url || null,
        spoken_languages: form.spoken_languages,
        desired_jobs: form.desired_jobs,
        custom_jobs: form.custom_jobs,
        duration: form.duration,
        start_date: form.start_date,
        stage_ideal: form.stage_ideal,
        school_name: form.school_name || form.school_custom_name,
        school_id: form.school_id,
        commitment_price_accepted: true,
        commitment_budget_accepted: true,
        commitment_terms_accepted: true,
        touchpoint: form.touchpoint,
        referred_by_code: form.referred_by_code || null,
        rdv_slot: form.rdv_slot,
      }

      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.status === 409) {
        setError(T(
          'Cet email est d\u00e9j\u00e0 associ\u00e9 \u00e0 un dossier.',
          'This email is already linked to an application.',
          lang
        ))
        return
      }
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(d.error ?? T('Erreur lors de la soumission', 'Submission error', lang))
      }

      router.push(`/apply/confirmation?name=${encodeURIComponent(form.first_name)}&lang=${lang}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : T('Erreur inconnue', 'Unknown error', lang))
    } finally {
      setSubmitting(false)
    }
  }

  // ── Group calendar slots by day ──
  const slotsByDay: { dayLabel: string; slots: CalendarSlot[] }[] = []
  for (const slot of calendarSlots) {
    const dayKey = slot.dayLabel || slot.start.slice(0, 10)
    const existing = slotsByDay.find(d => d.dayLabel === dayKey)
    if (existing) {
      existing.slots.push(slot)
    } else {
      slotsByDay.push({ dayLabel: dayKey, slots: [slot] })
    }
  }

  // Filtered countries for nationality search
  const filteredNationalities = nationalitySearch.length > 0
    ? COUNTRIES.filter(c => c.toLowerCase().includes(nationalitySearch.toLowerCase()))
    : COUNTRIES

  return (
    <div className="min-h-screen bg-[#fafaf9] text-[#1a1918]">
      {/* ── Progress bar ── */}
      <div className="sticky top-0 z-50 bg-[#fafaf9]/95 backdrop-blur border-b border-zinc-200">
        <div className="max-w-xl mx-auto px-4 py-3">
          <div className="flex items-center gap-1.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i <= step ? 'bg-[#c8a96e]' : 'bg-zinc-200'}`} />
            ))}
          </div>
          <p className="text-xs text-zinc-500 mt-1.5 text-center">
            {step + 1} / 5
          </p>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-8">
        {/* Toggle langue */}
        <div className="flex justify-end mb-4">
          <div className="inline-flex rounded-lg border border-zinc-200 bg-white overflow-hidden text-xs font-medium">
            <button
              onClick={() => setLang('fr')}
              className={`px-3 py-1.5 transition-colors ${lang === 'fr' ? 'bg-[#c8a96e] text-white' : 'text-zinc-500 hover:bg-zinc-50'}`}
            >
              {'\u{1F1EB}\u{1F1F7}'} FR
            </button>
            <button
              onClick={() => setLang('en')}
              className={`px-3 py-1.5 transition-colors ${lang === 'en' ? 'bg-[#c8a96e] text-white' : 'text-zinc-500 hover:bg-zinc-50'}`}
            >
              {'\u{1F1EC}\u{1F1E7}'} EN
            </button>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-[#1a1918] mb-6">{stepTitles[step]}</h1>

        {/* ════════════════════════════════════════════════════════
            ÉTAPE 1 — Qui es-tu ?
            ════════════════════════════════════════════════════════ */}
        {step === 0 && (
          <div className="space-y-4">
            {/* Prénom + Nom */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>{lang==='fr'?'Pr\u00e9nom *':'First name *'}</label>
                <input type="text" value={form.first_name} onChange={e => set('first_name', e.target.value)} className={inputClass} placeholder={lang==='fr'?'Jean':'John'} />
              </div>
              <div>
                <label className={labelClass}>{lang==='fr'?'Nom *':'Last name *'}</label>
                <input type="text" value={form.last_name} onChange={e => set('last_name', e.target.value)} className={inputClass} placeholder={lang==='fr'?'Dupont':'Smith'} />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className={labelClass}>Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                className={`${inputClass} ${form.email && !isValidEmail(form.email) ? 'ring-2 ring-red-500' : ''}`}
                placeholder="your@email.com"
              />
            </div>

            {/* WhatsApp */}
            <div>
              <label className={labelClass}>WhatsApp *</label>
              <p className={helperClass + " mb-2"}>
                {lang === 'fr' ? "Tout le monde à Bali l'utilise, mets un numéro joignable !" : "Everyone uses it in Bali, make sure the number is correct."}
              </p>
              <div className="flex gap-2">
                {/* Indicatif custom dropdown */}
                <div className="relative flex-shrink-0" ref={phoneDropRef}>
                  <button
                    type="button"
                    onClick={() => setPhoneDropOpen(o => !o)}
                    className="flex items-center gap-1 px-3 py-3 bg-white border border-zinc-200 rounded-xl text-sm font-medium text-[#1a1918] hover:border-[#c8a96e] transition-colors whitespace-nowrap"
                  >
                    <span>{selectedPhone.flag}</span>
                    <span>{selectedPhone.code}</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path d="M19 9l-7 7-7-7"/>
                    </svg>
                  </button>
                  {phoneDropOpen && (
                    <div className="absolute z-50 top-full left-0 mt-1 w-56 max-h-64 overflow-y-auto bg-white border border-zinc-200 rounded-xl shadow-lg">
                      {COUNTRY_PHONE_CODES.map((c, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => { set('whatsapp_code', c.code); setPhoneDropOpen(false) }}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-zinc-50 text-left ${c.code === form.whatsapp_code ? 'text-[#c8a96e] font-medium' : 'text-[#1a1918]'}`}
                        >
                          <span className="flex-shrink-0">{c.flag}</span>
                          <span className="text-zinc-500 flex-shrink-0">{c.code}</span>
                          <span className="truncate">{c.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {/* Input numéro — prend tout l'espace */}
                <input
                  type="tel"
                  value={form.whatsapp_number}
                  onChange={e => set('whatsapp_number', e.target.value)}
                  className={`${inputClass} flex-1`}
                  placeholder="6 12 34 56 78"
                />
              </div>
            </div>

            {/* Nationalité(s) — multi-select with search */}
            <div className="relative">
              <label className={labelClass}>{lang==='fr'?'Nationalit\u00e9(s) *':'Nationality(ies) *'}</label>
              {form.nationalities.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {form.nationalities.map(n => (
                    <span key={n} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[#c8a96e] text-[#1a1410]">
                      {n}
                      <button type="button" onClick={() => toggleArrayField('nationalities', n)} className="hover:text-red-800">&times;</button>
                    </span>
                  ))}
                </div>
              )}
              <input
                type="text"
                value={nationalitySearch}
                onChange={e => { setNationalitySearch(e.target.value); setShowNationalityDropdown(true) }}
                onFocus={() => setShowNationalityDropdown(true)}
                className={inputClass}
                placeholder={lang==='fr'?'Rechercher un pays...':'Search country...'}
              />
              {showNationalityDropdown && filteredNationalities.length > 0 && (
                <div className="absolute z-40 w-full mt-1 max-h-48 overflow-y-auto bg-white border border-zinc-200 rounded-xl shadow-lg">
                  {filteredNationalities.slice(0, 20).map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        toggleArrayField('nationalities', c)
                        setNationalitySearch('')
                        setShowNationalityDropdown(false)
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-zinc-100 ${form.nationalities.includes(c) ? 'text-[#c8a96e]' : 'text-[#1a1918]'}`}
                    >
                      {c} {form.nationalities.includes(c) ? '\u2713' : ''}
                    </button>
                  ))}
                </div>
              )}
              {/* Close dropdown on outside click */}
              {showNationalityDropdown && (
                <div className="fixed inset-0 z-30" onClick={() => setShowNationalityDropdown(false)} />
              )}
            </div>

            {/* Date de naissance */}
            <div>
              <label className={labelClass}>{lang==='fr'?'Date de naissance *':'Date of birth *'}</label>
              <input type="date" value={form.birth_date} onChange={e => set('birth_date', e.target.value)} className={`${inputClass} ${!form.birth_date ? "text-zinc-400" : ""}`} />
            </div>

            {/* Passeport expiry */}
            <div>
              <label className={labelClass}>{lang==='fr'?"Date d\u2019expiration du passeport *":'Passport expiry date *'}</label>
<input type="date" value={form.passport_expiry} onChange={e => set('passport_expiry', e.target.value)} className={`${inputClass} ${!form.passport_expiry ? "text-zinc-400" : ""}`} />
              {passportWarning && (
                <div className="mt-2 flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-300 rounded-lg px-3 py-2.5">
                  <span className="flex-shrink-0 font-bold">⚠️</span>
                  <span>
                    {lang==='fr'
                      ? "Ton passeport doit être valide au moins 6 mois après ton arrivée à Bali. Tu pourras le mettre à jour plus tard."
                      : "Your passport must be valid at least 6 months after your arrival in Bali. You can update it later."}
                  </span>
                </div>
              )}
            </div>

            {/* Pays d'études — select */}
            <div>
              <label className={labelClass}>{lang==='fr'?'Pays où tu étudies *':'Country where you study *'}</label>
              <p className={helperClass + " mb-2"}>
                {lang === 'fr' ? "Pays dans lequel ta convention de stage sera établie de droit commun." : "Country where your internship agreement will be issued by law."}
              </p>
              <select
                value={form.school_country}
                onChange={e => set('school_country', e.target.value)}
                className="w-full px-4 py-3 border border-zinc-200 rounded-xl text-[#1a1918] bg-white focus:outline-none focus:ring-2 focus:ring-[#c8a96e] text-sm cursor-pointer"
              >
                <option value="">{lang==='fr'?'S\u00e9lectionner un pays...':'Select a country...'}</option>
                {COUNTRIES.map(country => (
                  <option key={country} value={country}>{country}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════
            ÉTAPE 2 — Ton profil
            ════════════════════════════════════════════════════════ */}
        {step === 1 && (
          <div className="space-y-4">
            {/* LinkedIn */}
            <div>
              <label className={labelClass}>{lang==='fr'?'LinkedIn (optionnel)':'LinkedIn (optional)'}</label>
              <input type="url" value={form.linkedin_url} onChange={e => set('linkedin_url', e.target.value)} className={inputClass} placeholder="https://linkedin.com/in/..." />
            </div>

            {/* CV anglais */}
            {cvUploading && (
              <div className="flex items-center gap-2 text-sm text-[#c8a96e] bg-amber-50 rounded-lg px-3 py-2 mb-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                {lang === 'fr' ? 'Upload en cours...' : 'Uploading...'}
              </div>
            )}
            {form.cv_url && !cvUploading && (
              <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 rounded-lg px-3 py-2 mb-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                </svg>
                {lang === 'fr' ? 'CV uploadé avec succès ✓' : 'CV uploaded successfully ✓'}
              </div>
            )}
            <FileUpload
              label={lang==='fr'?'CV en anglais * (PDF/DOC/JPG, max 20MB)':'English CV * (PDF/DOC/JPG, max 20MB)'}
              helper={lang==='fr'
                ? "M\u00eame avec une entreprise francophone, l\u2019anglais est indispensable au quotidien."
                : "Even at a French-speaking company, English is essential daily."}
              fileName={form.cv_en_filename}
              onFileSelect={f => {
                // Vérif taille
                if (f.size > 20 * 1024 * 1024) {
                  setStepError(1, T(`Fichier trop volumineux : ${(f.size / 1024 / 1024).toFixed(1)}MB (max 20MB)`, `File too large: ${(f.size / 1024 / 1024).toFixed(1)}MB (max 20MB)`, lang))
                  return
                }
                set('cv_en_file', f)
                set('cv_en_filename', f.name)
                clearStepError(1)
                // Upload immédiat
                setCvUploading(true)
                const fd = new FormData(); fd.append('file', f)
                fetch('/api/upload', { method: 'POST', body: fd })
                  .then(r => r.ok ? r.json() : Promise.reject(new Error(T('Erreur serveur lors de l\'upload', 'Server error during upload', lang))))
                  .then((d: { url: string }) => { set('cv_url', d.url); clearStepError(1) })
                  .catch((e: Error) => setStepError(1, T(`Erreur upload CV: ${e.message}`, `CV upload error: ${e.message}`, lang)))
                  .finally(() => setCvUploading(false))
              }}
              inputRef={cvEnRef}
              lang={lang}
            />

            {/* CV local (conditionnel) */}
            {!isAnglophone && form.school_country && (
              <FileUpload
                label={lang==='fr'?'CV dans ta langue (PDF/DOC, max 5MB)':'Local language CV (PDF/DOC, max 5MB)'}
                helper={lang==='fr'
                  ? "Optionnel mais recommand\u00e9 pour les entreprises locales"
                  : "Optional but recommended for local companies"}
                fileName={form.cv_local_filename}
                onFileSelect={f => {
                  if (f.size > 20 * 1024 * 1024) {
                    setStepError(1, T(`Fichier trop volumineux : ${(f.size / 1024 / 1024).toFixed(1)}MB (max 20MB)`, `File too large: ${(f.size / 1024 / 1024).toFixed(1)}MB (max 20MB)`, lang))
                    return
                  }
                  set('cv_local_file', f)
                  set('cv_local_filename', f.name)
                  clearStepError(1)
                  // Upload immédiat
                  setCvLocalUploading(true)
                  const fd2 = new FormData(); fd2.append('file', f)
                  fetch('/api/upload', { method: 'POST', body: fd2 })
                    .then(r => r.ok ? r.json() : Promise.reject(new Error(T('Erreur serveur', 'Server error', lang))))
                    .then((d: { url: string }) => { set('local_cv_url', d.url); clearStepError(1) })
                    .catch((e: Error) => setStepError(1, T(`Erreur upload CV local: ${e.message}`, `Local CV upload error: ${e.message}`, lang)))
                    .finally(() => setCvLocalUploading(false))
                }}
                inputRef={cvLocalRef}
                lang={lang}
              />
            )}

            {/* Documents supplémentaires */}
            <div>
              <label className={labelClass}>{lang==='fr'?'Documents suppl\u00e9mentaires (optionnel)':'Additional documents (optional)'}</label>
              <input
                ref={docsRef}
                type="file"
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                multiple
                className="hidden"
                onChange={e => {
                  const files = e.target.files
                  if (files) {
                    const arr = Array.from(files)
                    set('extra_docs_files', [...form.extra_docs_files, ...arr])
                    set('extra_docs_names', [...form.extra_docs_names, ...arr.map(f => f.name)])
                  }
                }}
              />
              <button
                type="button"
                onClick={() => docsRef.current?.click()}
                className="w-full py-6 border-2 border-dashed border-zinc-200 hover:border-[#c8a96e] bg-white rounded-xl text-center transition-all"
              >
                <span className="text-sm text-zinc-500">
                  {lang==='fr'?'Portfolio, projets, r\u00e9alisations':'Portfolio, projects, achievements'}
                </span>
              </button>
              {form.extra_docs_names.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {form.extra_docs_names.map((name, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs bg-white text-[#c8a96e] border border-zinc-200">
                      {name}
                      <button
                        type="button"
                        onClick={() => {
                          set('extra_docs_files', form.extra_docs_files.filter((_, idx) => idx !== i))
                          set('extra_docs_names', form.extra_docs_names.filter((_, idx) => idx !== i))
                        }}
                        className="hover:text-red-400"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Langues */}
            <div>
              <label className={labelClass}>{lang==='fr'?'Langues professionnelles *':'Professional languages *'}</label>
              <p className={helperClass + " mb-2"}>
                {lang==='fr' ? "Langues parlées en environnement professionnel." : "Languages spoken in a professional environment."}
              </p>
              <div className="flex flex-wrap gap-2">
                {(lang === 'fr' ? LANGUAGES_LIST_FR : LANGUAGES_LIST_EN).map((l, idx) => {
                  const value = LANGUAGES_LIST_FR[idx] // always store FR value
                  return (
                    <Chip key={value} selected={form.spoken_languages.includes(value)} onClick={() => toggleArrayField('spoken_languages', value)}>
                      {l}
                    </Chip>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════
            ÉTAPE 3 — Ton stage
            ════════════════════════════════════════════════════════ */}
        {step === 2 && (
          <div className="space-y-4">
            {/* École / Université — autocomplete */}
            <div className="relative">
              <label className={labelClass}>{lang==='fr'?'\u00c9cole / Universit\u00e9':'School / University'}</label>
              {!form.school_not_found ? (
                <>
                  <div className="relative">
                    <input
                      type="text"
                      value={form.school_name || form.school_search}
                      onChange={e => {
                        const v = e.target.value
                        set('school_search', v)
                        set('school_name', '')
                        set('school_id', null)
                        searchSchools(v)
                      }}
                      className={inputClass}
                      placeholder={lang==='fr'?'Rechercher ton école...':'Search your school...'}
                    />
                    {isSearchingSchool && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <svg className="animate-spin w-4 h-4 text-[#c8a96e]" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                        </svg>
                      </div>
                    )}
                    {form.school_name && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                        </svg>
                      </div>
                    )}
                  </div>
                  {schoolResults.length > 0 && form.school_search.length >= 2 && !form.school_name && (
                    <div className="absolute z-40 w-full mt-1 max-h-48 overflow-y-auto bg-white border border-zinc-200 rounded-xl shadow-lg">
                      {schoolResults.map(s => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            set('school_id', s.id)
                            set('school_name', s.name)
                            set('school_search', '')
                            setSchoolResults([])
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-[#1a1918] hover:bg-zinc-100"
                        >
                          <span className="font-medium">{s.name}</span>
                          {s.city && <span className="text-zinc-500"> {'\u2014'} {s.city}{s.country ? `, ${s.country}` : ''}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => set('school_not_found', true)}
                    className="mt-2 text-xs text-[#c8a96e] underline hover:text-[#b8945a]"
                  >
                    {lang==='fr'?"Mon \u00e9cole n\u2019est pas dans la liste":'My school is not in the list'}
                  </button>
                </>
              ) : (
                <>
                  <input
                    type="text"
                    value={form.school_custom_name}
                    onChange={e => set('school_custom_name', e.target.value)}
                    className={inputClass}
                    placeholder={lang==='fr'?'Nom de ton \u00e9cole':'Your school name'}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      set('school_not_found', false)
                      set('school_custom_name', '')
                    }}
                    className="mt-2 text-xs text-[#c8a96e] underline hover:text-[#b8945a]"
                  >
                    {lang==='fr'?'Retour \u00e0 la recherche':'Back to search'}
                  </button>
                </>
              )}
            </div>

            {/* Durée */}
            <div>
              <label className={labelClass}>{lang==='fr'?'Dur\u00e9e souhait\u00e9e *':'Desired duration *'}</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {DURATIONS.map(d => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => set('duration', d.value)}
                    className={`py-3 rounded-xl text-sm font-medium transition-all ${
                      form.duration === d.value
                        ? 'bg-[#c8a96e] text-[#1a1410]'
                        : 'bg-white text-[#8a7d6d] border border-zinc-200 hover:border-[#c8a96e]'
                    }`}
                  >
                    {lang==='fr'?d.fr:d.en}
                  </button>
                ))}
              </div>
            </div>

            {/* Date de début */}
            <div>
              <label className={labelClass}>{lang==='fr'?'Date de démarrage souhaitée *':'Desired start date *'}</label>
              <input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} min={new Date(Date.now() + 30*86400000).toISOString().split("T")[0]} className={`${inputClass} ${!form.start_date ? "text-zinc-400" : ""}`} />
              <p className={helperClass}>{lang==='fr'?"\u00c0 2-4 semaines pr\u00e8s, c\u2019est ok":"Give or take 2-4 weeks, that\u2019s fine"}</p>
            </div>

            {/* Date de fin — champ libre optionnel */}
            <div>
              <label className={labelClass}>{lang==='fr'?'Date de fin maximum possible (optionnel)':'Latest possible end date (optional)'}</label>
              <input
                type="date"
                value={form.end_date ?? ''}
                onChange={e => set('end_date', e.target.value)}
                className={inputClass}
              />
              <p className={helperClass}>
                {lang==='fr' ? "Laisse vide si tu n'as pas de contrainte précise." : "Leave empty if you have no specific constraint."}
              </p>
            </div>

            {/* Métiers souhaités (max 3) */}
            <div>
              <label className={labelClass}>{lang==='fr'?'M\u00e9tiers souhait\u00e9s * (max 3)':'Desired positions * (max 3)'}</label>
              <div className="flex flex-wrap gap-2">
                {jobTypes.filter(j => j.name_fr !== 'Autre' && j.name_en !== 'Other').map(j => {
                  const jLabel = lang==='fr' ? (j.name_fr || j.name) : (j.name_en || j.name)
                  return (
                    <Chip
                      key={j.id}
                      selected={form.desired_jobs.includes(j.name)}
                      onClick={() => toggleArrayField('desired_jobs', j.name, 3)}
                    >
                      {jLabel}
                    </Chip>
                  )
                })}
              </div>
              {/* Custom job input */}
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={form.custom_job_input}
                  onChange={e => set('custom_job_input', e.target.value)}
                  className={`${inputClass} flex-1`}
                  placeholder={lang==='fr'?'Autre m\u00e9tier...':'Other position...'}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && form.custom_job_input.trim() && form.custom_jobs.length < 3) {
                      e.preventDefault()
                      set('custom_jobs', [...form.custom_jobs, form.custom_job_input.trim()])
                      set('custom_job_input', '')
                    }
                  }}
                />
                <button
                  type="button"
                  disabled={!form.custom_job_input.trim() || form.custom_jobs.length >= 3}
                  onClick={() => {
                    if (form.custom_job_input.trim() && form.custom_jobs.length < 3) {
                      set('custom_jobs', [...form.custom_jobs, form.custom_job_input.trim()])
                      set('custom_job_input', '')
                    }
                  }}
                  className="px-4 py-2 rounded-xl text-sm font-medium bg-[#c8a96e] text-[#1a1410] disabled:opacity-40"
                >
                  +
                </button>
              </div>
              {form.custom_jobs.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {form.custom_jobs.map((j, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[#c8a96e] text-[#1a1410]">
                      {j}
                      <button
                        type="button"
                        onClick={() => set('custom_jobs', form.custom_jobs.filter((_, idx) => idx !== i))}
                        className="hover:text-red-800"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <p className={helperClass}>
                {form.desired_jobs.length + form.custom_jobs.length}/3 {lang==='fr'?'s\u00e9lectionn\u00e9s':'selected'}
              </p>
            </div>

            {/* Stage idéal */}
            <div>
              <label className={labelClass}>{lang==='fr'?'Ton stage id\u00e9al *':'Your ideal internship *'}</label>
              <textarea
                value={form.stage_ideal}
                onChange={e => set('stage_ideal', e.target.value)}
                rows={6}
                maxLength={1000}
                placeholder={lang==='fr' ? "Objectifs, comp\u00e9tences, types d\u2019entreprises, contraintes (dates / remote / horaires), et ce que tu veux apprendre. Pas besoin d\u2019\u00eatre parfait, on clarifie ensemble en appel." : "Goals, skills, company types, constraints (dates / remote / hours), and what you want to learn. No need to be perfect, we\u2019ll clarify together on the call."}
                className={`${inputClass} resize-none`}
              />
              <p className="text-xs mt-1 text-zinc-400">
                {form.stage_ideal.length}/1000
              </p>
            </div>

            {/* Comment tu nous as trouvé — multi-select */}
            <div>
              <label className={labelClass}>
                {lang==='fr' ? 'Comment tu nous as trouvé ? *' : 'How did you find us? *'}
              </label>
              <p className={helperClass + ' mb-2'}>
                {lang==='fr' ? 'Tu peux sélectionner plusieurs options.' : 'You can select multiple options.'}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {TOUCHPOINTS.map(t => {
                  const selected = form.touchpoints.includes(t.value)
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => {
                        const cur = form.touchpoints
                        const next = selected ? cur.filter(x => x !== t.value) : [...cur, t.value]
                        set('touchpoints', next)
                        set('touchpoint', next.join(', '))
                        if (!next.includes('Ambassadeur Bali Interns')) set('referred_by_code', '')
                      }}
                      className={`py-2.5 px-3 rounded-xl text-sm font-medium text-left transition-all flex items-center gap-2 ${
                        selected
                          ? 'bg-[#c8a96e] text-[#1a1410]'
                          : 'bg-white text-[#1a1918] border border-zinc-200 hover:border-[#c8a96e]'
                      }`}
                    >
                      {selected && (
                        <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                        </svg>
                      )}
                      {lang==='fr' ? t.fr : t.en}
                    </button>
                  )
                })}
              </div>

              {/* Referral code conditionnel */}
              {form.touchpoints.includes('Ambassadeur Bali Interns') && (
                <div className="mt-3">
                  <label className={labelClass}>{lang==='fr'?'Code de parrainage (optionnel)':'Referral code (optional)'}</label>
                  <input
                    type="text"
                    value={form.referred_by_code}
                    onChange={e => set('referred_by_code', e.target.value)}
                    className={inputClass}
                    placeholder="CODE123"
                  />
                  <p className={helperClass}>{lang==='fr'?'Si tu as un code, saisis-le ici':'If you have a code, enter it here'}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════
            ÉTAPE 4 — Prix & engagement
            ════════════════════════════════════════════════════════ */}
        {step === 3 && (
          <div className="space-y-5">
            {/* Price card */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-6">
              <div className="text-center mb-5">
                <p className="text-4xl font-bold text-[#c8a96e]">{price}{'\u20ac'}</p>
                <p className="text-xs text-zinc-500 mt-1">{lang==='fr'?'TTC':'Tax included'}</p>
              </div>
              <p className="text-sm text-[#8a7d6d] leading-relaxed">
                {lang==='fr'
                  ? `Le service Bali Interns co\u00fbte ${price}\u20ac TTC. Paiement uniquement apr\u00e8s signature de la convention de stage \u2014 avant \u00e7a, 0\u20ac \u00e0 r\u00e9gler. Pour \u00e9viter les mauvaises surprises, on s\u2019assure que tout est clair avant de continuer.`
                  : `Bali Interns service costs \u20ac${price} (tax included). Payment only after the internship agreement is signed \u2014 before that, \u20ac0 to pay. No surprises: everything is clear before moving forward.`}
              </p>
            </div>

            {/* 3 checkboxes */}
            <div className="space-y-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.commitment_price}
                  onChange={e => set('commitment_price', e.target.checked)}
                  className="mt-0.5 w-5 h-5 rounded accent-[#c8a96e] flex-shrink-0"
                />
                <span className="text-sm text-[#8a7d6d] leading-relaxed">
                  {lang==='fr'
                    ? `Je confirme avoir compris le prix (${price}\u20ac TTC) et que le paiement intervient uniquement apr\u00e8s signature de la convention par l\u2019\u00e9tudiant(e), l\u2019employeur et l\u2019\u00e9cole/universit\u00e9.`
                    : `I confirm I understand the price (\u20ac${price} incl. tax) and that payment happens only after the internship agreement is signed by the student, the employer, and the school/university.`}
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.commitment_budget}
                  onChange={e => set('commitment_budget', e.target.checked)}
                  className="mt-0.5 w-5 h-5 rounded accent-[#c8a96e] flex-shrink-0"
                />
                <span className="text-sm text-[#8a7d6d] leading-relaxed">
                  {lang==='fr'
                    ? `Je confirme disposer du budget (ou d\u2019une solution de financement) pour r\u00e9gler ${price}\u20ac TTC une fois la convention sign\u00e9e.`
                    : `I confirm I have the budget (or a financing solution) to pay \u20ac${price} incl. tax once the agreement is signed.`}
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.commitment_terms}
                  onChange={e => set('commitment_terms', e.target.checked)}
                  className="mt-0.5 w-5 h-5 rounded accent-[#c8a96e] flex-shrink-0"
                />
                <span className="text-sm text-[#8a7d6d] leading-relaxed">
                  {lang==='fr'
                    ? "Je confirme avoir pris connaissance des \u00e9l\u00e9ments contractuels."
                    : "I confirm I have read and understood the contractual terms."}
                </span>
              </label>
            </div>

            {/* Legal text */}
            <p className="text-[11px] text-[#5a5347] leading-relaxed">
              {lang==='fr'
                ? "En validant ce formulaire : (1) Tu autorises Bali Interns \u00e0 partager les informations n\u00e9cessaires de ton dossier avec nos entreprises partenaires et nos prestataires administratifs (ex : visa), uniquement pour traiter ta candidature. (2) Tu t\u2019engages \u00e0 ne pas signer de convention de stage avec une entreprise pr\u00e9sent\u00e9e par Bali Interns en dehors de notre processus. (3) Tu confirmes que la suite du processus passe par la prise de rendez-vous avec un conseiller."
                : "By submitting this form: (1) You authorize Bali Interns to share necessary information with partner companies and administrative providers. (2) You agree not to sign an agreement with a company introduced by Bali Interns outside our process. (3) You confirm the next step is booking a call."}
            </p>
          </div>
        )}



        {/* ════════════════════════════════════════════════════════
            ÉTAPE 6 — Prends un RDV
            ════════════════════════════════════════════════════════ */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <p className={helperClass + " text-sm mb-4"}>
                {lang === 'fr'
                  ? "Choisis un créneau pour ton entretien de qualification (45 min, Google Meet)."
                  : "Choose a time slot for your qualification interview (45 min, Google Meet)."}
              </p>
              <p className="text-xs text-zinc-600 bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 mb-4">
                {lang === 'fr'
                  ? "⚠️ Si tu ne peux pas honorer ton rendez-vous, un lien de reprogrammation sera disponible dans l'email de confirmation. En raison du fort volume, une seule reprogrammation sera accordée."
                  : "⚠️ If you can't make it, a reschedule link will be in your confirmation email. Due to high demand, only one reschedule is allowed."}
              </p>
            </div>
            {/* Fillout scheduling embed — standard */}
            <div
              style={{ width: '100%', height: '500px' }}
              data-fillout-id="iqn73wjLFeus"
              data-fillout-embed-type="standard"
              data-fillout-inherit-parameters
              data-fillout-dynamic-resize
            />
            <p className="text-xs text-zinc-400 text-center">
              {lang === 'fr'
                ? "Le créneau sera confirmé par email • Manila (GMT+8)"
                : "The slot will be confirmed by email • Manila (GMT+8)"}
            </p>
          </div>
        )}

        {/* ── Error ── */}
        {(error || stepErrors[step]) && (
          <div className="mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 flex items-start gap-2">
            <span className="flex-shrink-0">⚠️</span>
            <span>{stepErrors[step] || error}</span>
          </div>
        )}

        {/* ── Navigation ── */}
        <div className="flex gap-3 mt-8">
          {step > 0 && (
            <button
              type="button"
              onClick={() => { setStep(s => s - 1); setError(''); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
              className="px-6 py-3 rounded-xl text-sm font-medium bg-white text-[#8a7d6d] border border-zinc-200 hover:border-[#c8a96e] transition-all"
            >
              {lang==='fr'?'\u2190 Retour':'\u2190 Back'}
            </button>
          )}
          {step < 3 && (
            <button
              type="button"
              disabled={!canNext()}
              onClick={() => { setStep(s => s + 1); setError(''); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
              className="flex-1 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-[#c8a96e] text-[#1a1410] hover:bg-[#b8945a]"
            >
              {lang==='fr'?'Continuer \u2192':'Continue \u2192'}
            </button>
          )}
          {step === 3 && (
            <button
              type="button"
              disabled={!canNext() || submitting}
              onClick={() => { void handleSubmit() }}
              className="flex-1 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-[#c8a96e] text-[#1a1410] hover:bg-[#b8945a]"
            >
              {submitting
                ? (lang==='fr'?'Envoi en cours...':'Submitting...')
                : (lang==='fr'?'Confirmer ma candidature \u{1F680}':'Submit my application \u{1F680}')}
            </button>
          )}
        </div>
      </div>

      {/* Fade-in animation */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
