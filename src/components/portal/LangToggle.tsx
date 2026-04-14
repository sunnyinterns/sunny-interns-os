"use client"
import { useEffect, useState } from 'react'
import type { Lang } from '@/lib/i18n'

export default function LangToggle() {
  const [lang, setLang] = useState<Lang>('fr')

  useEffect(() => {
    const stored = (localStorage.getItem('portal_lang') as Lang | null) ?? 'fr'
    setLang(stored)
  }, [])

  function switchTo(l: Lang) {
    setLang(l)
    localStorage.setItem('portal_lang', l)
    window.dispatchEvent(new CustomEvent('portal-lang-change', { detail: l }))
  }

  const btn = (active: boolean): React.CSSProperties => ({
    padding: '4px 12px',
    fontSize: '12px',
    borderRadius: '9999px',
    border: 'none',
    cursor: 'pointer',
    background: active ? 'white' : 'transparent',
    color: active ? '#1a1918' : '#a1a1aa',
    fontWeight: active ? 600 : 400,
    boxShadow: active ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
    transition: 'all 0.15s',
  })

  return (
    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '2px', background: '#27272a', borderRadius: '9999px', padding: '2px' }}>
      <button onClick={() => switchTo('fr')} style={btn(lang === 'fr')}>FR</button>
      <button onClick={() => switchTo('en')} style={btn(lang === 'en')}>EN</button>
    </div>
  )
}
