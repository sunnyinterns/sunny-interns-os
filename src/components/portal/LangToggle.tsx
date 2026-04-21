"use client"
import { useEffect, useState } from 'react'
import type { PortalLang, AgentLang } from '@/lib/i18n'
import { getPortalLang, setPortalLang, getAgentLang, setAgentLang } from '@/lib/i18n'

// ─── Portail candidat FR/EN ──────────────────────────────────────
export default function LangToggle({ onLangChange }: { onLangChange?: (l: PortalLang) => void } = {}) {
  const [lang, setLang] = useState<PortalLang>('fr')

  useEffect(() => {
    setLang(getPortalLang())
  }, [])

  function switchTo(l: PortalLang) {
    setLang(l)
    setPortalLang(l)
    onLangChange?.(l)
    window.dispatchEvent(new CustomEvent('portal-lang-change', { detail: l }))
  }

  const btn = (active: boolean): React.CSSProperties => ({
    padding: '4px 12px', fontSize: '12px', borderRadius: '9999px',
    border: 'none', cursor: 'pointer',
    background: active ? 'white' : 'transparent',
    color: active ? '#1a1918' : '#a1a1aa',
    fontWeight: active ? 600 : 400,
    boxShadow: active ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
    transition: 'all 0.15s',
  })

  return (
    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '2px', background: '#27272a', borderRadius: '9999px', padding: '2px' }}>
      <button style={btn(lang === 'fr')} onClick={() => switchTo('fr')}>FR</button>
      <button style={btn(lang === 'en')} onClick={() => switchTo('en')}>EN</button>
    </div>
  )
}

// ─── Portail agent visa EN/ID ─────────────────────────────────────
export function AgentLangToggle({ onLangChange }: { onLangChange?: (l: AgentLang) => void } = {}) {
  const [lang, setLang] = useState<AgentLang>('en')

  useEffect(() => {
    setLang(getAgentLang())
  }, [])

  function switchTo(l: AgentLang) {
    setLang(l)
    setAgentLang(l)
    onLangChange?.(l)
    window.dispatchEvent(new CustomEvent('agent-lang-change', { detail: l }))
  }

  const btn = (active: boolean): React.CSSProperties => ({
    padding: '4px 12px', fontSize: '12px', borderRadius: '9999px',
    border: 'none', cursor: 'pointer',
    background: active ? 'white' : 'transparent',
    color: active ? '#1a1918' : '#a1a1aa',
    fontWeight: active ? 600 : 400,
    boxShadow: active ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
    transition: 'all 0.15s',
  })

  return (
    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '2px', background: '#27272a', borderRadius: '9999px', padding: '2px' }}>
      <button style={btn(lang === 'en')} onClick={() => switchTo('en')}>EN</button>
      <button style={btn(lang === 'id')} onClick={() => switchTo('id')}>ID</button>
    </div>
  )
}
