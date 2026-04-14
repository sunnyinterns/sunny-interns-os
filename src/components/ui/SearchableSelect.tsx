'use client'
import { useState, useEffect, useRef } from 'react'

export interface SearchableSelectItem {
  id: string
  label: string
  sublabel?: string
  badge?: string
  avatar?: string
  avatarColor?: string
  disabled?: boolean
  meta?: Record<string, unknown>
}

interface SearchableSelectProps {
  items: SearchableSelectItem[]
  value: string | null
  onChange: (item: SearchableSelectItem | null) => void
  placeholder?: string
  searchPlaceholder?: string
  label?: string
  required?: boolean
  loading?: boolean
  disabled?: boolean
  clearable?: boolean
  className?: string
  maxHeight?: number
  emptyText?: string
  onSearch?: (q: string) => void
}

export function SearchableSelect({
  items,
  value,
  onChange,
  placeholder = 'Sélectionner…',
  searchPlaceholder = 'Rechercher…',
  label,
  required = false,
  loading = false,
  disabled = false,
  clearable = true,
  className = '',
  maxHeight = 280,
  emptyText = 'Aucun résultat',
  onSearch,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const selected = items.find(i => i.id === value) ?? null

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  const filtered = query.trim()
    ? items.filter(i =>
        i.label.toLowerCase().includes(query.toLowerCase()) ||
        (i.sublabel ?? '').toLowerCase().includes(query.toLowerCase())
      )
    : items

  function handleSelect(item: SearchableSelectItem) {
    if (item.disabled) return
    onChange(item)
    setOpen(false)
    setQuery('')
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation()
    onChange(null)
    setQuery('')
  }

  function getAvatar(item: SearchableSelectItem) {
    if (item.avatar?.startsWith('http')) {
      return (
        <img src={item.avatar} alt=""
          className="w-8 h-8 rounded-lg object-cover"
          onError={e => { e.currentTarget.style.display = 'none' }} />
      )
    }
    const initials = item.avatar ?? item.label[0]?.toUpperCase() ?? '?'
    return (
      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
        style={{ background: item.avatarColor ?? '#f0ebe2', color: '#c8a96e' }}>
        {initials}
      </div>
    )
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {label && (
        <label className="block text-xs font-medium text-zinc-600 mb-1">
          {label}{required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
      )}

      <button type="button" disabled={disabled}
        onClick={() => { setOpen(o => !o); setQuery('') }}
        className={`w-full flex items-center gap-2 px-3 py-2.5 border rounded-xl text-sm bg-white transition-colors text-left ${
          open ? 'border-[#c8a96e] ring-2 ring-[#c8a96e]/20' : 'border-zinc-200 hover:border-zinc-300'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
        {selected ? (
          <>
            {getAvatar(selected)}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#1a1918] truncate">{selected.label}</p>
              {selected.sublabel && <p className="text-xs text-zinc-400 truncate">{selected.sublabel}</p>}
            </div>
            {selected.badge && (
              <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-full flex-shrink-0">
                {selected.badge}
              </span>
            )}
            {clearable && (
              <button type="button" onClick={handleClear}
                className="text-zinc-300 hover:text-zinc-500 flex-shrink-0 p-0.5">
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </>
        ) : (
          <>
            <span className="text-zinc-400 flex-1">{placeholder}</span>
            <svg className="text-zinc-300 flex-shrink-0" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </>
        )}
      </button>

      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-zinc-200 rounded-xl shadow-lg overflow-hidden">
          <div className="p-2 border-b border-zinc-100">
            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
              <input ref={inputRef} type="text" value={query}
                onChange={e => { setQuery(e.target.value); onSearch?.(e.target.value) }}
                placeholder={searchPlaceholder}
                className="w-full pl-7 pr-3 py-1.5 text-sm border border-zinc-200 rounded-lg bg-zinc-50 text-[#1a1918] focus:outline-none focus:ring-1 focus:ring-[#c8a96e]" />
              {query && (
                <button type="button" onClick={() => { setQuery(''); onSearch?.('') }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          <div style={{ maxHeight }} className="overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center">
                <div className="inline-block w-5 h-5 border-2 border-[#c8a96e] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="p-4 text-center text-sm text-zinc-400">{emptyText}</p>
            ) : (
              filtered.map(item => (
                <button key={item.id} type="button"
                  onClick={() => handleSelect(item)}
                  disabled={item.disabled}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-zinc-50 border-b border-zinc-50 last:border-0 text-left transition-colors ${
                    item.id === value ? 'bg-amber-50/60' : ''
                  } ${item.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}>
                  {getAvatar(item)}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${item.id === value ? 'text-[#c8a96e]' : 'text-[#1a1918]'}`}>
                      {item.label}
                    </p>
                    {item.sublabel && (
                      <p className="text-xs text-zinc-400 truncate">{item.sublabel}</p>
                    )}
                  </div>
                  {item.badge && (
                    <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-full flex-shrink-0">
                      {item.badge}
                    </span>
                  )}
                  {item.id === value && (
                    <svg className="text-[#c8a96e] flex-shrink-0" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
