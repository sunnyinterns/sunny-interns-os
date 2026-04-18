'use client'
import { DatePickerInput } from '@/components/ui/DatePickerInput'
import { NativeBookingEmbed } from '@/components/booking/NativeBookingEmbed'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'

// ─── Types ─────────────────────────────────────────────────────
type FormData = {
  first_name: string
  last_name: string
  email: string
  whatsapp_code: string
  whatsapp_number: string
  nationalities: string[]
  birth_date: string
  passport_expiry: string
  school_country: string
  linkedin_url: string
  cv_en_file: File | null
  cv_en_filename: string
  cv_local_file: File | null
  cv_local_filename: string
  cv_url: string
  local_cv_url: string
  extra_docs_files: File[]
  extra_docs_names: string[]
  spoken_languages: string[]
  school_search: string
  school_id: string | null
  school_name: string
  school_not_found: boolean
  school_custom_name: string
  end_date: string
  desired_jobs: string[]
  custom_jobs: string[]
  custom_job_input: string
  duration: string
  start_date: string
  stage_ideal: string
  commitment_price: boolean
  commitment_budget: boolean
  commitment_terms: boolean
  touchpoints: string[]
  touchpoint: string
  referred_by_code: string
  rdv_slot: string
}

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

interface Question {
  id: string
  label: string
  labelEn: string
  helper?: string
  helperEn?: string
  type: 'text' | 'email' | 'tel_whatsapp' | 'date' | 'select' | 'multi_select' | 'file' | 'textarea' | 'chips' | 'checkbox_group' | 'schedule' | 'name_pair' | 'date_pair' | 'cv_pair' | 'linkedin_school'
  field: keyof FormData
  required?: boolean
  options?: string[]
  optionsFn?: 'languages' | 'durations' | 'touchpoints' | 'jobTypes'
  validate?: (val: unknown, form: FormData) => string | null
  skip?: (form: FormData) => boolean
  hint?: string
  hintEn?: string
  maxSelect?: number
  accept?: string
  section: string
  sectionEn: string
}

interface MobileApplyProps {
  form: FormData
  setForm: React.Dispatch<React.SetStateAction<FormData>>
  lang: 'fr' | 'en'
  setLang: (l: 'fr' | 'en') => void
  onSubmit: () => Promise<void>
  submitting: boolean
  error: string
  price: number
  jobTypes: JobType[]
  cvUploading: boolean
  cvLocalUploading: boolean
  desktopStep?: number
  onCvUpload: (file: File) => void
  onCvLocalUpload: (file: File) => void
}

// ─── Constants ─────────────────────────────────────────────────

const ANGLOPHONE_COUNTRIES = [
  'United Kingdom', 'United States', 'Canada', 'Australia',
  'Ireland', 'New Zealand', 'Singapore', 'South Africa',
]

const COUNTRIES = [
  'France', 'Belgique', 'Suisse', 'Luxembourg', 'Canada', 'Maroc', 'Algérie', 'Tunisie',
  'Sénégal', "Côte d'Ivoire", 'Cameroun', 'Madagascar', 'Mali', 'Burkina Faso',
  'Niger', 'Bénin', 'Togo', 'République démocratique du Congo', 'Rwanda', 'Burundi',
  'Gabon', 'Congo', 'Mauritanie', 'Djibouti', 'Comores', 'Maurice',
  'Allemagne', 'Espagne', 'Italie', 'Portugal', 'Pays-Bas', 'Autriche',
  'Suède', 'Norvège', 'Danemark', 'Finlande', 'Pologne', 'Roumanie', 'Grèce',
  'Hongrie', 'République tchèque', 'Slovaquie', 'Croatie', 'Slovénie', 'Serbie',
  'Bulgarie', 'Lituanie', 'Lettonie', 'Estonie', 'Irlande', 'Malte',
  'Afghanistan', 'Albania', 'Algeria', 'Angola', 'Argentina', 'Armenia', 'Australia',
  'Azerbaijan', 'Bahrain', 'Bangladesh', 'Belarus', 'Belize', 'Bhutan',
  'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei',
  'Cambodia', 'Cabo Verde', 'Central African Republic', 'Chad', 'Chile', 'China',
  'Colombia', 'Costa Rica', 'Cuba', 'Cyprus', 'Denmark', 'Dominican Republic',
  'Ecuador', 'Egypt', 'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Eswatini',
  'Ethiopia', 'Fiji', 'Georgia', 'Ghana', 'Grenada', 'Guatemala', 'Guinea',
  'Guinea-Bissau', 'Guyana', 'Haiti', 'Honduras', 'Iceland', 'India', 'Indonesia',
  'Iran', 'Iraq', 'Israel', 'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya',
  'Kiribati', 'Kosovo', 'Kuwait', 'Kyrgyzstan', 'Laos', 'Lebanon', 'Lesotho',
  'Liberia', 'Libya', 'Liechtenstein', 'Malawi', 'Malaysia', 'Maldives',
  'Marshall Islands', 'Mauritania', 'Mexico', 'Micronesia', 'Moldova', 'Monaco',
  'Mongolia', 'Montenegro', 'Mozambique', 'Myanmar', 'Namibia', 'Nepal',
  'New Zealand', 'Nicaragua', 'Nigeria', 'North Korea', 'North Macedonia', 'Oman',
  'Pakistan', 'Palau', 'Palestine', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru',
  'Philippines', 'Qatar', 'Saint Kitts and Nevis', 'Saint Lucia', 'Samoa',
  'San Marino', 'Saudi Arabia', 'Sierra Leone', 'Singapore', 'Solomon Islands',
  'Somalia', 'South Africa', 'South Korea', 'South Sudan', 'Sri Lanka', 'Sudan',
  'Suriname', 'Syria', 'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Timor-Leste',
  'Trinidad and Tobago', 'Turkey', 'Turkmenistan', 'Uganda', 'Ukraine',
  'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay', 'Uzbekistan',
  'Vanuatu', 'Vatican City', 'Venezuela', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe',
  'Autre / Other',
]

const LANGUAGES_LIST_FR = [
  'Français', 'Anglais', 'Espagnol', 'Allemand', 'Mandarin', 'Arabe',
  'Italien', 'Portugais', 'Japonais', 'Coréen', 'Néerlandais', 'Russe', 'Hindi', 'Indonésien', 'Autre',
]
const LANGUAGES_LIST_EN = [
  'French', 'English', 'Spanish', 'German', 'Mandarin', 'Arabic',
  'Italian', 'Portuguese', 'Japanese', 'Korean', 'Dutch', 'Russian', 'Hindi', 'Indonesian', 'Other',
]

const DURATIONS = [
  { value: '3', fr: '3 mois', en: '3 months' },
  { value: '4', fr: '4 mois', en: '4 months' },
  { value: '5', fr: '5 mois', en: '5 months' },
  { value: '6', fr: '6 mois', en: '6 months' },
  { value: '7', fr: '+6 mois', en: '+6 months' },
]

