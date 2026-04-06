/**
 * Calculate stay duration in days.
 * TEST: 3 avril → 16 septembre = 166 jours (not 197 — Airtable bug fixed)
 */
export function calculateStayDuration(arrivalDate: Date, returnDate: Date): number {
  return Math.floor((returnDate.getTime() - arrivalDate.getTime()) / (1000 * 60 * 60 * 24))
}

export interface RetroPlanningItem {
  label: string
  daysBeforeArrival: number
  type: 'critical' | 'attention' | 'normal'
  date: Date
}

export function calculateRetroplanning(arrivalDate: Date): RetroPlanningItem[] {
  const items: Omit<RetroPlanningItem, 'date'>[] = [
    { label: 'Billet confirmé', daysBeforeArrival: 40, type: 'attention' },
    { label: 'Paiement reçu', daysBeforeArrival: 30, type: 'critical' },
    { label: 'Visa soumis agent', daysBeforeArrival: 30, type: 'critical' },
    { label: 'Visa reçu', daysBeforeArrival: 7, type: 'critical' },
    { label: 'Chauffeur notifié', daysBeforeArrival: 2, type: 'attention' },
    { label: 'Chauffeur rappel', daysBeforeArrival: 0, type: 'attention' },
  ]

  return items.map((item) => ({
    ...item,
    date: new Date(arrivalDate.getTime() - item.daysBeforeArrival * 24 * 60 * 60 * 1000),
  }))
}

export function getDaysUntil(targetDate: Date): number {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const target = new Date(targetDate)
  target.setHours(0, 0, 0, 0)
  return Math.floor((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export function getStayDurationAlert(durationDays: number): 'critical' | 'attention' | null {
  if (durationDays > 175) return 'critical'
  if (durationDays >= 165) return 'attention'
  return null
}

export interface RetroPlanningAlert {
  caseId: string
  label: string
  type: 'critical' | 'attention'
  daysUntilArrival: number
  action: string
}

/**
 * Returns alerts for a case based on retro-planning rules.
 * TEST: calculateStayDuration(new Date('2026-04-03'), new Date('2026-09-16')) === 166
 */
export function getRetroPlanningAlerts(opts: {
  caseId: string
  arrivalDate: Date
  hasTicket: boolean
  hasPayment: boolean
  hasFlight: boolean
  stayDurationDays: number
}): RetroPlanningAlert[] {
  const alerts: RetroPlanningAlert[] = []
  const daysUntil = getDaysUntil(opts.arrivalDate)

  if (opts.stayDurationDays > 175) {
    alerts.push({
      caseId: opts.caseId,
      label: 'Séjour > 175j — VISA INVALIDE',
      type: 'critical',
      daysUntilArrival: daysUntil,
      action: 'Ajuster la date de retour',
    })
  } else if (opts.stayDurationDays >= 165) {
    alerts.push({
      caseId: opts.caseId,
      label: `Séjour ${opts.stayDurationDays}j — proche limite 175j`,
      type: 'attention',
      daysUntilArrival: daysUntil,
      action: 'Vérifier les dates',
    })
  }

  if (daysUntil <= 40 && !opts.hasTicket) {
    alerts.push({
      caseId: opts.caseId,
      label: 'J-40 sans billet confirmé',
      type: 'attention',
      daysUntilArrival: daysUntil,
      action: 'Confirmer le billet',
    })
  }

  if (daysUntil <= 30 && !opts.hasPayment) {
    alerts.push({
      caseId: opts.caseId,
      label: 'J-30 sans paiement reçu',
      type: 'critical',
      daysUntilArrival: daysUntil,
      action: 'Relancer le paiement',
    })
  }

  return alerts
}
