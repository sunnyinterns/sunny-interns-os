'use client'

import { CalendarWidget } from '@/components/dashboard/CalendarWidget'

export default function CalendarPage() {
  return (
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1a1918]">Calendrier RDV</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Tous les entretiens de qualification depuis charly@ et team@bali-interns.com
        </p>
      </div>

      <CalendarWidget />

      {/* Guide de synchronisation */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
        <h3 className="font-semibold text-blue-900 mb-2">Synchronisation Google Calendar</h3>
        <p className="text-sm text-blue-700 mb-3">
          Les RDVs sont synchronisés automatiquement quand un candidat prend rendez-vous via Fillout.
          Pour les annulations et reprogrammations, utilise les liens &quot;Reprog.&quot; dans chaque événement.
        </p>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <a href="https://calendar.google.com/calendar/u/0/r/week" target="_blank" rel="noopener noreferrer"
             className="flex items-center gap-2 bg-white rounded-xl p-3 border border-blue-100 hover:border-blue-300 transition-colors">
            <span>📅</span>
            <div>
              <p className="font-medium text-blue-900">charly@bali-interns.com</p>
              <p className="text-xs text-blue-600">Calendrier principal Charly</p>
            </div>
          </a>
          <a href="https://calendar.google.com/calendar/u/0/r/week" target="_blank" rel="noopener noreferrer"
             className="flex items-center gap-2 bg-white rounded-xl p-3 border border-blue-100 hover:border-blue-300 transition-colors">
            <span>👥</span>
            <div>
              <p className="font-medium text-blue-900">team@bali-interns.com</p>
              <p className="text-xs text-blue-600">Calendrier équipe</p>
            </div>
          </a>
        </div>
      </div>
    </div>
  )
}
