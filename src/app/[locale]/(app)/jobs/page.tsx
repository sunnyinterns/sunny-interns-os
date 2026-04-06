"use client"
import { useEffect, useState } from "react"

interface Job { id: string; title: string; department?: string; status: string; wished_start_date?: string; company_name?: string }

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [companies, setCompanies] = useState<{id:string;name:string}[]>([])
  const [form, setForm] = useState({ title:"", company_id:"", department:"", wished_start_date:"", wished_duration_months:"4", description:"" })

  useEffect(() => {
    Promise.all([
      fetch("/api/jobs").then(r=>r.json()),
      fetch("/api/companies").then(r=>r.json())
    ]).then(([j,c]) => { setJobs(Array.isArray(j)?j:[]); setCompanies(Array.isArray(c)?c:[]); setLoading(false) })
  }, [])

  async function createJob(e: React.FormEvent) {
    e.preventDefault()
    const r = await fetch("/api/jobs", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({...form, destination_id:"fc9ece85-e5d5-41d2-9142-79054244bbce", status:"open", wished_duration_months:Number(form.wished_duration_months)}) })
    if (r.ok) { const j = await r.json(); setJobs(p=>[j,...p]); setShowModal(false) }
  }

  const badge = (s:string) => ({ open:"#d1fae5|#065f46", staffed:"#dbeafe|#1e40af", closed:"#f3f4f6|#374151" }[s]?.split("|") || ["#f3f4f6","#374151"])

  return (
    <div style={{padding:"24px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"24px"}}>
        <h1 style={{fontSize:"20px",fontWeight:500,color:"var(--color-text-primary)",margin:0}}>Jobs {jobs.length > 0 && <span style={{fontSize:"14px",fontWeight:400,color:"var(--color-text-secondary)"}}>({jobs.length})</span>}</h1>
        <button onClick={()=>setShowModal(true)} style={{background:"#c8a96e",color:"white",border:"none",borderRadius:"8px",padding:"8px 16px",cursor:"pointer",fontSize:"14px"}}>+ Nouveau job</button>
      </div>
      {loading ? <p style={{color:"var(--color-text-secondary)"}}>Chargement...</p> : jobs.length === 0 ? (
        <div style={{textAlign:"center",padding:"64px",color:"var(--color-text-secondary)"}}>
          <div style={{fontSize:"48px",marginBottom:"16px"}}>💼</div>
          <p style={{fontSize:"18px",fontWeight:500,marginBottom:"8px",color:"var(--color-text-primary)"}}>Aucun job disponible</p>
          <p style={{marginBottom:"24px"}}>Créez votre première offre de stage</p>
          <button onClick={()=>setShowModal(true)} style={{background:"#c8a96e",color:"white",border:"none",borderRadius:"8px",padding:"12px 24px",cursor:"pointer",fontSize:"14px"}}>Créer un job</button>
        </div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
          {jobs.map(j => {
            const [bg,color] = badge(j.status)
            return (
              <div key={j.id} style={{background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:"12px",padding:"16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <p style={{fontWeight:500,fontSize:"14px",margin:"0 0 4px",color:"var(--color-text-primary)"}}>{j.title}</p>
                  <p style={{fontSize:"12px",color:"var(--color-text-secondary)",margin:0}}>{[j.company_name,j.department].filter(Boolean).join(" · ")}</p>
                </div>
                <span style={{fontSize:"11px",padding:"2px 8px",borderRadius:"4px",background:bg,color,flexShrink:0}}>{j.status}</span>
              </div>
            )
          })}
        </div>
      )}
      {showModal && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50}}>
          <div style={{background:"var(--color-background-primary)",borderRadius:"16px",padding:"24px",width:"440px",maxWidth:"90vw"}}>
            <h2 style={{margin:"0 0 16px",fontSize:"16px",fontWeight:500}}>Nouveau job</h2>
            <form onSubmit={createJob} style={{display:"flex",flexDirection:"column",gap:"10px"}}>
              <input required placeholder="Titre du job *" value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} style={{padding:"8px 12px",border:"0.5px solid var(--color-border-secondary)",borderRadius:"8px",fontSize:"14px",background:"var(--color-background-primary)",color:"var(--color-text-primary)"}} />
              <select required value={form.company_id} onChange={e=>setForm(p=>({...p,company_id:e.target.value}))} style={{padding:"8px 12px",border:"0.5px solid var(--color-border-secondary)",borderRadius:"8px",fontSize:"14px",background:"var(--color-background-primary)",color:"var(--color-text-primary)"}}>
                <option value="">Choisir une company *</option>
                {companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input placeholder="Département (ex: Marketing)" value={form.department} onChange={e=>setForm(p=>({...p,department:e.target.value}))} style={{padding:"8px 12px",border:"0.5px solid var(--color-border-secondary)",borderRadius:"8px",fontSize:"14px",background:"var(--color-background-primary)",color:"var(--color-text-primary)"}} />
              <input type="date" placeholder="Date de démarrage" value={form.wished_start_date} onChange={e=>setForm(p=>({...p,wished_start_date:e.target.value}))} style={{padding:"8px 12px",border:"0.5px solid var(--color-border-secondary)",borderRadius:"8px",fontSize:"14px",background:"var(--color-background-primary)",color:"var(--color-text-primary)"}} />
              <input type="number" placeholder="Durée (mois)" value={form.wished_duration_months} onChange={e=>setForm(p=>({...p,wished_duration_months:e.target.value}))} style={{padding:"8px 12px",border:"0.5px solid var(--color-border-secondary)",borderRadius:"8px",fontSize:"14px",background:"var(--color-background-primary)",color:"var(--color-text-primary)"}} />
              <textarea placeholder="Description" value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} rows={3} style={{padding:"8px 12px",border:"0.5px solid var(--color-border-secondary)",borderRadius:"8px",fontSize:"14px",background:"var(--color-background-primary)",color:"var(--color-text-primary)",resize:"vertical"}} />
              <div style={{display:"flex",gap:"8px",justifyContent:"flex-end",marginTop:"8px"}}>
                <button type="button" onClick={()=>setShowModal(false)} style={{padding:"8px 16px",border:"0.5px solid var(--color-border-secondary)",borderRadius:"8px",cursor:"pointer",background:"transparent",color:"var(--color-text-primary)"}}>Annuler</button>
                <button type="submit" style={{padding:"8px 16px",background:"#c8a96e",color:"white",border:"none",borderRadius:"8px",cursor:"pointer"}}>Créer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
