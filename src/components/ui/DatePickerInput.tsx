'use client'

import { useEffect, useRef, useState } from 'react'

const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const MONTHS_EN = ['January','February','March','April','May','June','July','August','September','October','November','December']

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

function parseTextToISO(text: string): string | null {
  // Accepts dd/mm/yyyy or dd-mm-yyyy
  const m = text.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
  if (!m) return null
  const [, d, mo, y] = m
  const date = new Date(parseInt(y), parseInt(mo) - 1, parseInt(d))
  if (isNaN(date.getTime())) return null
  return `${y}-${mo.padStart(2,'0')}-${d.padStart(2,'0')}`
}

function isoToDisplay(iso: string): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

interface Props {
  value: string        // YYYY-MM-DD ou ''
  onChange: (v: string) => void
  onBlur?: () => void
  lang: 'fr' | 'en'
  defaultYear?: number
  minYear?: number
  maxYear?: number
  className?: string
}

type PickerStep = 'year' | 'month' | 'day'

export function DatePickerInput({
  value,
  onChange,
  onBlur,
  lang,
  defaultYear,
  minYear,
  maxYear,
  className = '',
}: Props) {
  const currentYear = new Date().getFullYear()
  const yearMin = minYear ?? 1940
  const yearMax = maxYear ?? currentYear + 15

  // Text field state (dd/mm/yyyy)
  const [text, setText] = useState(isoToDisplay(value))
  const [textError, setTextError] = useState(false)

  // Picker state
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<PickerStep>('year')
  const [pickerYear, setPickerYear] = useState(defaultYear ?? currentYear)
  const [pickerMonth, setPickerMonth] = useState<number | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const monthLabels = lang === 'fr' ? MONTHS_FR : MONTHS_EN

  // Sync text from outside value change
  useEffect(() => {
    setText(isoToDisplay(value))
  }, [value])

  // Close picker on outside click
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  function handleTextChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value
    setText(v)
    setTextError(false)
    if (v === '') { onChange(''); return }
    const iso = parseTextToISO(v)
    if (iso) {
      onChange(iso)
      setTextError(false)
    }
  }

  function handleTextBlur() {
    if (text && !parseTextToISO(text)) {
      setTextError(true)
    }
    onBlur?.()
  }

  function openPicker() {
    // Reset picker to defaultYear or parsed year
    if (value) {
      const [y, m] = value.split('-')
      setPickerYear(parseInt(y))
      setPickerMonth(parseInt(m))
      setStep('year')
    } else {
      setPickerYear(defaultYear ?? currentYear)
      setPickerMonth(null)
      setStep('year')
    }
    setOpen(true)
  }

  function selectYear(y: number) {
    setPickerYear(y)
    setStep('month')
  }

  function selectMonth(m: number) {
    setPickerMonth(m)
    setStep('day')
  }

  function selectDay(d: number) {
    const m = pickerMonth!
    const iso = `${pickerYear}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`
    onChange(iso)
    setText(isoToDisplay(iso))
    setTextError(false)
    setOpen(false)
    onBlur?.()
  }

  // Build year grid
  const years: number[] = []
  for (let y = yearMax; y >= yearMin; y--) years.push(y)

  const maxDay = pickerMonth ? daysInMonth(pickerYear, pickerMonth) : 31
  const days: number[] = []
  for (let d = 1; d <= maxDay; d++) days.push(d)

  const placeholder = lang === 'fr' ? 'jj/mm/aaaa' : 'dd/mm/yyyy'

  return (
    <div ref={containerRef} className="relative">
      <div className={`flex items-center gap-2 h-11 px-3.5 bg-white border rounded-xl transition-all focus-within:ring-2 focus-within:ring-[#c8a96e]/40 focus-within:border-[#c8a96e] ${textError ? 'border-red-400' : 'border-zinc-200'} ${className}`}>
        <input
          type="text"
          value={text}
          onChange={handleTextChange}
          onBlur={handleTextBlur}
          placeholder={placeholder}
          maxLength={10}
          className="flex-1 text-sm text-[#1a1918] placeholder:text-zinc-400 bg-transparent outline-none"
        />
        <button
          type="button"
          onClick={openPicker}
          className="flex-shrink-0 text-zinc-400 hover:text-[#c8a96e] transition-colors"
          tabIndex={-1}
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <rect x="3" y="4" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 2v4M8 2v4M3 10h18"/>
          </svg>
        </button>
      </div>

      {textError && (
        <p className="text-[11px] text-red-500 mt-1">
          {lang === 'fr' ? 'Format invalide (jj/mm/aaaa)' : 'Invalid format (dd/mm/yyyy)'}
        </p>
      )}

      {/* Custom picker dropdown */}
      {open && (
        <div className="absolute top-[calc(100%+4px)] left-0 z-50 bg-white border border-zinc-200 rounded-xl shadow-lg p-3 w-64">
          
          {/* Header avec breadcrumb */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1 text-xs text-zinc-500">
              {step !== 'year' && (
                <button
                  type="button"
                  onClick={() => setStep('year')}
                  className="text-[#c8a96e] hover:underline font-medium"
                >
                  {pickerYear}
                </button>
              )}
              {step === 'day' && pickerMonth && (
                <>
                  <span>›</span>
                  <button
                    type="button"
                    onClick={() => setStep('month')}
                    className="text-[#c8a96e] hover:underline font-medium"
                  >
                    {monthLabels[pickerMonth - 1]}
                  </button>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-zinc-300 hover:text-zinc-600 text-lg leading-none"
            >×</button>
          </div>

          {/* Step: Année */}
          {step === 'year' && (
            <div>
              <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                {lang === 'fr' ? 'Année' : 'Year'}
              </p>
              <div className="grid grid-cols-4 gap-1 max-h-44 overflow-y-auto">
                {years.map(y => (
                  <button
                    key={y}
                    type="button"
                    onClick={() => selectYear(y)}
                    className={`py-1.5 text-sm rounded-lg font-medium transition-colors ${
                      y === pickerYear
                        ? 'bg-[#c8a96e] text-white'
                        : 'text-zinc-700 hover:bg-zinc-100'
                    }`}
                  >
                    {y}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step: Mois */}
          {step === 'month' && (
            <div>
              <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                {lang === 'fr' ? 'Mois' : 'Month'}
              </p>
              <div className="grid grid-cols-3 gap-1">
                {monthLabels.map((label, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => selectMonth(i + 1)}
                    className={`py-2 text-xs rounded-lg font-medium transition-colors ${
                      pickerMonth === i + 1
                        ? 'bg-[#c8a96e] text-white'
                        : 'text-zinc-700 hover:bg-zinc-100'
                    }`}
                  >
                    {label.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step: Jour */}
          {step === 'day' && (
            <div>
              <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                {lang === 'fr' ? 'Jour' : 'Day'}
              </p>
              <div className="grid grid-cols-7 gap-1">
                {days.map(d => {
                  const currentD = value ? parseInt(value.split('-')[2]) : null
                  const currentM = value ? parseInt(value.split('-')[1]) : null
                  const currentY = value ? parseInt(value.split('-')[0]) : null
                  const isSelected = d === currentD && pickerMonth === currentM && pickerYear === currentY
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => selectDay(d)}
                      className={`py-1.5 text-xs rounded-lg font-medium transition-colors ${
                        isSelected
                          ? 'bg-[#c8a96e] text-white'
                          : 'text-zinc-700 hover:bg-zinc-100'
                      }`}
                    >
                      {d}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
