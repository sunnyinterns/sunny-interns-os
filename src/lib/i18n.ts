// ═══════════════════════════════════════════════════════════════
// i18n — Système multilingue Sunny Interns OS
// Langues supportées :
//   - fr  → OS admin + portail candidat
//   - en  → portail candidat (option) + portail employeur
//   - id  → portail agent visa (option EN/ID)
// ═══════════════════════════════════════════════════════════════

export type Lang = 'fr' | 'en' | 'id'
export type PortalLang = 'fr' | 'en'
export type AgentLang = 'en' | 'id'

// ─── Storage helpers ─────────────────────────────────────────────
export function getPortalLang(): PortalLang {
  if (typeof window === 'undefined') return 'fr'
  return (localStorage.getItem('portal_lang') as PortalLang | null) ?? 'fr'
}
export function setPortalLang(lang: PortalLang): void {
  if (typeof window !== 'undefined') localStorage.setItem('portal_lang', lang)
}

export function getAgentLang(): AgentLang {
  if (typeof window === 'undefined') return 'en'
  return (localStorage.getItem('agent_lang') as AgentLang | null) ?? 'en'
}
export function setAgentLang(lang: AgentLang): void {
  if (typeof window !== 'undefined') localStorage.setItem('agent_lang', lang)
}

export function getAdminLang(): PortalLang {
  if (typeof window === 'undefined') return 'fr'
  return (localStorage.getItem('admin_lang') as PortalLang | null) ?? 'fr'
}
export function setAdminLang(lang: PortalLang): void {
  if (typeof window !== 'undefined') localStorage.setItem('admin_lang', lang)
}

// ─── Statuts CRM traduits ────────────────────────────────────────
export const STATUS_LABELS: Record<string, Record<PortalLang, string>> = {
  lead:               { fr: 'Candidature reçue',       en: 'Application received' },
  rdv_booked:         { fr: 'Entretien planifié',       en: 'Interview scheduled' },
  qualification_done: { fr: 'Profil validé',            en: 'Profile validated' },
  job_submitted:      { fr: 'Offres envoyées',          en: 'Offers sent' },
  job_retained:       { fr: 'Poste retenu',             en: 'Position retained' },
  convention_signed:  { fr: 'Convention signée',        en: 'Agreement signed' },
  payment_pending:    { fr: 'Paiement en attente',      en: 'Payment pending' },
  payment_received:   { fr: 'Paiement reçu',            en: 'Payment received' },
  visa_docs_sent:     { fr: 'Documents visa envoyés',   en: 'Visa docs sent' },
  visa_in_progress:   { fr: 'Visa en cours',            en: 'Visa in progress' },
  visa_received:      { fr: 'Visa obtenu',              en: 'Visa obtained' },
  arrival_prep:       { fr: 'Préparation arrivée',      en: 'Arrival prep' },
  active:             { fr: 'Stage en cours',           en: 'Internship active' },
  alumni:             { fr: 'Alumni',                   en: 'Alumni' },
  to_recontact:       { fr: 'À recontacter',            en: 'To recontact' },
  not_interested:     { fr: 'Pas intéressé',            en: 'Not interested' },
  no_job_found:       { fr: 'Aucun poste trouvé',       en: 'No job found' },
  lost:               { fr: 'Perdu',                    en: 'Lost' },
}

export function getStatusLabel(status: string, lang: PortalLang = 'fr'): string {
  return STATUS_LABELS[status]?.[lang] ?? status
}

