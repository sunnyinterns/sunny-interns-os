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
