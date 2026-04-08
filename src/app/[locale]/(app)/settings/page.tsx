"use client"
import { useEffect, useState, useRef } from "react"
import Link from "next/link"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>

export default function SettingsPage() {
  const [tab, setTab] = useState("entities")
  const [entities, setEntities] = useState<AnyRecord[]>([])
  const [agents, setAgents] = useState<AnyRecord[]>([])
  const [settings, setSettings] = useState<Record<string, number | string>>({})
  const [inviteEmail, setInviteEmail] = useState("")

  // New state
  const [jobTypes, setJobTypes] = useState<AnyRecord[]>([])
  const [newJobType, setNewJobType] = useState("")
  const [alertConfigs, setAlertConfigs] = useState<AnyRecord[]>([])
  const [transportProviders, setTransportProviders] = useState<AnyRecord[]>([])
  const [affiliates, setAffiliates] = useState<AnyRecord[]>([])
  const [mediaAssets, setMediaAssets] = useState<AnyRecord[]>([])
  const [uploadingMedia, setUploadingMedia] = useState(false)
  const mediaRef = useRef<HTMLInputElement>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [newTransport, setNewTransport] = useState({ name: '', whatsapp: '', email: '', destination: '' })

  useEffect(() => {
    fetch("/api/billing-entities").then(r => r.json()).then(d => setEntities(Array.isArray(d) ? d : []))
    fetch("/api/visa-agents").then(r => r.json()).then(d => setAgents(Array.isArray(d) ? d : []))
    fetch("/api/settings").then(r => r.json()).then(d => {
      const s: Record<string, number | string> = {}
      if (Array.isArray(d)) d.forEach((i: AnyRecord) => { s[i.key] = i.value })
      setSettings(s)
    })
  }, [])

  useEffect(() => {
    if (tab === "metiers") fetch("/api/settings/job-types").then(r => r.json()).then(d => setJobTypes(Array.isArray(d) ? d : []))
    if (tab === "alertes") fetch("/api/alert-configs").then(r => r.json()).then(d => setAlertConfigs(Array.isArray(d) ? d : []))
    if (tab === "transport") fetch("/api/transport-providers").then(r => r.json()).then(d => setTransportProviders(Array.isArray(d) ? d : []))
    if (tab === "affiliation") fetch("/api/affiliates").then(r => r.json()).then(d => setAffiliates(Array.isArray(d) ? d : []))
  }, [tab])

  async function saveRetro(key: string, val: number) {
    setSettings(p => ({ ...p, [key]: val }))
    await fetch(`/api/settings/${key}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ value: val }) })
  }

  async function saveSetting(key: string, val: string | number) {
    setSettings(p => ({ ...p, [key]: val }))
    await fetch(`/api/settings/${key}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ value: val }) })
  }

  async function addJobType() {
    if (!newJobType.trim()) return
    const res = await fetch("/api/settings/job-types", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newJobType.trim(), sort_order: jobTypes.length + 1 }) })
    if (res.ok) { const d = await res.json() as AnyRecord; setJobTypes(p => [...p, d]); setNewJobType("") }
  }

  async function deleteJobType(id: string) {
    await fetch("/api/settings/job-types", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) })
    setJobTypes(p => p.filter(j => j.id !== id))
  }

  async function toggleAlert(id: string, is_active: boolean) {
    await fetch(`/api/alert-configs/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_active }) })
    setAlertConfigs(p => p.map(a => a.id === id ? { ...a, is_active } : a))
  }

  async function saveAlertRecipients(id: string, emails: string) {
    const email_recipients = emails.split(',').map(e => e.trim()).filter(Boolean)
    await fetch(`/api/alert-configs/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email_recipients }) })
    setAlertConfigs(p => p.map(a => a.id === id ? { ...a, email_recipients } : a))
  }

  async function uploadMedia(file: File) {
    setUploadingMedia(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('bucket', 'media-assets')
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: fd })
      if (!uploadRes.ok) return
      const { url, filename } = await uploadRes.json() as { url: string; filename: string }
      const saveRes = await fetch('/api/media-assets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: filename, asset_type: 'logo', url }) })
      if (saveRes.ok) { const d = await saveRes.json() as AnyRecord; setMediaAssets(p => [d, ...p]) }
    } finally {
      setUploadingMedia(false)
    }
  }

  async function payAffiliate(id: string, amount: number) {
    setSaving(id)
    await fetch('/api/affiliates', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, paid_amount: amount }) })
    setAffiliates(p => p.map(a => a.id === id ? { ...a, paid_out: (a.paid_out ?? 0) + amount, pending_payout: Math.max(0, (a.pending_payout ?? 0) - amount) } : a))
    setSaving(null)
  }

  async function addTransport() {
    if (!newTransport.name.trim()) return
    const res = await fetch('/api/transport-providers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newTransport) })
    if (res.ok) { const d = await res.json() as AnyRecord; setTransportProviders(p => [...p, d]); setNewTransport({ name: '', whatsapp: '', email: '', destination: '' }) }
  }

  const allTabs = [
    { id: "entities", label: "Entités légales" },
    { id: "agents", label: "Agents visa" },
    { id: "retro", label: "Rétro-planning" },
    { id: "booking", label: "Booking" },
    { id: "metiers", label: "Métiers" },
    { id: "alertes", label: "Alertes" },
    { id: "medias", label: "Médias" },
    { id: "transport", label: "Transport" },
    { id: "affiliation", label: "Affiliation" },
    { id: "links", label: "Autres" },
    { id: "users", label: "Utilisateurs" },
  ]

  const tabStyle = (active: boolean) => ({
    display: "block", width: "100%", textAlign: "left" as const, padding: "7px 10px",
    borderRadius: "6px", border: "none", cursor: "pointer", fontSize: "13px", marginBottom: "1px",
    background: active ? "rgba(200,169,110,0.15)" : "transparent",
    color: active ? "#c8a96e" : "var(--color-text-secondary)", fontWeight: active ? 500 : 400,
  })

  const inputCls = "w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c8a96e] bg-white text-[#1a1918]"
  const sectionTitle = { fontSize: "16px", fontWeight: 500, marginBottom: "16px", color: "var(--color-text-primary)" }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Sidebar */}
      <div style={{ width: "180px", borderRight: "0.5px solid var(--color-border-tertiary)", padding: "16px", flexShrink: 0, overflowY: "auto" }}>
        {allTabs.map(t => <button key={t.id} onClick={() => setTab(t.id)} style={tabStyle(tab === t.id)}>{t.label}</button>)}
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: "24px", overflowY: "auto" }}>

        {/* ── ENTITÉS ── */}
        {tab === "entities" && <div>
          <h2 style={sectionTitle}>Entités légales</h2>
          {entities.map((e: AnyRecord) => (
            <div key={e.id} style={{ border: `1px solid ${!e.is_active ? "#fca5a5" : "var(--color-border-tertiary)"}`, borderRadius: "12px", padding: "16px", marginBottom: "8px", background: !e.is_active ? "#fff5f5" : "var(--color-background-primary)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "4px" }}>
                    <span style={{ fontWeight: 500, fontSize: "14px", color: "var(--color-text-primary)" }}>{e.name}</span>
                    {e.is_default && <span style={{ fontSize: "11px", padding: "1px 6px", background: "#d1fae5", color: "#065f46", borderRadius: "4px" }}>Défaut</span>}
                    {!e.is_active && <span style={{ fontSize: "11px", padding: "1px 6px", background: "#fee2e2", color: "#dc2626", borderRadius: "4px" }}>INACTIVE</span>}
                  </div>
                  <span style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>{e.country}</span>
                </div>
                {!e.is_default && e.is_active && (
                  <button onClick={async () => { await fetch("/api/billing-entities", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: e.id, is_default: true }) }); setEntities(p => p.map((x: AnyRecord) => ({ ...x, is_default: x.id === e.id }))) }} style={{ fontSize: "12px", padding: "4px 10px", border: "0.5px solid var(--color-border-secondary)", borderRadius: "6px", cursor: "pointer", background: "transparent", color: "var(--color-text-secondary)" }}>
                    Définir défaut
                  </button>
                )}
              </div>
              {!e.is_active && <p style={{ fontSize: "12px", color: "#dc2626", marginTop: "8px", marginBottom: 0 }}>⚠ Entité inactive — paiements refusés par les banques françaises.</p>}
            </div>
          ))}
        </div>}

        {/* ── AGENTS ── */}
        {tab === "agents" && <div>
          <h2 style={sectionTitle}>Agents visa</h2>
          {agents.map((a: AnyRecord) => (
            <div key={a.id} style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: "12px", padding: "16px", marginBottom: "8px", background: "var(--color-background-primary)" }}>
              <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "4px" }}>
                <span style={{ fontWeight: 500, fontSize: "14px", color: "var(--color-text-primary)" }}>{a.company_name}</span>
                {a.is_default && <span style={{ fontSize: "11px", padding: "1px 6px", background: "#d1fae5", color: "#065f46", borderRadius: "4px" }}>Défaut</span>}
              </div>
              <span style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>{a.contact_name} · {a.email}</span>
            </div>
          ))}
        </div>}

        {/* ── RÉTRO-PLANNING ── */}
        {tab === "retro" && <div>
          <h2 style={sectionTitle}>Rétro-planning & TVA</h2>
          {[{ k: "retro_flight_days", l: "Billet J-" }, { k: "retro_payment_days", l: "Paiement J-" }, { k: "retro_visa_submit_days", l: "Visa soumis J-" }, { k: "retro_visa_received_days", l: "Visa reçu J-" }, { k: "retro_driver_j2", l: "Chauffeur J-" }, { k: "vat_rate", l: "TVA %" }].map(f => (
            <div key={f.k} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
              <span style={{ fontSize: "14px", color: "var(--color-text-primary)" }}>{f.l}{settings[f.k] || "—"}</span>
              <input type="number" value={Number(settings[f.k]) || ""} onChange={e => void saveRetro(f.k, Number(e.target.value))} style={{ width: "70px", padding: "6px 10px", border: "0.5px solid var(--color-border-secondary)", borderRadius: "6px", fontSize: "14px", textAlign: "right", background: "var(--color-background-primary)", color: "var(--color-text-primary)" }} />
            </div>
          ))}
        </div>}

        {/* ── BOOKING ── */}
        {tab === "booking" && <div>
          <h2 style={sectionTitle}>Configuration Booking</h2>
          <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "12px", padding: "20px", marginBottom: "16px" }}>
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--color-text-primary)", marginBottom: "6px" }}>Emails destinataires du booking</label>
              <textarea
                className={inputCls}
                rows={3}
                value={String(settings["booking_email_recipients"] || "charly@bali-interns.com")}
                onChange={e => setSettings(p => ({ ...p, booking_email_recipients: e.target.value }))}
                onBlur={e => void saveSetting("booking_email_recipients", e.target.value)}
                placeholder="email1@example.com, email2@example.com"
                style={{ width: "100%", resize: "vertical" }}
              />
              <p style={{ fontSize: "11px", color: "var(--color-text-secondary)", marginTop: "4px" }}>Séparez les emails par des virgules</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
              {[
                { k: "booking_slot_duration", l: "Durée créneau (min)", d: "45" },
                { k: "booking_start_hour", l: "Heure début (WITA)", d: "9" },
                { k: "booking_end_hour", l: "Heure fin (WITA)", d: "18" },
              ].map(f => (
                <div key={f.k}>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--color-text-primary)", marginBottom: "6px" }}>{f.l}</label>
                  <input type="number" value={Number(settings[f.k]) || Number(f.d)} onChange={e => void saveSetting(f.k, Number(e.target.value))} style={{ width: "100%", padding: "8px 12px", border: "0.5px solid var(--color-border-secondary)", borderRadius: "8px", fontSize: "14px", background: "var(--color-background-primary)", color: "var(--color-text-primary)" }} />
                </div>
              ))}
            </div>
          </div>
          <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "12px", padding: "20px" }}>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--color-text-primary)", marginBottom: "6px" }}>Prix affiché formulaire (€)</label>
            <input type="number" value={Number(settings["form_price_display"]) || 990} onChange={e => void saveSetting("form_price_display", Number(e.target.value))} style={{ width: "120px", padding: "8px 12px", border: "0.5px solid var(--color-border-secondary)", borderRadius: "8px", fontSize: "14px", background: "var(--color-background-primary)", color: "var(--color-text-primary)" }} />
          </div>
        </div>}

        {/* ── MÉTIERS ── */}
        {tab === "metiers" && <div>
          <h2 style={sectionTitle}>Métiers (formulaire candidature)</h2>
          <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "12px", padding: "20px", marginBottom: "16px" }}>
            <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
              <input
                className={inputCls}
                placeholder="Nouveau métier…"
                value={newJobType}
                onChange={e => setNewJobType(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") void addJobType() }}
                style={{ flex: 1 }}
              />
              <button onClick={() => void addJobType()} style={{ padding: "8px 16px", background: "#c8a96e", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: 500 }}>
                + Ajouter
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {jobTypes.map((j: AnyRecord) => (
                <div key={j.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "#fafaf7", borderRadius: "8px", border: "1px solid #f3f4f6" }}>
                  <span style={{ fontSize: "14px", color: "var(--color-text-primary)" }}>{j.name}</span>
                  <button onClick={() => void deleteJobType(j.id)} style={{ fontSize: "12px", color: "#dc2626", background: "none", border: "none", cursor: "pointer", padding: "2px 6px" }}>✕</button>
                </div>
              ))}
            </div>
          </div>
        </div>}

        {/* ── ALERTES ── */}
        {tab === "alertes" && <div>
          <h2 style={sectionTitle}>Configuration des alertes</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {alertConfigs.map((a: AnyRecord) => (
              <div key={a.id} style={{ background: "var(--color-background-primary)", border: `1px solid ${a.is_active ? "var(--color-border-tertiary)" : "#e5e7eb"}`, borderRadius: "12px", padding: "16px", opacity: a.is_active ? 1 : 0.6 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                  <div>
                    <span style={{ fontWeight: 500, fontSize: "14px", color: "var(--color-text-primary)" }}>{a.label}</span>
                    <span style={{ fontSize: "12px", color: "#6b7280", marginLeft: "8px" }}>
                      J{a.days_offset >= 0 ? "+" : ""}{a.days_offset} · {a.reference_field}
                    </span>
                  </div>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                    <span style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>{a.is_active ? "Actif" : "Inactif"}</span>
                    <div
                      onClick={() => void toggleAlert(a.id, !a.is_active)}
                      style={{ width: "36px", height: "20px", borderRadius: "10px", background: a.is_active ? "#c8a96e" : "#d1d5db", position: "relative", cursor: "pointer", transition: "background 0.2s" }}
                    >
                      <div style={{ width: "16px", height: "16px", borderRadius: "50%", background: "white", position: "absolute", top: "2px", left: a.is_active ? "18px" : "2px", transition: "left 0.2s" }} />
                    </div>
                  </label>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "11px", color: "var(--color-text-secondary)", marginBottom: "4px" }}>Emails destinataires (séparés par virgule)</label>
                  <input
                    className={inputCls}
                    defaultValue={Array.isArray(a.email_recipients) ? a.email_recipients.join(", ") : ""}
                    onBlur={e => void saveAlertRecipients(a.id, e.target.value)}
                    placeholder="charly@bali-interns.com"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>}

        {/* ── MÉDIAS ── */}
        {tab === "medias" && <div>
          <h2 style={sectionTitle}>Médias & Logos</h2>
          <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "12px", padding: "20px", marginBottom: "16px" }}>
            <p style={{ fontSize: "14px", fontWeight: 500, color: "var(--color-text-primary)", marginBottom: "12px" }}>Upload logo Bali Interns</p>
            <div
              onClick={() => mediaRef.current?.click()}
              style={{ border: "2px dashed #d1d5db", borderRadius: "10px", padding: "24px", textAlign: "center", cursor: "pointer" }}
            >
              {uploadingMedia ? (
                <p style={{ color: "#6b7280", fontSize: "14px" }}>Upload en cours…</p>
              ) : (
                <>
                  <p style={{ fontSize: "24px", marginBottom: "6px" }}>🖼️</p>
                  <p style={{ color: "#6b7280", fontSize: "13px" }}>Cliquer pour choisir un fichier</p>
                  <p style={{ color: "#9ca3af", fontSize: "11px" }}>PNG, SVG, JPG — recommandé 400x400px</p>
                </>
              )}
            </div>
            <input ref={mediaRef} type="file" accept="image/*,.svg" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) void uploadMedia(f); e.target.value = "" }} />
          </div>
          {mediaAssets.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {mediaAssets.map((m: AnyRecord) => (
                <div key={m.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "10px" }}>
                  <span style={{ fontSize: "13px", color: "var(--color-text-primary)" }}>{m.name}</span>
                  <a href={m.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: "12px", color: "#c8a96e" }}>Voir →</a>
                </div>
              ))}
            </div>
          )}
        </div>}

        {/* ── TRANSPORT ── */}
        {tab === "transport" && <div>
          <h2 style={sectionTitle}>Fournisseurs de transport</h2>
          <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "12px", padding: "20px", marginBottom: "16px" }}>
            <p style={{ fontSize: "14px", fontWeight: 500, color: "var(--color-text-primary)", marginBottom: "12px" }}>Ajouter un chauffeur</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
              {[
                { k: "name" as const, l: "Nom complet *" },
                { k: "whatsapp" as const, l: "WhatsApp" },
                { k: "email" as const, l: "Email" },
                { k: "destination" as const, l: "Zone / Destination" },
              ].map(f => (
                <div key={f.k}>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--color-text-secondary)", marginBottom: "4px" }}>{f.l}</label>
                  <input className={inputCls} value={newTransport[f.k]} onChange={e => setNewTransport(p => ({ ...p, [f.k]: e.target.value }))} />
                </div>
              ))}
            </div>
            <button onClick={() => void addTransport()} style={{ padding: "8px 20px", background: "#c8a96e", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: 500 }}>
              + Ajouter
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {transportProviders.map((t: AnyRecord) => (
              <div key={t.id} style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "12px", padding: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ fontWeight: 500, fontSize: "14px", color: "var(--color-text-primary)" }}>{t.name}</span>
                    {t.is_default && <span style={{ fontSize: "11px", marginLeft: "8px", padding: "1px 6px", background: "#d1fae5", color: "#065f46", borderRadius: "4px" }}>Défaut</span>}
                  </div>
                  {!t.is_default && (
                    <button onClick={async () => { await fetch(`/api/transport-providers/${t.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_default: true }) }); setTransportProviders(p => p.map(x => ({ ...x, is_default: x.id === t.id }))) }} style={{ fontSize: "12px", padding: "3px 8px", border: "0.5px solid var(--color-border-secondary)", borderRadius: "6px", cursor: "pointer", background: "transparent", color: "var(--color-text-secondary)" }}>
                      Définir défaut
                    </button>
                  )}
                </div>
                <div style={{ display: "flex", gap: "12px", marginTop: "6px" }}>
                  {t.whatsapp && <span style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>💬 {t.whatsapp}</span>}
                  {t.destination && <span style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>📍 {t.destination}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>}

        {/* ── AFFILIATION ── */}
        {tab === "affiliation" && <div>
          <h2 style={sectionTitle}>Programme d'affiliation</h2>
          <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "12px", padding: "20px", marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--color-text-primary)", marginBottom: "6px" }}>Commission par défaut (€)</label>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <input type="number" value={Number(settings["affiliate_commission_eur"]) || 100} onChange={e => void saveSetting("affiliate_commission_eur", Number(e.target.value))} style={{ width: "100px", padding: "8px 12px", border: "0.5px solid var(--color-border-secondary)", borderRadius: "8px", fontSize: "14px", background: "var(--color-background-primary)", color: "var(--color-text-primary)" }} />
              <span style={{ fontSize: "13px", color: "var(--color-text-secondary)" }}>EUR par filleul placé et payé</span>
            </div>
          </div>
          <h3 style={{ fontSize: "14px", fontWeight: 500, color: "var(--color-text-primary)", marginBottom: "12px" }}>Affiliés actifs</h3>
          {affiliates.length === 0 ? (
            <p style={{ color: "#9ca3af", fontSize: "13px" }}>Aucun affilié pour le moment.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {affiliates.map((a: AnyRecord) => {
                const intern = a.interns as AnyRecord | null
                return (
                  <div key={a.id} style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "12px", padding: "16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <p style={{ fontWeight: 500, fontSize: "14px", color: "var(--color-text-primary)", margin: 0 }}>
                          {intern?.first_name} {intern?.last_name}
                          <span style={{ fontSize: "12px", color: "#c8a96e", marginLeft: "8px", fontFamily: "monospace" }}>{a.code}</span>
                        </p>
                        <p style={{ fontSize: "12px", color: "var(--color-text-secondary)", marginTop: "2px" }}>{intern?.email}</p>
                        <div style={{ display: "flex", gap: "16px", marginTop: "6px" }}>
                          <span style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>{a.total_referred ?? 0} parrainés</span>
                          <span style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>{a.total_paid ?? 0} ont payé</span>
                          {a.pending_payout > 0 && <span style={{ fontSize: "12px", color: "#d97706", fontWeight: 500 }}>{a.pending_payout}€ en attente</span>}
                          {a.paid_out > 0 && <span style={{ fontSize: "12px", color: "#0d9e75" }}>{a.paid_out}€ versé</span>}
                        </div>
                      </div>
                      {a.pending_payout > 0 && (
                        <button
                          disabled={saving === a.id}
                          onClick={() => void payAffiliate(a.id, a.pending_payout)}
                          style={{ padding: "6px 14px", background: "#0d9e75", color: "white", border: "none", borderRadius: "8px", fontSize: "12px", fontWeight: 600, cursor: "pointer", opacity: saving === a.id ? 0.6 : 1 }}
                        >
                          {saving === a.id ? "…" : `Marquer versé ${a.pending_payout}€`}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>}

        {/* ── AUTRES ── */}
        {tab === "links" && <div>
          <h2 style={sectionTitle}>Autres sections</h2>
          {[
            { h: "../settings/email-templates", l: "📧 Templates email", d: "28 templates" },
            { h: "../settings/housing", l: "🏠 Guesthouses", d: "22 logements, 7 scooters" },
            { h: "../settings/partners", l: "🤝 Partenaires", d: "Pré-arrivée et on-site" },
            { h: "../settings/finances", l: "💶 Finances", d: "Dashboard CA" },
            { h: "../settings/ugc", l: "📸 UGC", d: "Témoignages" },
            { h: "../settings/packages", l: "📦 Packages", d: "Standard, Express, VisaOnly" },
            { h: "../groups", l: "🚌 Groupes de départ", d: "Coordination chauffeurs" },
          ].map(x => (
            <Link key={x.h} href={x.h} style={{ display: "block", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "12px", padding: "16px", marginBottom: "8px", textDecoration: "none", color: "var(--color-text-primary)", background: "var(--color-background-primary)" }}>
              <p style={{ fontWeight: 500, fontSize: "14px", margin: "0 0 4px" }}>{x.l}</p>
              <p style={{ fontSize: "12px", color: "var(--color-text-secondary)", margin: 0 }}>{x.d}</p>
            </Link>
          ))}
        </div>}

        {/* ── UTILISATEURS ── */}
        {tab === "users" && <div>
          <h2 style={sectionTitle}>Utilisateurs</h2>
          {[
            { i: "S", bg: "#c8a96e", n: "Sidney Ruby", e: "sidney.ruby@gmail.com" },
            { i: "C", bg: "#0d9e75", n: "Charly Gestede", e: "charly@bali-interns.com" },
          ].map(u => (
            <div key={u.e} style={{ display: "flex", gap: "12px", alignItems: "center", padding: "12px", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "12px", marginBottom: "8px", background: "var(--color-background-primary)" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: u.bg, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 600, fontSize: "14px", flexShrink: 0 }}>{u.i}</div>
              <div><p style={{ margin: 0, fontWeight: 500, fontSize: "14px", color: "var(--color-text-primary)" }}>{u.n}</p><p style={{ margin: 0, fontSize: "12px", color: "var(--color-text-secondary)" }}>{u.e} · Admin</p></div>
            </div>
          ))}
          <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: "12px", padding: "16px", marginTop: "16px", background: "var(--color-background-primary)" }}>
            <p style={{ fontWeight: 500, fontSize: "14px", marginBottom: "12px", color: "var(--color-text-primary)" }}>Inviter un utilisateur</p>
            <div style={{ display: "flex", gap: "8px" }}>
              <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="email@example.com" style={{ flex: 1, padding: "8px 12px", border: "0.5px solid var(--color-border-secondary)", borderRadius: "8px", fontSize: "14px", background: "var(--color-background-primary)", color: "var(--color-text-primary)" }} />
              <button onClick={() => { if (inviteEmail) { void fetch("/api/users/invite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: inviteEmail, role: "admin" }) }); setInviteEmail("") } }} style={{ padding: "8px 16px", background: "#c8a96e", color: "white", border: "none", borderRadius: "8px", cursor: "pointer" }}>
                Inviter
              </button>
            </div>
          </div>
        </div>}
      </div>
    </div>
  )
}
