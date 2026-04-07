import { NextResponse } from 'next/server'

export async function GET() {
  const slots: { date: string; dayLabel: string; slots: { start: string; end: string; label: string }[] }[] = []
  const now = new Date()

  for (let d = 1; d <= 14; d++) {
    const day = new Date(now)
    day.setDate(now.getDate() + d)
    const dow = day.getDay()
    // Skip weekends
    if (dow === 0 || dow === 6) continue

    const dateStr = day.toISOString().slice(0, 10)
    const dayLabel = day.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

    const daySlots: { start: string; end: string; label: string }[] = []
    // 9h00 → 18h00 Jakarta (UTC+8), slots 45min
    for (let h = 9; h < 18; h++) {
      for (const m of [0, 45]) {
        if (h === 17 && m === 45) continue // last slot ends at 18:30, skip
        const startH = h
        const startM = m
        const totalMins = startH * 60 + startM + 45
        const endH = Math.floor(totalMins / 60)
        const endM = totalMins % 60
        if (endH > 18) continue

        const pad = (n: number) => String(n).padStart(2, '0')
        const start = `${dateStr}T${pad(startH)}:${pad(startM)}:00+08:00`
        const end = `${dateStr}T${pad(endH)}:${pad(endM)}:00+08:00`
        const label = `${pad(startH)}h${pad(startM)} → ${pad(endH)}h${pad(endM)}`
        daySlots.push({ start, end, label })
      }
    }

    slots.push({ date: dateStr, dayLabel, slots: daySlots })
  }

  return NextResponse.json({ slots })
}
