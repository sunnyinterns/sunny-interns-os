"use client"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"

interface Company { id: string; name: string; type?: string; category?: string; city?: string; is_active: boolean }

export default function CompaniesPage() {
  const { locale } = useParams()
  const [companies, setCompanies] = useState<Company[]>([])
  const [q, setQ] = useState("")
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: "", type: "", category: "", city: "", website: "" })

  useEffect(() => {
    fetch("/api/companies").then(r => r.json()).then(d => { setCompanies(Array.isArray(d) ? d : []); setLoading(false) })
  }, [])

  const filtered = companies.filter(c => c.name.toLowerCase().includes(q.toLowerCase()))

  async function createCompany(e: React.FormEvent) {
    e.preventDefault()
    const r = await fetch("/api/companies", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ ...form, destination_id: "fc9ece85-e5d5-41d2-9142-79054244bbce", country: "Indonesia", is_active: true }) })
    if (r.ok) { const c = await r.json(); setCompanies(prev => [...prev, c]); setShowModal(false); setForm({ name: "", type: "", category: "", city: "", website: "" }) }
  }

  return (
    <div style={{ padding: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <h1 style={{ fontSize: "20px", fontWeight: 500, color: "var(--color-text-primary)", margin: 0 }}>Companies</h1>
        <button onClick={() => setShowModal(true)} style={{ background: "#c8a96e", color: "white", border: "none", borderRadius: "8px", padding: "8px 16px", cursor: "pointer", fontSize: "14px" }}>+ Nouvelle company</button>
      </div>
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher..." style={{ width: "100%", maxWidth: "400px", padding: "8px 12px", border: "0.5px solid var(--color-border-secondary)", borderRadius: "8px", fontSize: "14px", marginBottom: "16px", background: "var(--color-background-primary)", color: "var(--color-text-primary)" }} />
      {loading ? <p style={{ color: "var(--color-text-secondary)" }}>Chargement...</p> : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px", color: "var(--color-text-secondary)" }}>
          <p style={{ fontSize: "16px", marginBottom: "8px" }}>Aucune company trouvée</p>
          <button onClick={() => setShowModal(true)} style={{ background: "#c8a96e", color: "white", border: "none", borderRadius: "8px", padding: "8px 16px", cursor: "pointer" }}>Créer une company</button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "12px" }}>
          {filtered.map(c => (
            <div key={c.id} style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "12px", padding: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "#111110", display: "flex", alignItems: "center", justifyContent: "center", color: "#c8a96e", fontWeight: 600, fontSize: "14px", flexShrink: 0 }}>{c.name[0]}</div>
                <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "4px", background: c.is_active ? "#d1fae5" : "#fee2e2", color: c.is_active ? "#065f46" : "#991b1b" }}>{c.is_active ? "Actif" : "Inactif"}</span>
              </div>
              <p style={{ fontWeight: 500, fontSize: "14px", marginTop: "8px", marginBottom: "4px", color: "var(--color-text-primary)" }}>{c.name}</p>
              <p style={{ fontSize: "12px", color: "var(--color-text-secondary)", margin: 0 }}>{[c.type, c.category, c.city].filter(Boolean).join(" · ")}</p>
            </div>
          ))}
        </div>
      )}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ background: "var(--color-background-primary)", borderRadius: "16px", padding: "24px", width: "400px", maxWidth: "90vw" }}>
            <h2 style={{ margin: "0 0 16px", fontSize: "16px", fontWeight: 500 }}>Nouvelle company</h2>
            <form onSubmit={createCompany} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {[["name","Nom *"],["type","Type"],["category","Catégorie"],["city","Ville"],["website","Website"]].map(([k,l]) => (
                <input key={k} required={k==="name"} placeholder={l} value={(form as Record<string,string>)[k]} onChange={e => setForm(p => ({...p,[k]:e.target.value}))} style={{ padding: "8px 12px", border: "0.5px solid var(--color-border-secondary)", borderRadius: "8px", fontSize: "14px", background: "var(--color-background-primary)", color: "var(--color-text-primary)" }} />
              ))}
              <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "8px" }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: "8px 16px", border: "0.5px solid var(--color-border-secondary)", borderRadius: "8px", cursor: "pointer", background: "transparent", color: "var(--color-text-primary)" }}>Annuler</button>
                <button type="submit" style={{ padding: "8px 16px", background: "#c8a96e", color: "white", border: "none", borderRadius: "8px", cursor: "pointer" }}>Créer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
