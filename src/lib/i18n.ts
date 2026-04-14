export type Lang = 'fr' | 'en'

export const translations = {
  fr: {
    'portal.title': 'Mon espace stagiaire',
    'portal.jobs': 'Offres proposées',
    'portal.documents': 'Mes documents',
    'portal.status': 'Mon statut',

    'status.lead': 'Candidature reçue',
    'status.rdv_booked': 'Entretien planifié',
    'status.qualification_done': 'Profil validé',
    'status.job_submitted': 'Offres envoyées',
    'status.job_retained': 'Poste retenu',
    'status.convention_signed': 'Convention signée',
    'status.payment_pending': 'Paiement en attente',
    'status.payment_received': 'Paiement reçu',
    'status.visa_docs_sent': 'Documents visa envoyés',
    'status.visa_in_progress': 'Visa en cours',
    'status.visa_received': 'Visa obtenu',
    'status.active': 'Stage en cours',
    'status.completed': 'Stage terminé',

    'action.interested': 'Je suis intéressé(e)',
    'action.not_interested': 'Pas pour moi',
    'action.upload': 'Télécharger le document',
    'action.view': 'Voir',

    'jobs.proposed': 'Offres proposées pour toi',
    'jobs.no_jobs': 'Aucune offre proposée pour le moment',
    'jobs.duration': 'Durée',
    'jobs.start': 'Début souhaité',
    'jobs.location': 'Lieu',

    'docs.passport': 'Passeport (page photo)',
    'docs.photo': 'Photo identité',
    'docs.bank': 'Relevé bancaire',
    'docs.ticket': 'Billet retour',
    'docs.upload_hint': 'Format: PDF, JPG, PNG — Max 20MB',
  },
  en: {
    'portal.title': 'My intern space',
    'portal.jobs': 'Proposed offers',
    'portal.documents': 'My documents',
    'portal.status': 'My status',

    'status.lead': 'Application received',
    'status.rdv_booked': 'Interview scheduled',
    'status.qualification_done': 'Profile validated',
    'status.job_submitted': 'Offers sent',
    'status.job_retained': 'Position retained',
    'status.convention_signed': 'Agreement signed',
    'status.payment_pending': 'Payment pending',
    'status.payment_received': 'Payment received',
    'status.visa_docs_sent': 'Visa documents sent',
    'status.visa_in_progress': 'Visa in progress',
    'status.visa_received': 'Visa obtained',
    'status.active': 'Internship in progress',
    'status.completed': 'Internship completed',

    'action.interested': 'I am interested',
    'action.not_interested': 'Not for me',
    'action.upload': 'Upload document',
    'action.view': 'View',

    'jobs.proposed': 'Offers proposed for you',
    'jobs.no_jobs': 'No offers proposed yet',
    'jobs.duration': 'Duration',
    'jobs.start': 'Desired start',
    'jobs.location': 'Location',

    'docs.passport': 'Passport (photo page)',
    'docs.photo': 'ID photo',
    'docs.bank': 'Bank statement',
    'docs.ticket': 'Return ticket',
    'docs.upload_hint': 'Format: PDF, JPG, PNG — Max 20MB',
  },
} as const

export type TranslationKey = keyof typeof translations['fr']

export function t(lang: Lang, key: TranslationKey): string {
  return translations[lang][key] ?? translations.en[key] ?? key
}

export function getStoredLang(): Lang {
  if (typeof window === 'undefined') return 'fr'
  return (localStorage.getItem('portal_lang') as Lang | null) ?? 'fr'
}

export function setStoredLang(lang: Lang): void {
  if (typeof window !== 'undefined') localStorage.setItem('portal_lang', lang)
}