// ─── Traductions portail candidat (FR/EN) ────────────────────────
export const PORTAL_T = {
  fr: {
    greeting:               (name: string) => `Bonjour ${name} !`,
    dossierEnCours:         'Ton dossier est en cours d\'évaluation',
    rdvBookedMsg:           'Nous en reparlerons lors de ton entretien. En attendant, tu peux compléter ton profil.',
    rdvPendingMsg:          'Notre équipe examine ta candidature et te contactera très prochainement.',
    rdvTitle:               'Ton entretien',
    rdvDateLabel:           'Date et heure',
    joinMeet:               'Rejoindre Google Meet',
    actionsRequises:        'Actions requises',
    offresProposees:        'Offres proposées',
    aucuneOffre:            'Aucune offre proposée pour le moment.',
    oui:                    'Je suis intéressé(e)',
    non:                    'Pas pour moi',
    monProfil:              'Mon profil',
    mesDocuments:           'Mes documents',
    mettrAJourCV:           'Mettre à jour mon CV',
    parrainage:             'Programme parrainage',
    parrainageDesc:         'Gagne 100€ pour chaque ami placé à Bali !',
    voirCode:               'Voir mon code →',
    besoinAide:             'Besoin d\'aide ?',
    besoinAideDesc:         'Notre équipe est disponible sur WhatsApp.',
    contactWA:              'WhatsApp Bali Interns',
    contactEmail:           'Questions ? team@bali-interns.com',
    documentsVisa:          'Documents visa',
    billetAvion:            'Billet d\'avion',
    lettreEngagement:       'Lettre d\'engagement',
    logementScooter:        'Logement & scooter',
    completer:              'Compléter →',
    urgent:                 'URGENT',
    bienvenue:              'Bienvenue à Bali',
    stageEnCours:           'Ton stage est en cours',
    stage:                  'Stage',
    etablissement:          'Établissement',
    dateDebut:              'Date de début',
    dateFin:                'Date de fin',
    duree:                  'Durée',
    mois:                   'mois',
    email:                  'Email',
    whatsapp:               'WhatsApp',
    nationalite:            'Nationalité',
    ddn:                    'Date de naissance',
    passeport:              'N° passeport',
    expiration:             'Expiration',
    ecole:                  'École',
    pays:                   'Pays',
    niveau:                 'Niveau',
    stepCandidature:        'Candidature',
    stepEntretien:          'Entretien',
    stepJobs:               'Jobs',
    stepConvention:         'Convention',
    stepPaiement:           'Paiement',
    stepVisa:               'Visa',
    stepDepart:             'Départ',
    stepBali:               'À Bali !',
  },
  en: {
    greeting:               (name: string) => `Hello ${name}!`,
    dossierEnCours:         'Your application is being reviewed',
    rdvBookedMsg:           'We\'ll discuss everything during your interview. In the meantime, feel free to complete your profile.',
    rdvPendingMsg:          'Our team is reviewing your application and will be in touch very soon.',
    rdvTitle:               'Your interview',
    rdvDateLabel:           'Date and time',
    joinMeet:               'Join Google Meet',
    actionsRequises:        'Required actions',
    offresProposees:        'Proposed offers',
    aucuneOffre:            'No offers proposed yet.',
    oui:                    'I\'m interested',
    non:                    'Not for me',
    monProfil:              'My profile',
    mesDocuments:           'My documents',
    mettrAJourCV:           'Update my CV',
    parrainage:             'Referral program',
    parrainageDesc:         'Earn €100 for each friend placed in Bali!',
    voirCode:               'View my code →',
    besoinAide:             'Need help?',
    besoinAideDesc:         'Our team is available on WhatsApp.',
    contactWA:              'WhatsApp Bali Interns',
    contactEmail:           'Questions? team@bali-interns.com',
    documentsVisa:          'Visa documents',
    billetAvion:            'Flight ticket',
    lettreEngagement:       'Engagement letter',
    logementScooter:        'Housing & scooter',
    completer:              'Complete →',
    urgent:                 'URGENT',
    bienvenue:              'Welcome to Bali',
    stageEnCours:           'Your internship is in progress',
    stage:                  'Internship',
    etablissement:          'School',
    dateDebut:              'Start date',
    dateFin:                'End date',
    duree:                  'Duration',
    mois:                   'months',
    email:                  'Email',
    whatsapp:               'WhatsApp',
    nationalite:            'Nationality',
    ddn:                    'Date of birth',
    passeport:              'Passport no.',
    expiration:             'Expiry',
    ecole:                  'School',
    pays:                   'Country',
    niveau:                 'Level',
    stepCandidature:        'Application',
    stepEntretien:          'Interview',
    stepJobs:               'Jobs',
    stepConvention:         'Agreement',
    stepPaiement:           'Payment',
    stepVisa:               'Visa',
    stepDepart:             'Departure',
    stepBali:               'In Bali!',
  },
} as const

export type PortalTKey = keyof typeof PORTAL_T['fr']

export function tp(lang: PortalLang, key: PortalTKey, ...args: string[]): string {
  const val = PORTAL_T[lang][key]
  if (typeof val === 'function') return (val as (...a: string[]) => string)(...args)
  return val as string
}

