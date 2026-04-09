'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userInitials, setUserInitials] = useState('?')
  const [openJobsCount, setOpenJobsCount] = useState<number | null>(null)
  const [newLeadsCount, setNewLeadsCount] = useState<number | null>(null)
  const [activeClientsCount, setActiveClientsCount] = useState<number | null>(null)
  const [candidatsCount, setCandidatsCount] = useState<number | null>(null)
  const [todoCount, setTodoCount] = useState<number>(0)
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    setSettingsOpen(pathname.startsWith('/fr/settings'))
  }, [pathname])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) {
        setUserEmail(user.email)
        setUserInitials(
          user.email.split('@')[0].split('.').map((p: string) => p[0]?.toUpperCase() ?? '').join('').slice(0, 2)
        )
      }
    })

    fetch('/api/todo')
      .then(r => r.ok ? r.json() : null)
      .then((d: { count?: number } | null) => { if (d) setTodoCount(d.count ?? 0) })
      .catch(() => {})

    fetch('/api/jobs?status=open')
      .then(r => r.ok ? r.json() : [])
      .then((d: unknown[]) => setOpenJobsCount(Array.isArray(d) ? d.length : 0))
      .catch(() => {})

    fetch('/api/cases?status=lead')
      .then(r => r.ok ? r.json() : [])
      .then((d: unknown[]) => setNewLeadsCount(Array.isArray(d) ? d.length : 0))
      .catch(() => {})

    fetch('/api/cases?view=all')
      .then(r => r.ok ? r.json() : [])
      .then((d: unknown[]) => {
        if (!Array.isArray(d)) return
        const clientSt = ['visa_docs_sent','visa_submitted','visa_in_progress','visa_received','arrival_prep','active']
        const candidatSt = ['rdv_booked','qualification_done','job_submitted','job_retained','convention_signed','payment_pending','payment_received']
        setActiveClientsCount(d.filter((c: unknown) => clientSt.includes((c as { status: string }).status)).length)
        setCandidatsCount(d.filter((c: unknown) => candidatSt.includes((c as { status: string }).status)).length)
      })
      .catch(() => {})
  }, [])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/fr/login')
  }

  function NavLink({ href, label, icon, badge, urgent }: {
    href: string; label: string; icon: React.ReactNode
    badge?: number | null; urgent?: boolean
  }) {
    const active = pathname === href || pathname.startsWith(href + '/')
    return (
      <Link
        href={href}
        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
          active
            ? 'bg-[#c8a96e]/15 text-[#c8a96e]'
            : 'text-zinc-500 hover:text-[#1a1918] hover:bg-zinc-100'
        }`}
      >
        <span className="flex-shrink-0">{icon}</span>
        <span className="flex-1 truncate">{label}</span>
        {badge != null && badge > 0 && (
          <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center ${
            urgent ? 'bg-red-500 text-white' : 'bg-zinc-200 text-zinc-600'
          }`}>
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </Link>
    )
  }

  function Sep() {
    return <div className="my-2 border-t border-zinc-100" />
  }

  const icons = {
    dashboard: <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
    activity: <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
    todo: <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>,
    kanban: <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" /></svg>,
    leads: <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>,
    candidats: <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
    clients: <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" /></svg>,
    offres: <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
    contacts: <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
    companies: <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
    calendar: <svg width='16' height='16' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth={1.75}><path strokeLinecap='round' strokeLinejoin='round' d='M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' /></svg>,
    schools: <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /></svg>,
    finances: <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    settings: <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><circle cx="12" cy="12" r="3" /></svg>,
  }

  return (
    <aside className="w-56 flex-shrink-0 bg-[#fafaf9] border-r border-zinc-200 flex flex-col h-screen sticky top-0 overflow-y-auto">

      {/* Logo */}
      <div className="px-4 pt-5 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#c8a96e] flex items-center justify-center">
            <span className="text-white text-xs font-bold">BI</span>
          </div>
          <span className="font-bold text-[#1a1918] text-sm">Bali Interns</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 pb-4 space-y-0.5">

        <NavLink href="/fr/feed" label="Dashboard" icon={icons.dashboard} badge={todoCount} urgent={todoCount > 0} />
        <NavLink href="/fr/activity" label="Activity" icon={icons.activity} />
        <NavLink href="/fr/todo" label="To Do" icon={icons.todo} badge={todoCount} urgent={todoCount > 0} />
        <NavLink href="/fr/calendar" label="Calendrier" icon={icons.calendar} />
        <NavLink href="/fr/pipeline" label="Kanban" icon={icons.kanban} />
        <NavLink href="/fr/leads" label="Leads" icon={icons.leads} badge={newLeadsCount} urgent={(newLeadsCount ?? 0) > 0} />
        <NavLink href="/fr/cases" label="Candidats" icon={icons.candidats} badge={candidatsCount} />
        <NavLink href="/fr/clients" label="Clients" icon={icons.clients} badge={activeClientsCount} />

        <Sep />

        <NavLink href="/fr/jobs" label="Offres de stage" icon={icons.offres} badge={openJobsCount} />

        <Sep />

        <NavLink href="/fr/contacts" label="Contacts" icon={icons.contacts} />
        <NavLink href="/fr/companies" label="Entreprises" icon={icons.companies} />
        <NavLink href="/fr/schools" label="Écoles" icon={icons.schools} />

        <Sep />

        <NavLink href="/fr/finances" label="Finances" icon={icons.finances} />

        <Sep />

        <NavLink href="/fr/settings" label="Paramètres" icon={icons.settings} />

      </nav>

      {/* User footer */}
      <div className="px-3 pb-4 border-t border-zinc-200 pt-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-[#c8a96e]/20 flex items-center justify-center text-xs font-bold text-[#c8a96e]">
            {userInitials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-zinc-500 truncate">{userEmail ?? '...'}</p>
          </div>
          <button onClick={handleLogout} className="text-zinc-400 hover:text-red-500 transition-colors" title="Déconnexion">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>

    </aside>
  )
}
