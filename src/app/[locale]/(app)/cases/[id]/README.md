# Fiche dossier candidat — cases/[id]

## Workflow des statuts

```
lead → rdv_booked | to_recontact | not_interested
rdv_booked → qualification_done | to_recontact | not_interested
qualification_done → job_submitted | to_recontact | no_job_found
job_submitted → job_retained | to_recontact
job_retained → convention_signed
convention_signed → payment_pending (email automatique)
payment_pending → payment_received
payment_received → visa_in_progress | visa_docs_sent
visa_docs_sent → visa_in_progress
visa_in_progress → visa_received | visa_refused
visa_received → arrival_prep
arrival_prep → active
active → alumni
to_recontact → rdv_booked | not_interested
```

## Règles métier critiques

- **convention_signed → payment_pending** : irréversible, envoie un email de demande de paiement via `/api/cases/[id]/send-payment-email`
- **to_recontact** : toujours demander une date via la modale `StatusActionPanel` avant de confirmer — colonne `cases.recontact_at`
- **payment_received** : débloque le portail stagiaire (logement, scooter, partenaires)
- **visa** : ne jamais traiter avant `payment_received`
- **status `lead` dans cases** : n'existe pas dans le flux normal — les leads sont dans la table `leads`

## Composants clés

| Composant | Rôle |
|-----------|------|
| `CaseStatusBandeau` | Bandeau contextuel par statut (alerte RDV, actions urgentes) |
| `StatusActionPanel` | Boutons de transition de statut + modale recontact |
| `TabProfil` | Infos stagiaire, CV, notes |
| `TabStaffing` | Jobs proposés, débrief entretien, employeurs |
| `TabHistorique` | Logs chronologiques du dossier |

## Pipeline affiché (5 étapes candidat)

`RDV → Qualif → Jobs → Match → Convention`

- Étapes passées : fond vert (#0d9e75) + ✓
- Étape courante : bordure dorée (#c8a96e)
- Étapes à venir : gris clair

## API principale

- `GET /api/cases/[id]` — chargement du dossier
- `PATCH /api/cases/[id]` — mise à jour champs libres
- `PATCH /api/cases/[id]/status` — transition de statut (validée côté serveur)

## Tests de protection

Voir `tests/smoke/portals.spec.ts` et `tests/workflow/06-convention.spec.ts` / `07-payment.spec.ts`
