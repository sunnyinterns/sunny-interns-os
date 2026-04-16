# Sunny Interns OS — Tests Playwright

## Commandes

| Commande | Description |
|----------|-------------|
| `npm run test:auth` | Authentification seule (setup) |
| `npm run test:A` | Tests workflow A0-A28 (UI mode) |
| `npm run test:B` | Tests branches B1-B8 (UI mode) |
| `npm run test:C` | Tests admin C1-C9 (UI mode) |
| `npm run test:E` | Tests settings E1-E4 (UI mode) |
| `npm run test:all` | Tous les tests (UI mode) |

---

## Module A — Workflow (29 tests)

| ID | Fichier | Description |
|----|---------|-------------|
| A0 | `00-auth.setup.ts` | Authentification Supabase |
| A1 | `01-lead.spec.ts` | /fr/cases → Emma Martin visible |
| A2 | `01-lead.spec.ts` | Emma Martin fiche charge sans 500 |
| A3 | `01-lead.spec.ts` | /fr/notifications → Emma Martin visible |
| A4 | `02-rdv.spec.ts` | Lucas Bernard → meet.google.com visible |
| A5 | `03-qualification.spec.ts` | /fr/en-attente → Thomas ou engagement |
| A6 | `03-qualification.spec.ts` | Portail Thomas via portal_token |
| A7 | `04-job-submitted.spec.ts` | Chloé Dupont staffing → Bali Digital Hub |
| A8 | `04-job-submitted.spec.ts` | /fr/en-attente → employer ou Chloé |
| A9 | `04-job-submitted.spec.ts` | Portail Chloé → OUI/NON visible |
| A10 | `05-job-retained.spec.ts` | /fr/en-attente → convention ou Hugo |
| A11 | `05-job-retained.spec.ts` | Portail Hugo → upload ou convention |
| A12 | `06-convention.spec.ts` | /fr/notifications → Léa visible |
| A13 | `06-convention.spec.ts` | Léa Petit billing tab sans 500 |
| A14 | `06-convention.spec.ts` | Portail Léa → 1490 ou IBAN |
| A15 | `06-convention.spec.ts` | Portail employeur charge sans 404 |
| A16 | `07-payment.spec.ts` | /fr/notifications → Inès visible |
| A17 | `07-payment.spec.ts` | /fr/en-attente → visa ou Inès |
| A18 | `07-payment.spec.ts` | Portail Inès sans erreur |
| A19 | `08-visa.spec.ts` | /fr/en-attente → Baptiste ou agent |
| A20 | `08-visa.spec.ts` | Portail agent Baptiste charge |
| A21 | `09-visa-received.spec.ts` | /fr/notifications → Nathan |
| A22 | `09-visa-received.spec.ts` | /fr/en-attente → flight ou Nathan |
| A23 | `09-visa-received.spec.ts` | Portail Nathan → visa ou download |
| A24 | `10-arrival.spec.ts` | Camille Garcia → QR 0025 ou Canggu |
| A25 | `10-arrival.spec.ts` | Portail Camille → checklist ou chauffeur |
| A26 | `11-active.spec.ts` | /fr/cases → Antoine Morel visible |
| A27 | `12-alumni.spec.ts` | /fr/alumni → Julie Fontaine visible |
| A28 | `12-alumni.spec.ts` | Portail Julie → testimonial ou alumni |

## Module B — Branches (6 tests)

| ID | Fichier | Description |
|----|---------|-------------|
| B3 | `edge-cases.spec.ts` | Token invalide → 404 propre, pas de crash |
| B4 | `edge-cases.spec.ts` | Chloé staffing → au moins 1 job submission |
| B5 | `edge-cases.spec.ts` | Nathan visa_received → flight en-attente |
| B6 | `notifications.spec.ts` | Mark resolved réduit les items |
| B7 | `notifications.spec.ts` | Clic notification → navigue vers case |
| B8 | `notifications.spec.ts` | Mark all as read → badges effacés |

## Module C — Admin (8 tests)

| ID | Fichier | Description |
|----|---------|-------------|
| C1 | `dashboard.spec.ts` | /fr/feed charge sans 500 |
| C2 | `cases-list.spec.ts` | /fr/cases → au moins 10 candidats |
| C3 | `cases-list.spec.ts` | /fr/cases → Lead et Alumni visibles |
| C4 | `en-attente.spec.ts` | /fr/en-attente → intern et school |
| C5 | `notifications.spec.ts` | /fr/notifications → au moins 4 notifs |
| C6 | `other-pages.spec.ts` | /fr/alumni → Julie |
| C7 | `other-pages.spec.ts` | /fr/jobs → au moins 1 offre |
| C8 | `other-pages.spec.ts` | /fr/contacts → Marcus |

## Module E — Settings (4 tests)

| ID | Fichier | Description |
|----|---------|-------------|
| E1 | `email-templates.spec.ts` | Au moins 30 templates |
| E2 | `email-templates.spec.ts` | Section Agent → visa_agent_submission |
| E3 | `email-templates.spec.ts` | Section Pre-departure → all_indonesia |
| E4 | `automations.spec.ts` | Tableau avec toggles cliquables |

---

**Total: 47 tests** across 4 modules (A, B, C, E)
