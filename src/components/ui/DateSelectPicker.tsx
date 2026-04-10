'use client'

import { useEffect, useMemo, useState } from 'react'

const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const MONTHS_EN = ['January','February','March','April','May','June','July','August','September','October','November','December']

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

interface Props {
  value: string           // YYYY-MM-DD ou ''
  onChange: (v: string) => void
  onBlur?: () => void
  lang: 'fr' | 'en'
  defaultYear?: number    // année pré-sélectionnée quand vide
  defaultMonth?: number   // mois pré-sélectionné (1-12) quand vide
  defaultDay?: number     // jour pré-sélectionné quand vide
  minYear?: number
  maxYear?: number
  className?: string
  required?: boolean
}

export function DateSelectPicker({
  value,
  onChange,
  onBlur,
  lang,
  defaultYear,
  defaultMonth,
  defaultDay,
  minYear,
  maxYear,
  className = '',
}: Props) {
  const currentYear = new Date().getFullYear()
  const yearMin = minYear ?? 1940
  const yearMax = maxYear ?? currentYear + 15

  // Parse value
  const parsed = useMemo(() => {
    if (!value) return { y: '', m: '', d: '' }
    const [y, m, d] = value.split('-')
    return { y: y ?? '', m: m ? String(parseInt(m)) : '', d: d ? String(parseInt(d)) : '' }
  }, [value])

  const [year, setYear] = useState(parsed.y || '')
  const [month, setMonth] = useState(parsed.m || '')
  const [day, setDay] = useState(parsed.d || '')

  // Sync from outside
  useEffect(() => {
    setYear(parsed.y || '')
    setMonth(parsed.m || '')
    setDay(parsed.d || '')
  }, [value]) // eslint-disable-line

  // Emit change
  function emit(y: string, m: string, d: string) {
    if (y && m && d) {
      const mm = m.padStart(2, '0')
      const dd = d.padStart(2, '0')
      onChange(`${y}-${mm}-${dd}`)
    } else {
      onChange('')
    }
  }

  function handleYear(v: string) {
    setYear(v)
    // Validate day for new year
    const dMax = v && month ? daysInMonth(parseInt(v), parseInt(month)) : 31
    const safeDay = day && parseInt(day) > dMax ? '' : day
    setDay(safeDay)
    emit(v, month, safeDay)
  }

  function handleMonth(v: string) {
    setMonth(v)
    const dMax = year && v ? daysInMonth(parseInt(year), parseInt(v)) : 31
    const safeDay = day && parseInt(day) > dMax ? '' : day
    setDay(safeDay)
    emit(year, v, safeDay)
  }

  function handleDay(v: string) {
    setDay(v)
    emit(year, month, v)
  }

  // Years list
  const years = useMemo(() => {
    const arr: number[] = []
    for (let y = yearMax; y >= yearMin; y--) arr.push(y)
    return arr
  }, [yearMin, yearMax])

  // Months list
  const months = MONTHS_FR // always French labels internally, we use number values
  const monthLabels = lang === 'fr' ? MONTHS_FR : MONTHS_EN

  // Days list
  const maxDay = year && month ? daysInMonth(parseInt(year), parseInt(month)) : 31
  const days = useMemo(() => {
    const arr: number[] = []
    for (let d = 1; d <= maxDay; d++) arr.push(d)
    return arr
  }, [maxDay])

  const selectClass = `flex-1 h-11 px-2.5 bg-white border border-zinc-200 rounded-xl text-sm text-[#1a1918] focus:outline-none focus:ring-2 focus:ring-[#c8a96e]/40 focus:border-[#c8a96e] appearance-none cursor-pointer ${!year && !month && !day ? 'text-zinc-400' : ''} ${className}`

  const placeholderYear = lang === 'fr' ? 'Année' : 'Year'
  const placeholderMonth = lang === 'fr' ? 'Mois' : 'Month'
  const placeholderDay = lang === 'fr' ? 'Jour' : 'Day'

  return (
    <div className="flex gap-2" onBlur={onBlur}>
      {/* Année en premier */}
      <select
        value={year}
        onChange={e => handleYear(e.target.value)}
        className={selectClass}
        style={{ minWidth: 0 }}
      >
        <option value="">{placeholderYear}</option>
        {years.map(y => (
          <option key={y} value={String(y)}>{y}</option>
        ))}
      </select>

      {/* Mois */}
      <select
        value={month}
        onChange={e => handleMonth(e.target.value)}
        className={selectClass}
        style={{ minWidth: 0 }}
      >
        <option value="">{placeholderMonth}</option>
        {monthLabels.map((label, i) => (
          <option key={i + 1} value={String(i + 1)}>{label}</option>
        ))}
      </select>

      {/* Jour */}
      <select
        value={day}
        onChange={e => handleDay(e.target.value)}
        className={selectClass}
        style={{ minWidth: 0 }}
      >
        <option value="">{placeholderDay}</option>
        {days.map(d => (
          <option key={d} value={String(d)}>{String(d).padStart(2, '0')}</option>
        ))}
      </select>
    </div>
  )
}