const TOUCHPOINTS = [
  { value: 'Instagram', fr: 'Instagram', en: 'Instagram' },
  { value: 'TikTok', fr: 'TikTok', en: 'TikTok' },
  { value: 'Facebook', fr: 'Facebook', en: 'Facebook' },
  { value: 'Google', fr: 'Google', en: 'Google' },
  { value: 'Bouche à oreille', fr: 'Bouche à oreille', en: 'Word of mouth' },
  { value: 'École', fr: 'École', en: 'School' },
  { value: 'Ambassadeur Bali Interns', fr: 'Ambassadeur Bali Interns', en: 'Bali Interns Ambassador' },
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
  { flag: '\u{1F1E6}\u{1F1EA}', code: '+971', name: 'UAE' },
  { flag: '\u{1F1F2}\u{1F1E6}', code: '+212', name: 'Morocco' },
  { flag: '\u{1F1E9}\u{1F1FF}', code: '+213', name: 'Algeria' },
  { flag: '\u{1F1F9}\u{1F1F3}', code: '+216', name: 'Tunisia' },
  { flag: '\u{1F1F8}\u{1F1F3}', code: '+221', name: 'Senegal' },
  { flag: '\u{1F1E7}\u{1F1F7}', code: '+55', name: 'Brazil' },
  { flag: '\u{1F1EE}\u{1F1E9}', code: '+62', name: 'Indonesia' },
  { flag: '\u{1F1EE}\u{1F1F3}', code: '+91', name: 'India' },
  { flag: '\u{1F1E6}\u{1F1FA}', code: '+61', name: 'Australia' },
]

