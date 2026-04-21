// ============================================================
// TEST METADATA — Source de vérité pour le dashboard
// ============================================================

export type Suite = 'A' | 'B' | 'C' | 'E'

export interface TestMeta {
  id: string
  suite: Suite
  file: string
  title: string
  description: string
}

export interface SuiteMeta {
  suite: Suite
  label: string
  description: string
  color: string
  tests: TestMeta[]
}

export const TEST_SUITES: SuiteMeta[] = [
  {
    suite: 'A',
    label: 'Workflow complet',
    description: 'Lead → Alumni — 29 scénarios bout-en-bout',
    color: '#0d9e75',
    tests: [
      { id: 'A0',  suite: 'A', file: '00-auth.setup.ts',        title: 'Authentification Supabase',                    description: 'Login sidney.ruby@gmail.com' },
      { id: 'A1',  suite: 'A', file: '01-lead.spec.ts',         title: '/fr/cases → candidats visibles',               description: 'Page candidats charge' },
      { id: 'A2',  suite: 'A', file: '01-lead.spec.ts',         title: 'Fiche candidat charge sans 500',               description: 'Clic sur premier candidat' },
      { id: 'A3',  suite: 'A', file: '01-lead.spec.ts',         title: '/fr/notifications → notifications',            description: 'Page notifications accessible' },
      { id: 'A4',  suite: 'A', file: '02-rdv.spec.ts',          title: 'RDV → meet.google.com visible',                description: 'Lucas Bernard – lien Google Meet' },
      { id: 'A5',  suite: 'A', file: '03-qualification.spec.ts',title: '/fr/en-attente → qualification',              description: 'Emma Dupont – RDV à confirmer' },
      { id: 'A6',  suite: 'A', file: '03-qualification.spec.ts',title: 'Portail Lucas via portal_token',              description: 'Portal qualification_done accessible' },
      { id: 'A7',  suite: 'A', file: '04-job-submitted.spec.ts',title: 'Chloé staffing → Bali Digital Hub',            description: 'Job submission visible' },
      { id: 'A8',  suite: 'A', file: '04-job-submitted.spec.ts',title: '/fr/en-attente → employer ou Chloé',           description: 'En attente retour employeur' },
      { id: 'A9',  suite: 'A', file: '04-job-submitted.spec.ts',title: 'Portail Chloé → OUI/NON visible',              description: 'Stagiaire peut accepter/refuser' },
      { id: 'A10', suite: 'A', file: '05-job-retained.spec.ts', title: '/fr/en-attente → convention ou Hugo',          description: 'Upload convention en attente' },
      { id: 'A11', suite: 'A', file: '05-job-retained.spec.ts', title: 'Portail Hugo → upload convention',             description: 'Upload disponible portail' },
      { id: 'A12', suite: 'A', file: '06-convention.spec.ts',   title: '/fr/notifications → Léa visible',              description: 'Notif convention signée' },
      { id: 'A13', suite: 'A', file: '06-convention.spec.ts',   title: 'Léa – onglet Facturation sans 500',            description: 'Tab facturation fonctionnel' },
      { id: 'A14', suite: 'A', file: '06-convention.spec.ts',   title: 'Portail Léa → 1490€ ou IBAN',                  description: 'Paiement visible sur portail' },
      { id: 'A15', suite: 'A', file: '06-convention.spec.ts',   title: 'Portail employeur charge sans 404',            description: 'Portail employeur accessible' },
      { id: 'A16', suite: 'A', file: '07-payment.spec.ts',      title: '/fr/clients → page clients',                   description: 'Page clients après paiement' },
      { id: 'A17', suite: 'A', file: '07-payment.spec.ts',      title: '/fr/en-attente → items en attente',            description: 'Items listés dans en-attente' },
      { id: 'A18', suite: 'A', file: '07-payment.spec.ts',      title: 'Portail Inès sans erreur',                     description: 'Portal payment_received OK' },
      { id: 'A19', suite: 'A', file: '08-visa.spec.ts',         title: '/fr/en-attente → Baptiste ou agent',           description: 'Visa en cours visible' },
      { id: 'A20', suite: 'A', file: '08-visa.spec.ts',         title: 'Portail agent Baptiste charge',                description: 'Portail visa agent accessible' },
      { id: 'A21', suite: 'A', file: '09-visa-received.spec.ts',title: '/fr/notifications → Nathan',                   description: 'Visa reçu → notification' },
      { id: 'A22', suite: 'A', file: '09-visa-received.spec.ts',title: '/fr/en-attente → flight ou Nathan',            description: 'Date vol en attente' },
      { id: 'A23', suite: 'A', file: '09-visa-received.spec.ts',title: 'Portail Nathan → visa ou download',            description: 'Visa téléchargeable portail' },
      { id: 'A24', suite: 'A', file: '10-arrival.spec.ts',      title: 'Camille Garcia → QR 0025 ou Canggu',           description: 'Carte stagiaire ou zone' },
      { id: 'A25', suite: 'A', file: '10-arrival.spec.ts',      title: 'Portail Camille → checklist ou chauffeur',     description: 'Arrivée : checklist visible' },
      { id: 'A26', suite: 'A', file: '11-active.spec.ts',       title: '/fr/cases → Antoine Morel visible',            description: 'Stagiaire actif dans cases' },
      { id: 'A27', suite: 'A', file: '12-alumni.spec.ts',       title: '/fr/alumni → Julie Fontaine visible',          description: 'Alumni listée' },
      { id: 'A28', suite: 'A', file: '12-alumni.spec.ts',       title: 'Portail Julie → testimonial ou alumni',        description: 'Portail alumni fonctionnel' },
    ],
  },
  {
    suite: 'B',
    label: 'Branches & Edge cases',
    description: 'Tokens invalides, notifications, cas limites',
    color: '#c8a96e',
    tests: [
      { id: 'B3', suite: 'B', file: 'edge-cases.spec.ts',    title: 'Token invalide → 404 propre',              description: 'Pas de crash sur token inconnu' },
      { id: 'B4', suite: 'B', file: 'edge-cases.spec.ts',    title: 'Chloé staffing → ≥1 job submission',       description: 'Au moins un job soumis' },
      { id: 'B5', suite: 'B', file: 'edge-cases.spec.ts',    title: 'Nathan visa_received → flight en-attente', description: 'En attente vol après visa' },
      { id: 'B6', suite: 'B', file: 'notifications.spec.ts', title: 'Mark resolved réduit les items',           description: 'Notif résolue disparaît' },
      { id: 'B7', suite: 'B', file: 'notifications.spec.ts', title: 'Clic notif → navigue vers case',           description: 'Navigation depuis notif' },
      { id: 'B8', suite: 'B', file: 'notifications.spec.ts', title: 'Mark all read → badges effacés',           description: 'Tous badges à 0' },
    ],
  },
  {
    suite: 'C',
    label: 'Admin',
    description: 'Dashboard, listes, pages principales',
    color: '#6366f1',
    tests: [
      { id: 'C1', suite: 'C', file: 'dashboard.spec.ts',    title: '/fr/feed charge sans 500',          description: 'Feed principal OK' },
      { id: 'C2', suite: 'C', file: 'cases-list.spec.ts',   title: '/fr/cases → ≥10 candidats',         description: 'Volume minimal présent' },
      { id: 'C3', suite: 'C', file: 'cases-list.spec.ts',   title: '/fr/cases → Lead et Alumni visibles', description: 'Tous statuts affichés' },
      { id: 'C4', suite: 'C', file: 'en-attente.spec.ts',   title: '/fr/en-attente → intern et school', description: 'En attente complet' },
      { id: 'C5', suite: 'C', file: 'notifications.spec.ts',title: '/fr/notifications → ≥4 notifs',     description: 'Notifications présentes' },
      { id: 'C6', suite: 'C', file: 'other-pages.spec.ts',  title: '/fr/alumni → Julie visible',        description: 'Page alumni fonctionnelle' },
      { id: 'C7', suite: 'C', file: 'other-pages.spec.ts',  title: '/fr/jobs → ≥1 offre',              description: 'Au moins un job actif' },
      { id: 'C8', suite: 'C', file: 'other-pages.spec.ts',  title: '/fr/contacts → Marcus visible',     description: 'Page contacts OK' },
    ],
  },
  {
    suite: 'E',
    label: 'Settings',
    description: 'Templates email, automatisations',
    color: '#ec4899',
    tests: [
      { id: 'E1', suite: 'E', file: 'email-templates.spec.ts', title: '≥30 templates email',                    description: 'Templates complets' },
      { id: 'E2', suite: 'E', file: 'email-templates.spec.ts', title: 'Section Agent → visa_agent_submission',  description: 'Template agent visa présent' },
      { id: 'E3', suite: 'E', file: 'email-templates.spec.ts', title: 'Section Pre-departure → all_indonesia',  description: 'Template pré-départ présent' },
      { id: 'E4', suite: 'E', file: 'automations.spec.ts',     title: 'Tableau avec toggles cliquables',        description: 'Automatisations activables' },
    ],
  },
]

export function getAllTests(): TestMeta[] {
  return TEST_SUITES.flatMap(s => s.tests)
}

export function getTestById(id: string): TestMeta | undefined {
  return getAllTests().find(t => t.id === id)
}

export function getSuiteMeta(suite: Suite): SuiteMeta | undefined {
  return TEST_SUITES.find(s => s.suite === suite)
}

export const SUITE_DIRS: Record<Suite, string> = {
  A: 'tests/workflow/',
  B: 'tests/branches/',
  C: 'tests/admin/',
  E: 'tests/settings/',
}

export const TOTAL_TESTS = getAllTests().length
