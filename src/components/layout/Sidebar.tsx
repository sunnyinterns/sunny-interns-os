'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const LOGO_URL = 'https://djoqjgiyseobotsjqcgz.supabase.co/storage/v1/object/public/brand-assets/logos/logo_landscape_black.png'
const WEBSITE_URL = 'https://bali-interns.com'

// ── SVG icon helpers ─────────────────────────────────────────────────────────
const Icon = ({ d, ...p }: { d: string | string[]; [k: string]: unknown }) => (
  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} {...p}>
    {(Array.isArray(d) ? d : [d]).map((path, i) => (
      <path key={i} strokeLinecap="round" strokeLinejoin="round" d={path} />
    ))}
  </svg>
)

const ICONS = {
  dashboard:  'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  notifs:     'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
  clock:      'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  todo:       ['M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2','M9 14l2 2 4-4'],
  calendar:   ['M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'],
  kanban:     'M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7',
  leads:      ['M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z'],
  candidats:  'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
  clients:    'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064',
  alumni:     ['M12 14l9-5-9-5-9 5 9 5z', 'M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z'],
  jobs:       'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  contacts:   ['M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'],
  companies:  'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
  schools:    ['M12 14l9-5-9-5-9 5 9 5z'],
  finances:   'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  settings:   ['M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z', 'M15 12a3 3 0 11-6 0 3 3 0 016 0z'],
  marketing:  'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z',
  blog:       ['M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z'],
  social:     ['M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z'],
  logout:     'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1',
  user:       'M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  website:    ['M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14'],
  tests:      ['M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', 'M9 12l2 2 4-4'],
}