// Expected phone number lengths (digits only, without country code) by country code
const PHONE_EXPECTED_LENGTHS: Record<string, number[]> = {
  '+33': [9],       // France: 6XXXXXXXX
  '+44': [10],      // UK: 7XXXXXXXXX
  '+1': [10],       // US/Canada
  '+49': [10, 11],  // Germany
  '+34': [9],       // Spain
  '+39': [9, 10],   // Italy
  '+351': [9],      // Portugal
  '+32': [8, 9],    // Belgium
  '+41': [9],       // Switzerland
  '+31': [9],       // Netherlands
  '+212': [9],      // Morocco
  '+213': [9],      // Algeria
  '+216': [8],      // Tunisia
  '+221': [9],      // Senegal
  '+62': [9, 10, 11, 12], // Indonesia
  '+91': [10],      // India
  '+61': [9],       // Australia
  '+55': [10, 11],  // Brazil
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// ─── Component ─────────────────────────────────────────────────

export function MobileApply({
  form, setForm, lang, setLang, onSubmit, submitting, error,
  price, jobTypes, cvUploading, cvLocalUploading, onCvUpload, onCvLocalUpload, desktopStep,
}: MobileApplyProps) {
  const [currentQ, setCurrentQ] = useState(() => {
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('apply_mobile_step_v1') : null
      if (saved) return Math.max(0, parseInt(saved, 10) || 0)
    } catch { /* ignore */ }
    // Si pas de step mobile sauvegardé, utiliser le step desktop comme point de départ
    const mapping: Record<number, number> = { 0: 0, 1: 6, 2: 10, 3: 16, 4: 19 }
    return 0 // Sera mis à jour par useEffect après le mount
  })
  const [fieldError, setFieldError] = useState('')
  const [fieldTouched, setFieldTouched] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [phoneDropOpen, setPhoneDropOpen] = useState(false)
  const [schoolResults, setSchoolResults] = useState<School[]>([])
  const [cvEnUploadingLocal, setCvEnUploadingLocal] = useState(false)
  const [cvLocalUploadingLocal, setCvLocalUploadingLocal] = useState(false)
  const [isSearchingSchool, setIsSearchingSchool] = useState(false)
  const [emailExists, setEmailExists] = useState(false)
  const [emailChecking, setEmailChecking] = useState(false)
  const [animDir, setAnimDir] = useState<'forward' | 'back'>('forward')
  const [visible, setVisible] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const cvEnRef = useRef<HTMLInputElement>(null)
  const cvLocalRef = useRef<HTMLInputElement>(null)
  const searchSchoolsTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const emailCheckTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Save step to localStorage ──

  // Sync depuis step desktop au premier rendu
  useEffect(() => {
    try {
      const saved = localStorage.getItem('apply_mobile_step_v1')
      if (!saved && desktopStep && desktopStep > 0) {
        const mapping: Record<number, number> = { 0: 0, 1: 6, 2: 10, 3: 16, 4: 19 }
        setCurrentQ(mapping[desktopStep] ?? 0)
      }
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('apply_mobile_step_v1', String(currentQ))
      // Sync step desktop : mapping inverse question mobile → step desktop
      const reverseMap = [
        [0,5,0],[6,9,1],[10,15,2],[16,18,2],[19,19,3],[20,20,4]
      ]
      for (const [min, max, dStep] of reverseMap) {
        if (currentQ >= min && currentQ <= max) {
          localStorage.setItem('apply_desktop_step_v1', String(dStep))
          break
        }
      }
    } catch {}
  }, [currentQ])

  // ── Question list ──
  const SEC_ID = { fr: 'Identité', en: 'Identity' }
  const SEC_PR = { fr: 'Profil', en: 'Profile' }
  const SEC_ST = { fr: 'Stage', en: 'Internship' }
  const SEC_EN = { fr: 'Engagement', en: 'Commitment' }
  const SEC_RD = { fr: 'RDV', en: 'Booking' }

  // ORDRE = Desktop: ce que tu cherches FIRST (pour capture lead), puis identité, profil, stage, prix, RDV
  const questions: Question[] = [
    // ── BLOC 1: Ce que tu cherches (lead capture prioritaire) ──
    { id: 'email', type: 'email', label: 'Ton adresse email ?', labelEn: 'Your email address?', field: 'email', required: true, helper: "On t'enverra la confirmation ici", helperEn: "We'll send your confirmation here", section: 'Ce que tu cherches', sectionEn: 'What you are looking for' },
    { id: 'desired_jobs', type: 'chips', label: 'Métiers souhaités ? (max 3)', labelEn: 'Desired positions? (max 3)', field: 'desired_jobs', required: true, maxSelect: 3, section: 'Ce que tu cherches', sectionEn: 'What you are looking for' },
    { id: 'duration', type: 'chips', label: 'Durée souhaitée du stage ?', labelEn: 'Desired internship duration?', field: 'duration', required: true, section: 'Ce que tu cherches', sectionEn: 'What you are looking for' },
    { id: 'start_date', type: 'date', label: 'Date de démarrage souhaitée ?', labelEn: 'Desired start date?', field: 'start_date', required: false, helper: "À 2-4 semaines près, c'est ok", helperEn: 'Give or take 2-4 weeks, that\'s fine', section: 'Ce que tu cherches', sectionEn: 'What you are looking for' },
    { id: 'touchpoints', type: 'chips', label: 'Comment tu as connu Bali Interns ?', labelEn: 'How did you hear about us?', field: 'touchpoints', required: false, section: 'Ce que tu cherches', sectionEn: 'What you are looking for' },
    { id: 'referral_code', type: 'text', label: 'Tu as un code parrain ?', labelEn: 'Do you have a referral code?', field: 'referred_by_code', required: false, skip: (f) => !f.touchpoints.includes('Ambassadeur Bali Interns'), section: 'Ce que tu cherches', sectionEn: 'What you are looking for' },
    // ── BLOC 2: Qui es-tu (identité) ──
    { id: 'name_pair', type: 'name_pair', label: 'Prénom & Nom', labelEn: 'First & Last name', field: 'first_name', required: true, section: SEC_ID.fr, sectionEn: SEC_ID.en },
    { id: 'whatsapp', type: 'tel_whatsapp', label: 'Ton numéro WhatsApp ?', labelEn: 'Your WhatsApp number?', field: 'whatsapp_number', required: true, helper: "Tout le monde à Bali l'utilise ! Nous communiquerons aussi ensemble via WhatsApp pour faciliter nos échanges.", helperEn: 'Everyone uses it in Bali! We will also communicate with you via WhatsApp throughout the process.', section: SEC_ID.fr, sectionEn: SEC_ID.en },
    { id: 'nationalities', type: 'chips', label: 'Ta ou tes nationalités ?', labelEn: 'Your nationality(ies)?', field: 'nationalities', required: true, options: COUNTRIES, section: SEC_ID.fr, sectionEn: SEC_ID.en },
    { id: 'dates_identity', type: 'date_pair', label: 'Dates importantes', labelEn: 'Important dates', field: 'birth_date', required: true, section: SEC_ID.fr, sectionEn: SEC_ID.en },
    { id: 'school_country', type: 'select', label: 'Pays où tu fais tes études ?', labelEn: 'Country where you study?', field: 'school_country', required: true, options: COUNTRIES, helper: 'Détermine le type de convention de stage', helperEn: 'Determines your internship agreement type', section: SEC_ID.fr, sectionEn: SEC_ID.en },
    // ── BLOC 3: Ton profil ──
    { id: 'linkedin_school', type: 'linkedin_school', label: 'École & LinkedIn', labelEn: 'School & LinkedIn', field: 'school_name', required: false, section: SEC_PR.fr, sectionEn: SEC_PR.en },
    { id: 'cv_pair', type: 'cv_pair', label: 'CV en anglais * (PDF/DOC/JPG, max 20MB)', labelEn: 'English CV * (PDF/DOC/JPG, max 20MB)', field: 'cv_en_file', required: true, helper: 'Même format que la version desktop', helperEn: 'Same format as desktop version', section: SEC_PR.fr, sectionEn: SEC_PR.en },
    { id: 'spoken_languages', type: 'chips', label: 'Tes langues de travail ?', labelEn: 'Your working languages?', field: 'spoken_languages', required: true, section: SEC_PR.fr, sectionEn: SEC_PR.en },
    // ── BLOC 4: Ton stage idéal ──
    { id: 'stage_ideal', type: 'textarea', label: 'Ton stage idéal en quelques lignes', labelEn: 'Your ideal internship in a few lines', field: 'stage_ideal', required: true, section: SEC_ST.fr, sectionEn: SEC_ST.en },
    // ── BLOC 5: Engagement & prix ──
    { id: 'commitment', type: 'checkbox_group', label: 'Engagement & tarif', labelEn: 'Commitment & pricing', field: 'commitment_price', required: true, section: SEC_EN.fr, sectionEn: SEC_EN.en },
    // ── BLOC 6: RDV ──
    { id: 'schedule', type: 'schedule', label: 'Réserve ton appel de qualification gratuit', labelEn: 'Book your free qualification call', field: 'rdv_slot', required: false, section: SEC_RD.fr, sectionEn: SEC_RD.en },
  ]

  // Filter out skipped questions
  const activeQuestions = questions.filter(q => !q.skip || !q.skip(form))
  const totalQ = activeQuestions.length
  const safeIdx = Math.min(currentQ, totalQ - 1)
  const question = activeQuestions[safeIdx] || activeQuestions[activeQuestions.length - 1]

  // ── Autofocus on question change ──
  useEffect(() => {
    setFieldError('')
    setFieldTouched(false)
    setSearchText('')
    const timer = setTimeout(() => {
      const el = document.querySelector<HTMLElement>(
        'input:not([type="file"]):not([type="checkbox"]):not([type="hidden"]), textarea'
      )
      el?.focus()
    }, 250)
    return () => clearTimeout(timer)
  }, [currentQ])

  // ── Email check debounced ──
  useEffect(() => {
    if (emailCheckTimeout.current) clearTimeout(emailCheckTimeout.current)
    if (!form.email || !isValidEmail(form.email)) {
      setEmailExists(false)
      setEmailChecking(false)
      return
    }
    setEmailChecking(true)
    emailCheckTimeout.current = setTimeout(() => {
      const controller = new AbortController()
      const timeout = setTimeout(() => { controller.abort(); setEmailChecking(false) }, 3000)
      fetch('/api/check-email?email=' + encodeURIComponent(form.email), { signal: controller.signal })
        .then(r => r.ok ? r.json() : { exists: false })
        .then((d: { exists: boolean }) => {
          setEmailExists(!!d.exists)
          setEmailChecking(false)
          if (!d.exists) {
            fetch('/api/applications/capture-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: form.email.toLowerCase().trim(),
                source: 'website_form_unfinished',
                form_step: 0,
              }),
            }).catch(() => null)
          }
        })
        .catch(() => { setEmailExists(false); setEmailChecking(false) })
        .finally(() => clearTimeout(timeout))
    }, 600)
    return () => { if (emailCheckTimeout.current) clearTimeout(emailCheckTimeout.current) }
  }, [form.email])

  // ── Fillout iframe URL avec params dans le src (même méthode que desktop) ──
  const filloutIframeSrc = useMemo(() => {
    if (question.type !== 'schedule') return ''
    const fullName = `${form.first_name} ${form.last_name}`.trim()
    const params = new URLSearchParams()
    if (form.email) { params.set('Email', form.email); params.set('email', form.email) }
    if (fullName) { params.set('Name', fullName); params.set('name', fullName) }
    if (form.first_name) params.set('firstName', form.first_name)
    if (form.last_name) params.set('lastName', form.last_name)
    return `https://form.fillout.com/t/gn4Zg9eydFus?${params.toString()}`
  }, [question.type, form.first_name, form.last_name, form.email])

  // ── Auto-avance la page Fields de Fillout via postMessage ──
  useEffect(() => {
    if (question.type !== 'schedule') return
    function handleFilloutMsg(e: MessageEvent) {
      if (
        e.data?.type === 'fillout:pageChange' ||
        e.data?.type === 'fillout:loaded' ||
        e.data?.type === 'fillout:ready' ||
        (e.data?.type && typeof e.data.type === 'string' && e.data.type.startsWith('fillout:'))
      ) {
        const pageIndex = e.data?.pageIndex ?? e.data?.page ?? e.data?.currentPage
        if (pageIndex === 0 || pageIndex === undefined) {
          const iframe = document.querySelector('iframe[src*="fillout"]') as HTMLIFrameElement | null
          if (iframe?.contentWindow) {
            iframe.contentWindow.postMessage({ type: 'fillout:next' }, '*')
            iframe.contentWindow.postMessage({ action: 'next' }, '*')
          }
        }
      }
    }
    window.addEventListener('message', handleFilloutMsg)
    const t = setTimeout(() => {
      const iframe = document.querySelector('iframe[src*="fillout"]') as HTMLIFrameElement | null
      if (iframe?.contentWindow) {
        iframe.contentWindow.postMessage({ type: 'fillout:next' }, '*')
        iframe.contentWindow.postMessage({ action: 'next' }, '*')
      }
    }, 1500)
    return () => { clearTimeout(t); window.removeEventListener('message', handleFilloutMsg) }
  }, [question.type])

  // ── Helpers ──
  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function setSchoolQ(q: string) {
    if (q.length < 2) { setSchoolResults([]); return }
    if (searchSchoolsTimeout.current) clearTimeout(searchSchoolsTimeout.current)
    const country = form.school_country ? `&country=${encodeURIComponent(form.school_country)}` : ''
    searchSchoolsTimeout.current = setTimeout(() => {
      fetch(`/api/public/schools?q=${encodeURIComponent(q)}${country}`)
        .then(r => r.ok ? r.json() : [])
        .then((data: School[]) => setSchoolResults(Array.isArray(data) ? data : []))
        .catch(() => setSchoolResults([]))
    }, 400)
  }

  async function handleFileUpload(file: File, type: 'cv_en' | 'cv_local') {
    if (file.size > 20 * 1024 * 1024) { return }
    const isEn = type === 'cv_en'
    if (isEn) { set('cv_en_file', file); set('cv_en_filename', file.name); setCvEnUploadingLocal(true) }
    else { set('cv_local_file', file); set('cv_local_filename', file.name); setCvLocalUploadingLocal(true) }
    try {
      const fd = new FormData(); fd.append('file', file)
      const r = await fetch('/api/upload', { method: 'POST', body: fd })
      if (!r.ok) throw new Error('Upload failed')
      const d = await r.json() as { url: string }
      if (isEn) set('cv_url', d.url)
      else set('local_cv_url', d.url)
    } catch { /* ignore */ } finally {
      if (isEn) setCvEnUploadingLocal(false)
      else setCvLocalUploadingLocal(false)
    }
  }

  function toggleArray(key: 'nationalities' | 'spoken_languages' | 'desired_jobs' | 'touchpoints', value: string, max?: number) {
    setForm(f => {
      const arr = (f[key] as string[]) ?? []
      if (arr.includes(value)) return { ...f, [key]: arr.filter((v: string) => v !== value) }
      if (max && arr.length >= max) return f
      return { ...f, [key]: [...arr, value] }
    })
  }

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
  }, [form.school_country])

  // ── WhatsApp validation ──
  function getPhoneValidation(): { valid: boolean; message: string } | null {
    const digits = form.whatsapp_number.replace(/\D/g, '')
    if (!digits) return null
    const expected = PHONE_EXPECTED_LENGTHS[form.whatsapp_code]
    if (!expected) return digits.length >= 6 ? { valid: true, message: '' } : null
    const isValid = expected.includes(digits.length)
    if (isValid) return { valid: true, message: lang === 'fr' ? 'Numéro valide' : 'Valid number' }
    const expectedStr = expected.join(' ou ')
    return {
      valid: false,
      message: lang === 'fr'
        ? `${expectedStr} chiffres attendus (actuellement ${digits.length})`
        : `${expectedStr} digits expected (currently ${digits.length})`,
    }
  }

  // ── Can advance? ──
  function canGoNext(): boolean {
    const q = question
    const val = form[q.field]

    // Nouveaux types groupés
    if (q.type === 'name_pair') return !!(form.first_name.trim() && form.last_name.trim())
    if (q.type === 'date_pair') return !!(form.birth_date && form.passport_expiry)
    if (q.type === 'cv_pair') return !!(form.cv_en_file || form.cv_url)
    if (q.type === 'linkedin_school') return true

    if (q.type === 'schedule') return true
    if (!q.required) return true

    switch (q.type) {
      case 'text':
      case 'email':
      case 'textarea':
        if (!(val as string)?.trim()) return false
        if (q.type === 'email' && !isValidEmail(val as string)) return false
        if (q.type === 'email' && emailExists) return false
        if (q.type === 'email' && emailChecking) return false
        return true
      case 'tel_whatsapp':
        return !!(form.whatsapp_number?.trim())
      case 'date':
        return !!(val as string)
      case 'select':
        return !!(val as string)
      case 'chips': {
        const arr = val as string[]
        return arr && arr.length > 0
      }
      case 'file':
        if (q.id === 'cv_en') return !!(form.cv_en_file || form.cv_url)
        if (q.id === 'cv_local') return !!(form.cv_local_file || form.local_cv_url)
        return true
      case 'checkbox_group':
        return !!(form.commitment_price && form.commitment_budget && form.commitment_terms)
      default:
        return true
    }
  }

  function goNext() {
    setFieldError('')
    if (question.id === 'commitment') {
      setAnimDir('forward')
      setVisible(false)
      void onSubmit().then(() => {
        setTimeout(() => {
          if (safeIdx < totalQ - 1) setCurrentQ(safeIdx + 1)
          setVisible(true)
        }, 150)
      })
      return
    }
    if (!canGoNext() && question.required) {
      setFieldError(lang === 'fr' ? 'Ce champ est requis' : 'This field is required')
      return
    }
    setAnimDir('forward')
    setVisible(false)
    if (form.email && isValidEmail(form.email) && !emailExists) {
      fetch('/api/applications/capture-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email.toLowerCase().trim(),
          source: 'website_form_unfinished',
          form_step: safeIdx + 1,
          first_name: form.first_name || undefined,
          last_name: form.last_name || undefined,
          desired_jobs: form.desired_jobs?.length ? form.desired_jobs : undefined,
          desired_start_date: form.start_date || undefined,
          school_country: form.school_country || undefined,
          spoken_languages: form.spoken_languages?.length ? form.spoken_languages : undefined,
          touchpoint: form.touchpoints?.[0] || undefined,
        }),
      }).catch(() => null)
    }
    setTimeout(() => {
      if (safeIdx < totalQ - 1) setCurrentQ(safeIdx + 1)
      setVisible(true)
    }, 150)
  }

  function goPrev() {
    if (safeIdx > 0) {
      setFieldError('')
      setAnimDir('back')
      setVisible(false)
      setTimeout(() => {
        setCurrentQ(safeIdx - 1)
        setVisible(true)
      }, 150)
    }
  }

  const isLastQuestion = question.id === 'commitment'
  const isSchedule = question.type === 'schedule'

  const selectedPhone = COUNTRY_PHONE_CODES.find(c => c.code === form.whatsapp_code) ?? COUNTRY_PHONE_CODES[0]
  const phoneValidation = getPhoneValidation()

  // ── Input base style (border-bottom) ──
  const inputBaseClass = 'w-full px-1 py-4 bg-transparent border-0 border-b-2 border-zinc-200 text-[16px] text-[#1a1918] placeholder-zinc-400 focus:outline-none focus:border-[#c8a96e] transition-colors'

  // ── Render field by type ──
  function renderField() {
    const q = question
    const inputCls = 'w-full px-0 py-3 border-b-2 border-zinc-200 focus:border-[#c8a96e] bg-transparent text-xl text-[#1a1918] outline-none placeholder-zinc-300 transition-colors'

    // ── Nouveaux types groupés ──

    if (q.type === 'name_pair') {
      return (
        <div className="space-y-5">
          <div>
            <label className="block text-sm text-zinc-400 mb-1">{lang === 'fr' ? 'Prénom *' : 'First name *'}</label>
            <input autoFocus type="text" value={form.first_name}
              onChange={e => set('first_name', e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (document.getElementById('mobile-last-name') as HTMLInputElement)?.focus()}
              className={inputCls} placeholder={lang === 'fr' ? 'ex: Jean' : 'e.g. John'} />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">{lang === 'fr' ? 'Nom *' : 'Last name *'}</label>
            <input id="mobile-last-name" type="text" value={form.last_name}
              onChange={e => set('last_name', e.target.value)}
              onKeyDown={e => e.key === 'Enter' && goNext()}
              className={inputCls} placeholder={lang === 'fr' ? 'ex: Dupont' : 'e.g. Smith'} />
          </div>
        </div>
      )
    }

    if (q.type === 'date_pair') {
      return (
        <div className="space-y-5">
          <div>
            <label className="block text-sm text-zinc-400 mb-1">{lang === 'fr' ? 'Date de naissance *' : 'Date of birth *'}</label>
            <DatePickerInput
              value={form.birth_date}
              onChange={v => set('birth_date', v)}
              lang={lang}
              defaultYear={2007}
              minYear={1990}
              maxYear={new Date().getFullYear() - 16}
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">{lang === 'fr' ? 'Expiration passeport *' : 'Passport expiry *'}</label>
            <DatePickerInput
              value={form.passport_expiry}
              onChange={v => set('passport_expiry', v)}
              lang={lang}
              defaultYear={new Date().getFullYear()}
              minYear={new Date().getFullYear()}
              maxYear={new Date().getFullYear() + 15}
            />
            <p className="text-xs text-amber-600 mt-2">⚠️ {lang === 'fr' ? 'Doit être valide 6 mois après ton arrivée à Bali' : 'Must be valid 6+ months after arrival in Bali'}</p>
          </div>
        </div>
      )
    }

    if (q.type === 'cv_pair') {
      const isAnglophone = ['Royaume-Uni','Irlande','États-Unis','Canada','Australie','Nouvelle-Zélande','Singapour','United Kingdom','United States','Australia','Ireland','New Zealand','Singapore'].some(a => form.school_country === a)
      return (
        <div className="space-y-5">
          <div>
            <label className="block text-sm text-zinc-400 mb-2">{lang === 'fr' ? 'CV en anglais *' : 'English CV *'} <span className="text-zinc-300">PDF, DOC, JPG · max 20MB</span></label>
            <input ref={cvEnRef} type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.odt,.rtf" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f, 'cv_en') }} />
            <button type="button" onClick={() => cvEnRef.current?.click()}
              className={`w-full py-5 rounded-2xl border-2 border-dashed text-center ${(form.cv_en_filename || form.cv_url) ? 'border-[#c8a96e] bg-amber-50' : 'border-zinc-200 bg-zinc-50'}`}>
              {cvEnUploadingLocal
                ? <span className="text-sm text-[#c8a96e]">⏳ Upload...</span>
                : (form.cv_en_filename || form.cv_url)
                  ? <span className="text-sm text-[#c8a96e] font-medium">✓ {form.cv_en_filename || 'CV uploadé'}</span>
                  : <span className="text-sm text-zinc-400">{lang === 'fr' ? '📄 Appuie pour sélectionner' : '📄 Tap to select'}</span>}
            </button>
          </div>
          {!isAnglophone && (
            <div>
              <label className="block text-sm text-zinc-400 mb-2">{lang === 'fr' ? 'CV en français (optionnel)' : 'Local language CV (optional)'}</label>
              <input ref={cvLocalRef} type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.odt,.rtf" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f, 'cv_local') }} />
              <button type="button" onClick={() => cvLocalRef.current?.click()}
                className={`w-full py-5 rounded-2xl border-2 border-dashed text-center ${(form.cv_local_filename || form.local_cv_url) ? 'border-[#c8a96e] bg-amber-50' : 'border-zinc-200 bg-zinc-50'}`}>
                {cvLocalUploadingLocal
                  ? <span className="text-sm text-[#c8a96e]">⏳ Upload...</span>
                  : (form.cv_local_filename || form.local_cv_url)
                    ? <span className="text-sm text-[#c8a96e] font-medium">✓ {form.cv_local_filename || 'CV uploadé'}</span>
                    : <span className="text-sm text-zinc-400">{lang === 'fr' ? '📄 Appuie pour sélectionner' : '📄 Tap to select'}</span>}
              </button>
            </div>
          )}
        </div>
      )
    }

    if (q.type === 'linkedin_school') {
      return (
        <div className="space-y-5">
          <div>
            <label className="block text-sm text-zinc-400 mb-1">{lang === 'fr' ? 'Profil LinkedIn (optionnel)' : 'LinkedIn profile (optional)'}</label>
            <input autoFocus type="url" value={form.linkedin_url || ''}
              onChange={e => set('linkedin_url', e.target.value)}
              className={inputCls} placeholder="https://linkedin.com/in/..." />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">{lang === 'fr' ? 'École / Université (optionnel)' : 'School / University (optional)'}</label>
            <input type="text" value={form.school_search || form.school_name || ''}
              onChange={e => { set('school_search', e.target.value); set('school_name', e.target.value); setSchoolQ(e.target.value) }}
              className={inputCls} placeholder={lang === 'fr' ? 'Commence à taper...' : 'Start typing...'} />
            {schoolResults.length > 0 && (
              <div className="mt-1 bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-lg max-h-40 overflow-y-auto">
                {schoolResults.map((s: {id:string;name:string}) => (
                  <button key={s.id} type="button"
                    onClick={() => { set('school_name', s.name); set('school_search', s.name); set('school_id', s.id as unknown as null); setSchoolResults([]) }}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-zinc-50 border-b border-zinc-50 last:border-0">{s.name}</button>
                ))}
              </div>
            )}
          </div>
        </div>
      )
    }

    switch (q.type) {
      case 'text':
        if (q.id === 'school_name') {
          return (
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={form.school_name || form.school_search}
                onChange={e => {
                  const v = e.target.value
                  set('school_search', v)
                  set('school_name', '')
                  set('school_id', null)
                  searchSchools(v)
                }}
                className={inputBaseClass}
                placeholder={lang === 'fr' ? 'Rechercher ton école...' : 'Search your school...'}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); goNext() } }}
              />
              {isSearchingSchool && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  <svg className="animate-spin w-4 h-4 text-[#c8a96e]" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                </div>
              )}
              {schoolResults.length > 0 && form.school_search.length >= 2 && !form.school_name && (
                <div className="mt-2 max-h-48 overflow-y-auto bg-white border border-zinc-200 rounded-2xl shadow-lg">
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
                      className="w-full text-left px-4 py-3 text-sm text-[#1a1918] hover:bg-zinc-50 border-b border-zinc-50 last:border-0 min-h-[48px]"
                    >
                      <span className="font-medium">{s.name}</span>
                      {s.city && <span className="text-zinc-500"> — {s.city}{s.country ? `, ${s.country}` : ''}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        }
        return (
          <input
            ref={inputRef}
            type="text"
            value={(form[q.field] as string) ?? ''}
            onChange={e => set(q.field, e.target.value as never)}
            className={inputBaseClass}
            placeholder={lang === 'fr' ? (q.hint || '') : (q.hintEn || '')}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); goNext() } }}
          />
        )

      case 'email':
        return (
          <div>
            <input
              ref={inputRef}
              type="email"
              inputMode="email"
              autoComplete="email"
              value={(form[q.field] as string) ?? ''}
              onChange={e => set(q.field, e.target.value as never)}
              className={`${inputBaseClass} ${form.email && emailExists ? 'border-red-500' : form.email && isValidEmail(form.email) && !emailExists && !emailChecking ? 'border-green-500' : ''}`}
              placeholder="your@email.com"
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); goNext() } }}
            />
            {emailChecking && (
              <p className="text-xs text-zinc-400 mt-2 flex items-center gap-1">
                <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                {lang === 'fr' ? 'Vérification...' : 'Checking...'}
              </p>
            )}
            {emailExists && !emailChecking && (
              <p className="text-xs text-red-600 mt-2 font-medium">
                {lang === 'fr' ? 'Cet email est déjà associé à un dossier.' : 'This email is already linked to an application.'}
              </p>
            )}
            {form.email && isValidEmail(form.email) && !emailExists && !emailChecking && (
              <p className="text-xs text-green-600 mt-2">{'\u2713'} {lang === 'fr' ? 'Email disponible' : 'Email available'}</p>
            )}
          </div>
        )

      case 'tel_whatsapp':
        return (
          <div>
            <div className="flex gap-2">
              <div className="relative flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setPhoneDropOpen(o => !o)}
                  className="flex items-center gap-1 px-3 py-4 bg-white border border-zinc-200 rounded-2xl text-sm font-medium text-[#1a1918] whitespace-nowrap min-h-[48px]"
                >
                  <span>{selectedPhone.flag}</span>
                  <span>{selectedPhone.code}</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M19 9l-7 7-7-7"/></svg>
                </button>
                {phoneDropOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setPhoneDropOpen(false)} />
                    <div className="absolute z-50 top-full left-0 mt-1 w-64 max-h-64 overflow-y-auto bg-white border border-zinc-200 rounded-2xl shadow-lg">
                      {COUNTRY_PHONE_CODES.map((c, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => { set('whatsapp_code', c.code); setPhoneDropOpen(false) }}
                          className={`w-full flex items-center gap-2 px-3 py-3 text-sm hover:bg-zinc-50 text-left min-h-[48px] ${c.code === form.whatsapp_code ? 'text-[#c8a96e] font-medium' : 'text-[#1a1918]'}`}
                        >
                          <span>{c.flag}</span>
                          <span className="text-zinc-500">{c.code}</span>
                          <span className="truncate">{c.name}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <input
                ref={inputRef}
                type="tel"
                inputMode="tel"
                value={form.whatsapp_number}
                onChange={e => set('whatsapp_number', e.target.value)}
                className={`flex-1 ${inputBaseClass}`}
                placeholder="6 12 34 56 78"
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); goNext() } }}
              />
            </div>
            {phoneValidation && (
              <p className={`text-xs mt-2 ${phoneValidation.valid ? 'text-green-600' : 'text-amber-600'}`}>
                {phoneValidation.valid ? '\u2713' : '\u26A0\uFE0F'} {phoneValidation.message || (lang === 'fr' ? 'Numéro valide' : 'Valid number')}
              </p>
            )}
          </div>
        )

      case 'date':
        return (
          <DatePickerInput
            value={(form[q.field] as string) ?? ''}
            onChange={v => set(q.field, v as never)}
            lang={lang}
            defaultYear={new Date().getFullYear()}
            minYear={new Date().getFullYear()}
            maxYear={new Date().getFullYear() + 3}
            minDate={new Date().toISOString().split('T')[0]}
          />
        )

      case 'select':
        return (
          <div>
            {(form[q.field] as string) && (
              <div className="mb-3">
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-[#c8a96e] text-white">
                  {form[q.field] as string}
                  <button type="button" onClick={() => { set(q.field, '' as never); setSearchText('') }} className="hover:text-red-200">&times;</button>
                </span>
              </div>
            )}
            {!(form[q.field] as string) && (
              <>
                <input
                  ref={inputRef}
                  type="text"
                  value={searchText}
                  onChange={e => setSearchText(e.target.value)}
                  className={`${inputBaseClass} mb-3`}
                  placeholder={lang === 'fr' ? 'Rechercher...' : 'Search...'}
                />
                <div className="max-h-56 overflow-y-auto space-y-1.5">
                  {(q.options || [])
                    .filter(o => !searchText || o.toLowerCase().includes(searchText.toLowerCase()))
                    .slice(0, 20)
                    .map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => { set(q.field, opt as never); setSearchText('') }}
                      className="w-full text-left px-4 py-3 rounded-xl text-sm bg-white border border-zinc-200 hover:border-[#c8a96e] active:bg-[#c8a96e]/10 transition-all min-h-[48px]"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )

      case 'chips': {
        const arr = (form[q.field] as string[]) ?? []

        // Nationalities — search-based
        if (q.id === 'nationalities') {
          const filtered = searchText
            ? COUNTRIES.filter(c => c.toLowerCase().includes(searchText.toLowerCase()))
            : COUNTRIES.slice(0, 15)
          return (
            <div>
              {arr.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {arr.map(n => (
                    <span key={n} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium bg-[#c8a96e] text-white">
                      {n}
                      <button type="button" onClick={() => toggleArray('nationalities', n)} className="hover:text-red-200">&times;</button>
                    </span>
                  ))}
                </div>
              )}
              <input
                ref={inputRef}
                type="text"
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                className={`${inputBaseClass} mb-3`}
                placeholder={lang === 'fr' ? 'Rechercher un pays...' : 'Search a country...'}
              />
              <div className="max-h-48 overflow-y-auto space-y-1.5">
                {filtered.slice(0, 20).map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => { toggleArray('nationalities', c); setSearchText('') }}
                    className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all min-h-[48px] ${
                      arr.includes(c)
                        ? 'bg-[#c8a96e] text-white font-medium'
                        : 'bg-white border border-zinc-200 hover:border-[#c8a96e]'
                    }`}
                  >
                    {c} {arr.includes(c) ? '\u2713' : ''}
                  </button>
                ))}
              </div>
            </div>
          )
        }

        // Spoken languages
        if (q.id === 'spoken_languages') {
          const langList = lang === 'fr' ? LANGUAGES_LIST_FR : LANGUAGES_LIST_EN
          return (
            <div className="flex flex-wrap gap-2">
              {langList.map((l, idx) => {
                const value = LANGUAGES_LIST_FR[idx]
                const selected = (form.spoken_languages as string[]).includes(value)
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleArray('spoken_languages', value)}
                    className={`px-4 py-3 rounded-full text-sm font-medium transition-all min-h-[48px] ${
                      selected ? 'bg-[#c8a96e] text-white' : 'bg-white text-[#8a7d6d] border border-zinc-200'
                    }`}
                  >
                    {l}
                  </button>
                )
              })}
            </div>
          )
        }

        // Duration
        if (q.id === 'duration') {
          return (
            <div className="grid grid-cols-2 gap-2">
              {DURATIONS.map(d => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => set('duration', d.value)}
                  className={`py-4 rounded-2xl text-sm font-medium transition-all min-h-[48px] ${
                    form.duration === d.value
                      ? 'bg-[#c8a96e] text-white'
                      : 'bg-white text-[#8a7d6d] border border-zinc-200'
                  }`}
                >
                  {lang === 'fr' ? d.fr : d.en}
                </button>
              ))}
            </div>
          )
        }

        // Job types
        if (q.id === 'desired_jobs') {
          return (
            <div className="flex flex-wrap gap-2">
              {jobTypes.filter(j => j.name_fr !== 'Autre' && j.name_en !== 'Other').map(j => {
                const jLabel = lang === 'fr' ? (j.name_fr || j.name) : (j.name_en || j.name)
                const selected = form.desired_jobs.includes(j.name)
                return (
                  <button
                    key={j.id}
                    type="button"
                    onClick={() => toggleArray('desired_jobs', j.name, 3)}
                    className={`px-4 py-3 rounded-full text-sm font-medium transition-all min-h-[48px] ${
                      selected ? 'bg-[#c8a96e] text-white' : 'bg-white text-[#8a7d6d] border border-zinc-200'
                    }`}
                  >
                    {jLabel}
                  </button>
                )
              })}
              <p className="w-full text-xs text-zinc-400 mt-1">
                {form.desired_jobs.length}/3 {lang === 'fr' ? 'sélectionnés' : 'selected'}
              </p>
            </div>
          )
        }

        // Touchpoints
        if (q.id === 'touchpoints') {
          return (
            <div className="grid grid-cols-1 gap-2">
              {TOUCHPOINTS.map(t => {
                const selected = form.touchpoint === t.value
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => {
                      const next = selected ? [] : [t.value]
                      set('touchpoints', next)
                      set('touchpoint', t.value)
                      if (t.value !== 'Ambassadeur Bali Interns') set('referred_by_code', '')
                    }}
                    className={`py-4 px-4 rounded-2xl text-sm font-medium text-left transition-all flex items-center gap-2 min-h-[48px] ${
                      selected
                        ? 'bg-[#c8a96e] text-white'
                        : 'bg-white text-[#1a1918] border border-zinc-200'
                    }`}
                  >
                    {selected && (
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                      </svg>
                    )}
                    {lang === 'fr' ? t.fr : t.en}
                  </button>
                )
              })}
            </div>
          )
        }

        return null
      }

      case 'file': {
        const fileName = q.id === 'cv_en' ? form.cv_en_filename : form.cv_local_filename
        const uploading = q.id === 'cv_en' ? cvUploading : cvLocalUploading
        const uploaded = q.id === 'cv_en' ? !!form.cv_url : !!form.local_cv_url
        return (
          <div>
            <input
              ref={fileRef}
              type="file"
              accept={q.accept || '.pdf,.doc,.docx'}
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0]
                if (f) {
                  if (f.size > 20 * 1024 * 1024) {
                    setFieldError(lang === 'fr' ? 'Fichier trop volumineux (max 20MB)' : 'File too large (max 20MB)')
                    return
                  }
                  if (q.id === 'cv_en') {
                    set('cv_en_file', f)
                    set('cv_en_filename', f.name)
                    onCvUpload(f)
                  } else {
                    set('cv_local_file', f)
                    set('cv_local_filename', f.name)
                    onCvLocalUpload(f)
                  }
                }
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className={`w-full py-12 border-2 border-dashed rounded-2xl text-center transition-all min-h-[48px] ${
                fileName
                  ? 'border-[#c8a96e] bg-[#c8a96e]/10'
                  : 'border-zinc-200 bg-white active:bg-zinc-50'
              }`}
            >
              {uploading ? (
                <div className="flex items-center justify-center gap-2 text-[#c8a96e]">
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  <span className="text-sm font-medium">{lang === 'fr' ? 'Upload en cours...' : 'Uploading...'}</span>
                </div>
              ) : fileName ? (
                <div>
                  <span className="text-sm text-[#c8a96e] font-medium">{fileName}</span>
                  {uploaded && <p className="text-xs text-green-600 mt-1">{'\u2713'} {lang === 'fr' ? 'Uploadé' : 'Uploaded'}</p>}
                </div>
              ) : (
                <div>
                  <svg className="w-8 h-8 mx-auto mb-2 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.338-2.32 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z"/>
                  </svg>
                  <span className="text-sm text-zinc-500">
                    {lang === 'fr' ? 'Appuie pour choisir un fichier' : 'Tap to select a file'}
                  </span>
                </div>
              )}
            </button>
          </div>
        )
      }

      case 'textarea':
        return (
          <textarea
            ref={inputRef as unknown as React.RefObject<HTMLTextAreaElement>}
            value={(form[q.field] as string) ?? ''}
            onChange={e => set(q.field, e.target.value as never)}
            rows={5}
            maxLength={1000}
            placeholder={lang === 'fr'
              ? 'Objectifs, compétences, types d\'entreprises...'
              : 'Goals, skills, company types...'}
            className="w-full px-1 py-4 bg-transparent border-0 border-b-2 border-zinc-200 text-[16px] text-[#1a1918] placeholder-zinc-400 focus:outline-none focus:border-[#c8a96e] transition-colors resize-none"
          />
        )

      case 'checkbox_group':
        return (
          <div className="space-y-4">
            {/* Price card */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-5 mb-4">
              <div className="text-center mb-3">
                <p className="text-3xl font-bold text-[#c8a96e]">{price}{'\u20ac'}</p>
                <p className="text-xs text-zinc-500 mt-1">{lang === 'fr' ? 'TTC' : 'Tax included'}</p>
              </div>
              <p className="text-sm text-[#8a7d6d] leading-relaxed">
                {lang === 'fr'
                  ? `Le service Bali Interns coûte ${price}\u20ac TTC. Paiement uniquement après signature de la convention — avant ça, 0\u20ac.`
                  : `Bali Interns costs \u20ac${price} (tax incl.). Payment only after internship agreement is signed — before that, \u20ac0.`}
              </p>
            </div>

            {/* Ce qui est inclus */}
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 mb-2">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                {lang === 'fr' ? 'Ce qui est inclus' : "What's included"}
              </p>
              <ul className="space-y-1.5">
                {[
                  [lang === 'fr' ? '🎯 Matching personnalisé avec nos entreprises partenaires' : '🎯 Personalized matching with our partner companies'],
                  [lang === 'fr' ? "🛂 Procédure visa stagiaire + offres partenaires (eSIM, logement, scooter, activités)" : '🛂 Visa procedure + partner offers (eSIM, housing, scooter, activities)'],
                  [lang === 'fr' ? "🚗 Chauffeur à l'aéroport à l'arrivée" : '🚗 Airport pickup on arrival'],
                  [lang === 'fr' ? '💬 Support WhatsApp tout au long du stage' : '💬 WhatsApp support throughout the internship'],
                ].map((item, i) => (
                  <li key={i} className="text-sm text-zinc-700 flex items-start gap-1.5">
                    <span className="flex-shrink-0">{item[0].split(' ')[0]}</span>
                    <span>{item[0].split(' ').slice(1).join(' ')}</span>
                  </li>
                ))}
              </ul>
            </div>

            <label className="flex items-start gap-3 cursor-pointer min-h-[48px]">
              <input
                type="checkbox"
                checked={form.commitment_price}
                onChange={e => set('commitment_price', e.target.checked)}
                className="mt-0.5 w-6 h-6 rounded accent-[#c8a96e] flex-shrink-0"
              />
              <span className="text-sm text-[#8a7d6d] leading-relaxed">
                {lang === 'fr'
                  ? `Je confirme avoir compris le prix (${price}\u20ac TTC) et que le paiement intervient après signature.`
                  : `I confirm I understand the price (\u20ac${price} incl. tax) and payment happens only after signing.`}
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer min-h-[48px]">
              <input
                type="checkbox"
                checked={form.commitment_budget}
                onChange={e => set('commitment_budget', e.target.checked)}
                className="mt-0.5 w-6 h-6 rounded accent-[#c8a96e] flex-shrink-0"
              />
              <span className="text-sm text-[#8a7d6d] leading-relaxed">
                {lang === 'fr'
                  ? `Je confirme disposer du budget pour régler ${price}\u20ac TTC.`
                  : `I confirm I have the budget to pay \u20ac${price} incl. tax.`}
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer min-h-[48px]">
              <input
                type="checkbox"
                checked={form.commitment_terms}
                onChange={e => set('commitment_terms', e.target.checked)}
                className="mt-0.5 w-6 h-6 rounded accent-[#c8a96e] flex-shrink-0"
              />
              <span className="text-sm text-[#8a7d6d] leading-relaxed">
                {lang === 'fr'
                  ? 'Je confirme avoir pris connaissance des éléments contractuels.'
                  : 'I confirm I have read the contractual terms.'}
              </span>
            </label>

            <p className="text-[11px] text-[#5a5347] leading-relaxed mt-4">
              {lang === 'fr'
                ? "En validant : (1) Tu autorises Bali Interns à partager les informations avec nos partenaires. (2) Tu t'engages à ne pas signer en dehors de notre processus. (3) La suite passe par la prise de rendez-vous."
                : "By submitting: (1) You authorize sharing info with partners. (2) You agree not to sign outside our process. (3) Next step is booking a call."}
            </p>
          </div>
        )

      case 'schedule':
        return (
          <div>
            <p className="text-xl font-bold text-[#1a1918] mb-4 leading-snug">
              {lang === 'fr'
                ? 'Réserve un Google Meet de 45 min avec nous pour confirmer ta candidature'
                : 'Book a 45-min Google Meet with us to confirm your application'}
            </p>
            {/* Booking native — remplace Fillout */}
            <NativeBookingEmbed
              firstName={form.first_name}
              lastName={form.last_name}
              email={form.email}
              phone={`${form.whatsapp_code}${form.whatsapp_number}`.trim()}
              lang={lang}
              onConfirmed={(meetLink) => {
                window.location.href = `/apply/confirmation?name=${encodeURIComponent(form.first_name)}&email=${encodeURIComponent(form.email)}&lang=${lang}&rdv=1&meet=${encodeURIComponent(meetLink)}`
              }}
            />
          </div>
        )

      default:
        return null
    }
  }

  // ── Animation style ──
  const transitionStyle: React.CSSProperties = {
    opacity: visible ? 1 : 0,
    transform: visible
      ? 'translateX(0)'
      : animDir === 'forward'
        ? 'translateX(-20px)'
        : 'translateX(20px)',
    transition: 'opacity 150ms ease, transform 150ms ease',
  }

  // ── Main render ──
  return (
    <div className="min-h-screen bg-[#fafaf9] flex flex-col" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Progress bar */}
      <div className="flex-shrink-0">
        <div className="h-1 bg-zinc-100">
          <div
            className="h-full bg-[#c8a96e] transition-all duration-500"
            style={{ width: `${((safeIdx + 1) / totalQ) * 100}%` }}
          />
        </div>
        {/* Section name + counter */}
        <div className="flex items-center justify-between px-6 pt-2">
          <p className="text-xs font-semibold text-[#c8a96e] uppercase tracking-wider">
            {lang === 'fr' ? question.section : question.sectionEn}
          </p>
          <p className="text-xs text-zinc-400">
            {safeIdx + 1}/{totalQ}
          </p>
        </div>
      </div>

      {/* Language toggle */}
      <div className="flex justify-end px-4 pt-2">
        <div className="inline-flex rounded-lg border border-zinc-200 bg-white overflow-hidden text-xs font-medium">
          <button
            onClick={() => setLang('fr')}
            className={`px-3 py-1.5 transition-colors ${lang === 'fr' ? 'bg-[#c8a96e] text-white' : 'text-zinc-500'}`}
          >
            FR
          </button>
          <button
            onClick={() => setLang('en')}
            className={`px-3 py-1.5 transition-colors ${lang === 'en' ? 'bg-[#c8a96e] text-white' : 'text-zinc-500'}`}
          >
            EN
          </button>
        </div>
      </div>

      {/* Question area with animation */}
      <div className="flex-1 flex flex-col justify-start px-6 py-6 overflow-y-auto" style={transitionStyle}>
        {/* Question label */}
        <h2 className="text-2xl font-bold text-[#1a1918] mb-2 leading-tight">
          {lang === 'fr' ? question.label : question.labelEn}
        </h2>

        {/* Helper */}
        {(question.helper || question.helperEn) && (
          <p className="text-sm text-zinc-500 mb-4">
            {lang === 'fr' ? question.helper : question.helperEn}
          </p>
        )}

        {/* Field */}
        <div className="mt-2">
          {renderField()}
        </div>

        {/* Error */}
        {(fieldError || error) && (
          <p className="mt-3 text-sm text-red-600 flex items-center gap-1">
            <span>{'\u26A0\uFE0F'}</span> {fieldError || error}
          </p>
        )}
      </div>

      {/* Bottom navigation — position fixe au bas du viewport */}
      {!isSchedule && (
        <div className="px-6 pt-3 border-t border-zinc-100 bg-[#fafaf9]"
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 50,
            paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))',
          }}>
          <button
            onClick={goNext}
            disabled={(question.required !== false && !canGoNext()) || submitting}
            className="w-full py-4 rounded-2xl text-base font-bold bg-[#c8a96e] text-white disabled:opacity-40 transition-all active:scale-[0.98] min-h-[52px]"
          >
            {submitting
              ? (lang === 'fr' ? 'Envoi en cours...' : 'Submitting...')
              : emailChecking && question.type === 'email'
                ? (lang === 'fr' ? 'Vérification…' : 'Checking…')
                : isLastQuestion
                  ? (lang === 'fr' ? 'Confirmer ma candidature' : 'Submit my application')
                  : (lang === 'fr' ? 'Continuer \u2192' : 'Continue \u2192')}
          </button>

          {safeIdx > 0 && (
            <button onClick={goPrev} className="w-full py-3 text-sm text-zinc-500 mt-2 min-h-[48px]">
              {'\u2190'} {lang === 'fr' ? 'Retour' : 'Back'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
