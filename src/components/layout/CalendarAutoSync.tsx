'use client'
import { useEffect } from 'react'

// Sync Google Calendar automatiquement à chaque connexion
// Silencieux - ne bloque pas l'UI
export function CalendarAutoSync() {
  useEffect(() => {
    // Attendre que la page soit chargée, puis sync en arrière-plan
    const timer = setTimeout(() => {
      fetch('/api/calendar/google-sync', { method: 'POST' })
        .then(r => r.json())
        .then((d: { ok?: boolean; synced?: number }) => {
          if (d.ok) console.log(`[Calendar] ✅ Synced ${d.synced} events`)
        })
        .catch(() => {}) // Silencieux si erreur
    }, 2000) // Délai 2s pour ne pas bloquer le premier rendu

    return () => clearTimeout(timer)
  }, [])

  return null // Pas de rendu visible
}