// ─── Traductions portail agent visa (EN/ID) ──────────────────────
export const AGENT_T = {
  en: {
    header:             'Visa dossier sent by Bali Interns',
    for:                'For',
    sectionPersonal:    'Personal Information',
    firstName:          'First Name',
    lastName:           'Last Name',
    nationality:        'Nationality',
    dob:                'Date of Birth',
    passportNo:         'Passport Number',
    passportExpiry:     'Passport Expiry',
    motherFirst:        'Mother First Name',
    motherLast:         'Mother Last Name',
    sectionInternship:  'Internship Details',
    school:             'School / University',
    hostCompany:        'Host Company',
    city:               'Internship City',
    startDate:          'Start Date',
    endDate:            'End Date',
    sectionDocuments:   'Documents',
    download:           'Download →',
    missing:            'Missing',
    validated:          'Validated',
    sectionStatus:      'Dossier Status',
    pending:            '📋 Pending confirmation',
    received:           '✅ Dossier received',
    inProgress:         '⏳ In progress',
    completed:          '🎉 Completed',
    issue:              '⚠️ Issue reported',
    btnReceived:        'Mark as received',
    btnInProgress:      'Mark in progress',
    btnCompleted:       'Mark as completed',
    btnIssue:           'Report an issue',
    messageLabel:       'Message to Bali Interns',
    messagePlaceholder: 'Missing document, incorrect information, additional request...',
    send:               'Send message',
    sending:            'Sending…',
    sectionContact:     'Contact Bali Interns',
    contactEmail:       'team@bali-interns.com',
    contactWA:          'WhatsApp Bali Interns',
    footer:             'Confidential document — Bali Interns',
    docPassport:        'Identity / Passport page',
    docPhoto:           'ID photo',
    docBank:            'Bank statement',
    docTicket:          'Return ticket',
    docConvention:      'Internship agreement',
    visaDossier:        'Visa Dossier',
    recentDossiers:     'Recent Dossiers',
    noDossiers:         'No dossiers yet.',
    sentOn:             'Sent on',
    viewedOn:           'Viewed on',
    notViewed:          'Not yet viewed',
  },
  id: {
    header:             'Berkas visa dikirim oleh Bali Interns',
    for:                'Untuk',
    sectionPersonal:    'Informasi Pribadi',
    firstName:          'Nama Depan',
    lastName:           'Nama Belakang',
    nationality:        'Kewarganegaraan',
    dob:                'Tanggal Lahir',
    passportNo:         'Nomor Paspor',
    passportExpiry:     'Kadaluarsa Paspor',
    motherFirst:        'Nama Depan Ibu',
    motherLast:         'Nama Belakang Ibu',
    sectionInternship:  'Detail Magang',
    school:             'Sekolah / Universitas',
    hostCompany:        'Perusahaan Magang',
    city:               'Kota Magang',
    startDate:          'Tanggal Mulai',
    endDate:            'Tanggal Selesai',
    sectionDocuments:   'Dokumen',
    download:           'Unduh →',
    missing:            'Tidak ada',
    validated:          'Tervalidasi',
    sectionStatus:      'Status Berkas',
    pending:            '📋 Menunggu konfirmasi',
    received:           '✅ Berkas diterima',
    inProgress:         '⏳ Sedang diproses',
    completed:          '🎉 Selesai',
    issue:              '⚠️ Masalah dilaporkan',
    btnReceived:        'Tandai sudah diterima',
    btnInProgress:      'Tandai sedang diproses',
    btnCompleted:       'Tandai selesai',
    btnIssue:           'Laporkan masalah',
    messageLabel:       'Pesan untuk Bali Interns',
    messagePlaceholder: 'Dokumen kurang, informasi salah, permintaan tambahan...',
    send:               'Kirim pesan',
    sending:            'Mengirim…',
    sectionContact:     'Kontak Bali Interns',
    contactEmail:       'team@bali-interns.com',
    contactWA:          'WhatsApp Bali Interns',
    footer:             'Dokumen rahasia — Bali Interns',
    docPassport:        'Paspor (halaman foto)',
    docPhoto:           'Foto identitas',
    docBank:            'Rekening koran',
    docTicket:          'Tiket kembali',
    docConvention:      'Perjanjian magang',
    visaDossier:        'Berkas Visa',
    recentDossiers:     'Berkas Terbaru',
    noDossiers:         'Belum ada berkas.',
    sentOn:             'Dikirim pada',
    viewedOn:           'Dilihat pada',
    notViewed:          'Belum dilihat',
  },
} as const

export type AgentTKey = keyof typeof AGENT_T['en']

export function ta(lang: AgentLang, key: AgentTKey): string {
  return AGENT_T[lang][key] ?? AGENT_T.en[key] ?? key
}

// ─── Compatibility alias (legacy) ────────────────────────────────
export const translations = { fr: {}, en: {} }
export function t(lang: PortalLang, key: string): string { return key }
export function getStoredLang(): PortalLang { return getPortalLang() }
export function setStoredLang(lang: PortalLang): void { setPortalLang(lang) }
