"use client"
import { useEffect, useState } from "react"
import Link from "next/link"

export default function SettingsPage() {
  const [tab, setTab] = useState("entities")
  const [entities, setEntities] = useState<any[]>([])
  const [agents, setAgents] = useState<any[]>([])
  const [settings, setSettings] = useState<Record<string,number>>({})
  const [inviteEmail, setInviteEmail] = useState("")

  useEffect(() => {
    fetch("/api/billing-entities").then(r=>r.json()).then(d=>setEntities(Array.isArray(d)?d:[]))
    fetch("/api/visa-agents").then(r=>r.json()).then(d=>setAgents(Array.isArray(d)?d:[]))
    fetch("/api/settings").then(r=>r.json()).then(d=>{ const s:any={}; if(Array.isArray(d)) d.forEach((i:any)=>{ s[i.key]=Number(i.value) }); setSettings(s) })
  },[])

  const tabs = [
    {id:"entities",label:"Entités légales"},
    {id:"agents",label:"Agents visa"},
    {id:"retro",label:"Rétro-planning"},
    {id:"links",label:"Autres sections"},
    {id:"users",label:"Utilisateurs"},
  ]

  async function saveRetro(key:string, val:number) {
    setSettings(p=>({...p,[key]:val}))
    await fetch(`/api/settings/${key}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({value:val})})
  }

  const tabStyle = (active:boolean) => ({display:"block",width:"100%",textAlign:"left" as const,padding:"8px 10px",borderRadius:"6px",border:"none",cursor:"pointer",fontSize:"13px",marginBottom:"2px",background:active?"rgba(200,169,110,0.15)":"transparent",color:active?"#c8a96e":"var(--color-text-secondary)",fontWeight:active?500:400})

  return (
    <div style={{display:"flex",minHeight:"100vh"}}>
      <div style={{width:"200px",borderRight:"0.5px solid var(--color-border-tertiary)",padding:"16px",flexShrink:0}}>
        {tabs.map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={tabStyle(tab===t.id)}>{t.label}</button>)}
      </div>
      <div style={{flex:1,padding:"24px",overflowY:"auto"}}>
        {tab==="entities" && <div>
          <h2 style={{fontSize:"16px",fontWeight:500,marginBottom:"16px",color:"var(--color-text-primary)"}}>Entités légales</h2>
          {entities.map((e:any)=>(
            <div key={e.id} style={{border:`1px solid ${!e.is_active?"#fca5a5":"var(--color-border-tertiary)"}`,borderRadius:"12px",padding:"16px",marginBottom:"8px",background:!e.is_active?"#fff5f5":"var(--color-background-primary)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{display:"flex",gap:"8px",alignItems:"center",marginBottom:"4px"}}>
                    <span style={{fontWeight:500,fontSize:"14px",color:"var(--color-text-primary)"}}>{e.name}</span>
                    {e.is_default && <span style={{fontSize:"11px",padding:"1px 6px",background:"#d1fae5",color:"#065f46",borderRadius:"4px"}}>Défaut</span>}
                    {!e.is_active && <span style={{fontSize:"11px",padding:"1px 6px",background:"#fee2e2",color:"#dc2626",borderRadius:"4px"}}>INACTIVE</span>}
                  </div>
                  <span style={{fontSize:"12px",color:"var(--color-text-secondary)"}}>{e.country}</span>
                </div>
                {!e.is_default && e.is_active && <button onClick={async()=>{ await fetch("/api/billing-entities",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:e.id,is_default:true})}); setEntities(p=>p.map((x:any)=>({...x,is_default:x.id===e.id}))) }} style={{fontSize:"12px",padding:"4px 10px",border:"0.5px solid var(--color-border-secondary)",borderRadius:"6px",cursor:"pointer",background:"transparent",color:"var(--color-text-secondary)"}}>Définir défaut</button>}
              </div>
              {!e.is_active && <p style={{fontSize:"12px",color:"#dc2626",marginTop:"8px",marginBottom:0}}>⚠ Entité inactive — paiements refusés par les banques françaises.</p>}
            </div>
          ))}
        </div>}
        {tab==="agents" && <div>
          <h2 style={{fontSize:"16px",fontWeight:500,marginBottom:"16px",color:"var(--color-text-primary)"}}>Agents visa</h2>
          {agents.map((a:any)=>(
            <div key={a.id} style={{border:"0.5px solid var(--color-border-tertiary)",borderRadius:"12px",padding:"16px",marginBottom:"8px",background:"var(--color-background-primary)"}}>
              <div style={{display:"flex",gap:"8px",alignItems:"center",marginBottom:"4px"}}>
                <span style={{fontWeight:500,fontSize:"14px",color:"var(--color-text-primary)"}}>{a.company_name}</span>
                {a.is_default && <span style={{fontSize:"11px",padding:"1px 6px",background:"#d1fae5",color:"#065f46",borderRadius:"4px"}}>Défaut</span>}
              </div>
              <span style={{fontSize:"12px",color:"var(--color-text-secondary)"}}>{a.contact_name} · {a.email}</span>
            </div>
          ))}
        </div>}
        {tab==="retro" && <div>
          <h2 style={{fontSize:"16px",fontWeight:500,marginBottom:"16px",color:"var(--color-text-primary)"}}>Rétro-planning & TVA</h2>
          {[{k:"retro_flight_days",l:"Billet J-"},{k:"retro_payment_days",l:"Paiement J-"},{k:"retro_visa_submit_days",l:"Visa soumis J-"},{k:"retro_visa_received_days",l:"Visa reçu J-"},{k:"retro_driver_j2",l:"Chauffeur J-"},{k:"vat_rate",l:"TVA %"}].map(f=>(
            <div key={f.k} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 0",borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
              <span style={{fontSize:"14px",color:"var(--color-text-primary)"}}>{f.l}{settings[f.k]||"—"}</span>
              <input type="number" value={settings[f.k]||""} onChange={e=>saveRetro(f.k,Number(e.target.value))} style={{width:"70px",padding:"6px 10px",border:"0.5px solid var(--color-border-secondary)",borderRadius:"6px",fontSize:"14px",textAlign:"right",background:"var(--color-background-primary)",color:"var(--color-text-primary)"}} />
            </div>
          ))}
        </div>}
        {tab==="links" && <div>
          <h2 style={{fontSize:"16px",fontWeight:500,marginBottom:"16px",color:"var(--color-text-primary)"}}>Autres sections</h2>
          {[{h:"../settings/email-templates",l:"📧 Templates email",d:"28 templates"},{h:"../settings/housing",l:"🏠 Guesthouses",d:"22 logements, 7 scooters"},{h:"../settings/partners",l:"🤝 Partenaires",d:"Pré-arrivée et on-site"},{h:"../settings/finances",l:"💶 Finances",d:"Dashboard CA"},{h:"../settings/ugc",l:"📸 UGC",d:"Témoignages"}].map(x=>(
            <Link key={x.h} href={x.h} style={{display:"block",border:"0.5px solid var(--color-border-tertiary)",borderRadius:"12px",padding:"16px",marginBottom:"8px",textDecoration:"none",color:"var(--color-text-primary)",background:"var(--color-background-primary)"}}>
              <p style={{fontWeight:500,fontSize:"14px",margin:"0 0 4px"}}>{x.l}</p>
              <p style={{fontSize:"12px",color:"var(--color-text-secondary)",margin:0}}>{x.d}</p>
            </Link>
          ))}
        </div>}
        {tab==="users" && <div>
          <h2 style={{fontSize:"16px",fontWeight:500,marginBottom:"16px",color:"var(--color-text-primary)"}}>Utilisateurs</h2>
          {[{i:"S",bg:"#c8a96e",n:"Sidney Ruby",e:"sidney.ruby@gmail.com"},{i:"C",bg:"#0d9e75",n:"Charly Gestede",e:"charly@bali-interns.com"}].map(u=>(
            <div key={u.e} style={{display:"flex",gap:"12px",alignItems:"center",padding:"12px",border:"0.5px solid var(--color-border-tertiary)",borderRadius:"12px",marginBottom:"8px",background:"var(--color-background-primary)"}}>
              <div style={{width:"36px",height:"36px",borderRadius:"50%",background:u.bg,display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontWeight:600,fontSize:"14px",flexShrink:0}}>{u.i}</div>
              <div><p style={{margin:0,fontWeight:500,fontSize:"14px",color:"var(--color-text-primary)"}}>{u.n}</p><p style={{margin:0,fontSize:"12px",color:"var(--color-text-secondary)"}}>{u.e} · Admin</p></div>
            </div>
          ))}
          <div style={{border:"0.5px solid var(--color-border-tertiary)",borderRadius:"12px",padding:"16px",marginTop:"16px",background:"var(--color-background-primary)"}}>
            <p style={{fontWeight:500,fontSize:"14px",marginBottom:"12px",color:"var(--color-text-primary)"}}>Inviter un utilisateur</p>
            <div style={{display:"flex",gap:"8px"}}>
              <input value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)} placeholder="email@example.com" style={{flex:1,padding:"8px 12px",border:"0.5px solid var(--color-border-secondary)",borderRadius:"8px",fontSize:"14px",background:"var(--color-background-primary)",color:"var(--color-text-primary)"}} />
              <button onClick={()=>{if(inviteEmail){fetch("/api/users/invite",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:inviteEmail,role:"admin"})});setInviteEmail("");}}} style={{padding:"8px 16px",background:"#c8a96e",color:"white",border:"none",borderRadius:"8px",cursor:"pointer"}}>Inviter</button>
            </div>
          </div>
        </div>}
      </div>
    </div>
  )
}