const BOTTOM_NAV = [
  { href: '/fr/feed', d: ICONS.dashboard, label: 'Dashboard' },
  { href: '/fr/todo', d: ICONS.todo, label: 'To Do' },
  { href: '/fr/calendar', d: ICONS.calendar, label: 'Calendrier' },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userInitials, setUserInitials] = useState('?')
  const [openJobsCount, setOpenJobsCount] = useState<number | null>(null)
  const [newLeadsCount, setNewLeadsCount] = useState<number | null>(null)
  const [activeClientsCount, setActiveClientsCount] = useState<number | null>(null)
  const [candidatsCount, setCandidatsCount] = useState<number | null>(null)
  const [recontactCount, setRecontactCount] = useState<number | null>(null)
  const [todoCount, setTodoCount] = useState<number>(0)
  const [notifCount, setNotifCount] = useState<number>(0)
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) {
        setUserEmail(user.email)
        setUserInitials(user.email.split('@')[0].split('.').map((p: string) => p[0]?.toUpperCase() ?? '').join('').slice(0, 2))
      }
    })
    fetch('/api/todo').then(r => r.ok ? r.json() : null).then((d: { count?: number; todos?: unknown[] } | null) => { if (d) setTodoCount(d.count ?? d.todos?.length ?? 0) }).catch(() => {})
    fetch('/api/jobs?status=open').then(r => r.ok ? r.json() : []).then((d: unknown[]) => setOpenJobsCount(Array.isArray(d) ? d.length : 0)).catch(() => {})
    fetch('/api/cases?status=lead').then(r => r.ok ? r.json() : []).then((d: unknown[]) => setNewLeadsCount(Array.isArray(d) ? d.length : 0)).catch(() => {})
    fetch('/api/cases?type=client').then(r => r.ok ? r.json() : []).then((d: unknown[]) => setActiveClientsCount(Array.isArray(d) ? d.length : 0)).catch(() => {})
    fetch('/api/cases?type=candidate').then(r => r.ok ? r.json() : []).then((d: unknown[]) => setCandidatsCount(Array.isArray(d) ? d.length : 0)).catch(() => {})
    fetch('/api/cases?status=to_recontact').then(r => r.ok ? r.json() : []).then((d: unknown[]) => setRecontactCount(Array.isArray(d) ? d.length : 0)).catch(() => {})
    fetch('/api/notifications/unread-count').then(r => r.ok ? r.json() : { count: 0 }).then((d: { count?: number }) => setNotifCount(d.count ?? 0)).catch(() => {})
  }, [])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/fr/login')
  }

  function NavLink({ href, label, d, badge, urgent }: { href: string; label: string; d: string | string[]; badge?: number | null; urgent?: boolean }) {
    const active = pathname === href || pathname.startsWith(href + '/')
    return (
      <Link href={href} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${active ? 'bg-[#c8a96e]/15 text-[#c8a96e]' : 'text-zinc-500 hover:text-[#1a1918] hover:bg-zinc-100'}`}>
        <Icon d={d} className="flex-shrink-0 w-4 h-4" />
        <span className="flex-1 truncate">{label}</span>
        {badge != null && badge > 0 && (
          <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center ${urgent ? 'bg-red-500 text-white' : 'bg-zinc-200 text-zinc-600'}`}>
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </Link>
    )
  }

  function SoonLink({ href, label, d }: { href: string; label: string; d: string | string[] }) {
    const active = pathname === href || pathname.startsWith(href + '/')
    return (
      <Link href={href} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${active ? 'bg-[#c8a96e]/15 text-[#c8a96e]' : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100'}`}>
        <Icon d={d} className="flex-shrink-0 w-4 h-4" />
        <span className="flex-1 truncate">{label}</span>
      </Link>
    )
  }

  function Sep() { return <div className="my-1.5 border-t border-zinc-100" /> }
  function Label({ children }: { children: React.ReactNode }) {
    return <p className="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-zinc-300">{children}</p>
  }

  return (
    <>
    <aside className="hidden md:flex w-56 flex-shrink-0 bg-[#fafaf9] border-r border-zinc-200 flex-col h-screen sticky top-0 overflow-y-auto">

      {/* Logo + Website link */}
      <div className="px-4 pt-5 pb-3 flex items-center justify-between gap-2">
        <Image
          src={LOGO_URL}
          alt="Bali Interns"
          width={120}
          height={28}
          style={{ height: '22px', width: 'auto' }}
          unoptimized
          priority
        />
        <a href={WEBSITE_URL} target="_blank" rel="noopener noreferrer"
          title="Ouvrir le site Bali Interns"
          className="text-zinc-300 hover:text-[#c8a96e] transition-colors flex-shrink-0">
          <Icon d={ICONS.website} />
        </a>
      </div>

      {/* Search hint */}
      <div className="px-3 pb-2">
        <button onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }))}
          className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-zinc-400 bg-zinc-100 hover:bg-zinc-200 transition-colors">
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <span className="flex-1 text-left">Search</span>
          <kbd className="font-mono text-[10px] px-1 py-0.5 bg-white border border-zinc-200 rounded">⌘K</kbd>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 pb-4 space-y-0.5">

        <NavLink href="/fr/feed" label="Dashboard" d={ICONS.dashboard} badge={todoCount} urgent={todoCount > 0} />
        <NavLink href="/fr/notifications" label="Notifications" d={ICONS.notifs} badge={notifCount} urgent={notifCount > 0} />
        <NavLink href="/fr/en-attente" label="En Attente" d={ICONS.clock} />
        <NavLink href="/fr/todo" label="To Do" d={ICONS.todo} badge={todoCount} urgent={todoCount > 0} />
        <NavLink href="/fr/calendar" label="Calendrier" d={ICONS.calendar} />
        <NavLink href="/fr/pipeline" label="Pipeline" d={ICONS.kanban} />

        <Sep />
        <Label>Candidats</Label>
        <NavLink href="/fr/leads" label="Leads" d={ICONS.leads} badge={newLeadsCount} />
        <NavLink href="/fr/cases" label="Candidats" d={ICONS.candidats} badge={candidatsCount} />
        <NavLink href="/fr/recontact" label="À recontacter" d={ICONS.clock} badge={recontactCount} urgent={!!(recontactCount && recontactCount > 0)} />
        <NavLink href="/fr/clients" label="Clients" d={ICONS.clients} badge={activeClientsCount} />
        <NavLink href="/fr/alumni" label="Alumni" d={ICONS.alumni} />

        <Sep />
        <Label>Opérations</Label>
        <NavLink href="/fr/jobs" label="Offres de stage" d={ICONS.jobs} badge={openJobsCount} />
        <NavLink href="/fr/contacts" label="Contacts" d={ICONS.contacts} />
        <NavLink href="/fr/companies" label="Entreprises" d={ICONS.companies} />
        <NavLink href="/fr/schools" label="Écoles" d={ICONS.schools} />

        <Sep />
        <p className="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest" style={{color: '#c8a96e'}}>Marketing</p>
        <NavLink href="/fr/marketing/jobs" label="Posting Calendar" d={ICONS.marketing} />
        <NavLink href="/fr/blog" label="Blog" d={ICONS.blog} />
        <NavLink href="/fr/settings/marketing" label="⚙️ Réseaux & Branding" d={ICONS.marketing} />

        <Sep />
        <Label>Finance</Label>
        <NavLink href="/fr/finances" label="Finances" d={ICONS.finances} />

        <Sep />
        {/* Tests + Paramètres + User */}
        <NavLink href="/fr/settings" label="Paramètres" d={ICONS.settings} />
        <NavLink href="/fr/settings/marketing" label="Marketing" d={ICONS.marketing} />
        {/* User inline sous settings */}
        {userEmail && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg">
            <div className="w-5 h-5 rounded-full bg-[#c8a96e]/20 flex items-center justify-center text-[10px] font-bold text-[#c8a96e] shrink-0">
              {userInitials}
            </div>
            <span className="text-[11px] text-zinc-400 truncate flex-1">{userEmail}</span>
            <button onClick={handleLogout} className="text-zinc-300 hover:text-red-400 transition-colors shrink-0" title="Déconnexion">
              <Icon d={ICONS.logout} />
            </button>
          </div>
        )}

      </nav>
    </aside>

    {/* BOTTOM NAV — mobile */}
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-zinc-200 md:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex items-center justify-around h-16 px-2">
        {BOTTOM_NAV.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link key={item.href} href={item.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-colors ${active ? 'text-[#c8a96e]' : 'text-zinc-400'}`}>
              <Icon d={item.d} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          )
        })}
        <button onClick={() => setDrawerOpen(true)}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl ${drawerOpen ? 'text-[#c8a96e]' : 'text-zinc-400'}`}>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
          <span className="text-[10px] font-medium">Plus</span>
        </button>
      </div>
    </nav>

    {/* DRAWER mobile */}
    {drawerOpen && (
      <div className="fixed inset-0 z-[60] md:hidden" onClick={() => setDrawerOpen(false)}>
        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl overflow-y-auto max-h-[80vh]"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          onClick={e => e.stopPropagation()}>
          <div className="w-10 h-1 bg-zinc-200 rounded-full mx-auto mt-3 mb-4" />
          <div className="px-4 pb-6 space-y-1">
            {[
              { href: '/fr/pipeline', label: 'Pipeline', d: ICONS.kanban },
              { href: '/fr/leads', label: 'Leads', d: ICONS.leads },
              { href: '/fr/cases', label: 'Candidats', d: ICONS.candidats },
              { href: '/fr/recontact', label: 'À recontacter', d: ICONS.clock },
              { href: '/fr/clients', label: 'Clients', d: ICONS.clients },
              { href: '/fr/alumni', label: 'Alumni', d: ICONS.alumni },
              { href: '/fr/jobs', label: 'Offres', d: ICONS.jobs },
              { href: '/fr/contacts', label: 'Contacts', d: ICONS.contacts },
              { href: '/fr/companies', label: 'Entreprises', d: ICONS.companies },
              { href: '/fr/finances', label: 'Finances', d: ICONS.finances },
              { href: '/fr/blog', label: 'Blog', d: ICONS.blog },
              { href: '/fr/settings', label: 'Paramètres', d: ICONS.settings },
            ].map(item => (
              <Link key={item.href} href={item.href} onClick={() => setDrawerOpen(false)}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors ${pathname === item.href || pathname.startsWith(item.href + '/') ? 'bg-[#c8a96e]/10 text-[#c8a96e]' : 'text-zinc-700 hover:bg-zinc-50'}`}>
                <Icon d={item.d} />
                <span>{item.label}</span>
              </Link>
            ))}
            <a href={WEBSITE_URL} target="_blank" rel="noopener noreferrer" onClick={() => setDrawerOpen(false)}
              className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-zinc-700 hover:bg-zinc-50">
              <Icon d={ICONS.website} />
              <span>Site web</span>
              <span className="text-zinc-300 text-xs ml-auto">↗</span>
            </a>
            <div className="mt-2 pt-2 border-t border-zinc-100">
              <button onClick={handleLogout}
                className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 w-full">
                <Icon d={ICONS.logout} />
                <span>Déconnexion</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
