'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface Referral {
  id: string
  first_name: string
  last_name: string
  created_at: string
  status: 'paid' | 'client' | 'in_process'
}

interface AffiliateData {
  code: string
  total_referred: number
  total_paid: number
  pending_payout: number
  paid_out: number
  commission_eur: number
  referral_iban: string | null
  referral_bic: string | null
  referrals: Referral[]
}

export default function PortalAffiliationPage() {
  const params = useParams()
  const token = typeof params?.token === 'string' ? params.token : ''
  const [data, setData] = useState<AffiliateData | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [ibanInput, setIbanInput] = useState('')
  const [bicInput, setBicInput] = useState('')
  const [savingIban, setSavingIban] = useState(false)
  const [ibanSaved, setIbanSaved] = useState(false)
  const [editIban, setEditIban] = useState(false)

  useEffect(() => {
    if (!token) return
    fetch(`/api/portal/${token}/affiliation`)
      .then((r) => r.ok ? r.json() as Promise<AffiliateData> : Promise.reject())
      .then((d) => {
        setData(d)
        if (d?.referral_iban) {
          setIbanSaved(true)
          setIbanInput(d.referral_iban)
          setBicInput(d.referral_bic ?? '')
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [token])

  function copyLink() {
    if (!data) return
    const url = `${window.location.origin}/fr/candidater?ref=${data.code}`
    void navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500) })
  }

  async function saveIban() {
    setSavingIban(true)
    try {
      const r = await fetch(`/api/portal/${token}/affiliation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ iban: ibanInput, bic: bicInput }),
      })
      if (r.ok) {
        setIbanSaved(true)
        setEditIban(false)
      }
    } finally {
      setSavingIban(false)
    }
  }

  const shareUrl = data ? `${typeof window !== 'undefined' ? window.location.origin : 'https://app.bali-interns.com'}/fr/candidater?ref=${data.code}` : ''
  const maskedIban = ibanInput ? ibanInput.replace(/(.{4})/g, '$1 ').trim().replace(/(\w{4}\s\w{4}\s)\w+(\s\w{4})$/, '$1****$2') : ''

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <Link href={`/portal/${token}`} style={{ color: '#c8a96e', fontSize: '14px', textDecoration: 'none' }}>← Retour</Link>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#1a1918', margin: 0 }}>Programme parrainage</h1>
      </div>

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #1a1918 0%, #2a2522 100%)', borderRadius: '20px', padding: '28px', marginBottom: '20px', textAlign: 'center' }}>
        <p style={{ fontSize: '32px', marginBottom: '8px' }}>🌴</p>
        <h2 style={{ color: 'white', fontSize: '20px', fontWeight: 700, margin: 0 }}>Gagne 100€ par ami placé !</h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', marginTop: '8px' }}>
          Partage ton lien de parrainage. Pour chaque ami qui signe sa convention, tu reçois {data?.commission_eur ?? 100}€.
        </p>
      </div>

      {loading ? (
        <div style={{ height: '100px', background: '#f3f4f6', borderRadius: '16px' }} />
      ) : !data ? (
        <div style={{ padding: '32px', textAlign: 'center', background: 'white', borderRadius: '16px', border: '1px solid #e5e7eb' }}>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>Code de parrainage non disponible.</p>
          <p style={{ color: '#9ca3af', fontSize: '12px', marginTop: '4px' }}>Ton code sera activé après signature de la convention.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Code + lien */}
          <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e5e7eb', padding: '20px' }}>
            <p style={{ color: '#6b7280', fontSize: '12px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
              Ton lien de parrainage
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <code style={{ flex: 1, fontSize: '12px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '8px 12px', wordBreak: 'break-all', color: '#1a1918' }}>
                {shareUrl}
              </code>
              <button
                onClick={copyLink}
                style={{ flexShrink: 0, padding: '8px 12px', background: copied ? '#0d9e75' : '#c8a96e', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}
              >
                {copied ? '✓' : '📋'}
              </button>
            </div>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`Hey ! Je fais un stage à Bali avec Bali Interns et c'est incroyable 🌴 Utilise mon lien pour candidater : ${shareUrl}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'block', width: '100%', padding: '12px', textAlign: 'center', background: '#25D366', color: 'white', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 600, textDecoration: 'none', boxSizing: 'border-box' }}
            >
              Partager sur WhatsApp
            </a>
          </div>

          {/* IBAN */}
          <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e5e7eb', padding: '20px' }}>
            <p style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', marginBottom: '8px' }}>
              🏦 Compte bancaire pour virement
            </p>
            {ibanSaved && !editIban ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '13px', color: '#1a1918', fontFamily: 'monospace' }}>{maskedIban}</span>
                <span style={{ fontSize: '11px', background: '#d1fae5', color: '#065f46', padding: '2px 8px', borderRadius: '20px' }}>✓ Enregistré</span>
                <button onClick={() => setEditIban(true)} style={{ fontSize: '12px', color: '#c8a96e', background: 'none', border: 'none', cursor: 'pointer', marginLeft: 'auto' }}>Modifier</button>
              </div>
            ) : (
              <div className="space-y-3">
                <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>Renseigne ton IBAN pour recevoir tes récompenses de parrainage.</p>
                <input
                  value={ibanInput}
                  onChange={e => setIbanInput(e.target.value)}
                  placeholder="FR76 XXXX XXXX XXXX XXXX XXXX XXX"
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: '10px', fontFamily: 'monospace', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                />
                <input
                  value={bicInput}
                  onChange={e => setBicInput(e.target.value)}
                  placeholder="BIC / SWIFT (optionnel)"
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: '10px', fontFamily: 'monospace', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                />
                <button
                  onClick={() => void saveIban()}
                  disabled={!ibanInput.trim() || savingIban}
                  style={{ width: '100%', padding: '12px', background: !ibanInput.trim() || savingIban ? '#e5e7eb' : '#c8a96e', color: !ibanInput.trim() || savingIban ? '#9ca3af' : 'white', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 600, cursor: !ibanInput.trim() || savingIban ? 'not-allowed' : 'pointer' }}
                >
                  {savingIban ? 'Enregistrement…' : 'Enregistrer mes coordonnées bancaires'}
                </button>
              </div>
            )}
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {[
              { label: 'Amis parrainés', value: data.total_referred, color: '#1a1918' },
              { label: 'Ont payé', value: data.total_paid, color: '#1a1918' },
              { label: 'En attente', value: `${data.pending_payout}€`, color: '#d97706' },
              { label: 'Versé', value: `${data.paid_out}€`, color: '#0d9e75' },
            ].map((s) => (
              <div key={s.label} style={{ background: 'white', borderRadius: '14px', border: '1px solid #e5e7eb', padding: '16px', textAlign: 'center' }}>
                <p style={{ fontSize: '22px', fontWeight: 700, color: s.color, margin: 0 }}>{s.value}</p>
                <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Referrals list */}
          <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e5e7eb', padding: '20px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#1a1918', marginBottom: '14px' }}>👥 Mes filleuls</h3>
            {data.referrals.length === 0 ? (
              <p style={{ fontSize: '13px', color: '#9ca3af', fontStyle: 'italic' }}>Pas encore de filleuls. Partage ton lien !</p>
            ) : (
              <div>
                {data.referrals.map(r => (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: '10px', marginBottom: '10px', borderBottom: '1px solid #f3f4f6' }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '14px', color: '#1a1918', margin: 0 }}>{r.first_name} {r.last_name?.charAt(0)}.</p>
                      <p style={{ fontSize: '11px', color: '#9ca3af', margin: 0 }}>{r.created_at ? new Date(r.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : ''}</p>
                    </div>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: r.status === 'paid' ? '#d1fae5' : r.status === 'client' ? '#dbeafe' : '#f3f4f6', color: r.status === 'paid' ? '#065f46' : r.status === 'client' ? '#1d4ed8' : '#6b7280' }}>
                      {r.status === 'paid' ? '✓ 100€ versés' : r.status === 'client' ? 'Client — en cours' : 'En process'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* How it works */}
          <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e5e7eb', padding: '20px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#1a1918', marginBottom: '14px' }}>Comment ça marche ?</h3>
            {[
              { step: '1', text: 'Partage ton lien à un ami intéressé par un stage à Bali' },
              { step: '2', text: 'Ton ami candidate et est accepté dans le programme' },
              { step: '3', text: `Il signe sa convention et paie → tu reçois ${String(data.commission_eur)}€` },
              { step: '4', text: 'Bali Interns te vire la commission sur ton compte bancaire' },
            ].map((s) => (
              <div key={s.step} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#c8a96e', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, flexShrink: 0 }}>
                  {s.step}
                </div>
                <p style={{ fontSize: '13px', color: '#4b5563', lineHeight: 1.5, margin: 0 }}>{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
