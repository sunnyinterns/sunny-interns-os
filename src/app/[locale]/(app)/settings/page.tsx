'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'

type SectionItem = { href: string; icon: string; label: string; desc: string }

const SECTIONS: Record<string, { title: string; items: SectionItem[] }> = {
  brand: {
    title: 'Brand & Identity',
    items: [
      { href: 'media-kit', icon: '🎨', label: 'Media Kit', desc: 'Logos, favicon and brand assets' },
      { href: 'general', icon: '🔧', label: 'General Settings', desc: 'WhatsApp, email, Fillout ID' },
    ],
  },
  staffing: {
    title: 'Staffing Database',
    items: [
      { href: 'job-departments', icon: '💼', label: 'Job Departments', desc: 'Activity sectors and available roles' },
      { href: 'internship-cities', icon: '📍', label: 'Internship Cities', desc: 'Canggu, Seminyak, Ubud...' },
      { href: 'company-types', icon: '🏛️', label: 'Company Types', desc: 'PT, CV and other legal structures' },
    ],
  },
  visa: {
    title: 'Fournisseurs Visa',
    items: [
      { href: 'packages', icon: '📦', label: 'Packages', desc: 'Standard, Express, Visa Only — tarifs & marges' },
      { href: 'visa-types', icon: '🛂', label: 'Types de visa', desc: 'VOA, KITAS, Social Budaya...' },
      { href: 'visa-agents', icon: '🏢', label: 'Agents visa', desc: 'Agents partenaires et leurs tarifs' },
      { href: 'sponsors', icon: '🏛️', label: 'Sponsors PT', desc: 'PT garantes pour les visas stagiaires' },
    ],
  },
  automations: {
    title: 'Automations',
    items: [
      { href: 'automations', icon: '⚡', label: 'Automations', desc: 'Enable/disable automatic emails and notifications by stage' },
      { href: 'email-templates', icon: '✉️', label: 'Email Templates', desc: 'Automated emails by stage and recipient' },
      { href: 'templates/contracts', icon: '📄', label: 'Contract Templates', desc: "Liability Agreement, Partnership Agreement (3 variants) + Mission Letter" },
    ],
  },
  partners: {
    title: 'Partners & Logistics',
    items: [
      { href: 'housing', icon: '🏠', label: 'Housing', desc: 'Villas, flatshares and residences in Bali' },
      { href: 'scooters', icon: '🛵', label: 'Scooters', desc: 'Partner scooter rentals' },
      { href: 'transport', icon: '🚗', label: 'Drivers', desc: 'Driver companies with pre-formatted WA message' },
      { href: 'partners', icon: '🌐', label: 'Official Partners', desc: 'eSIM, restaurants, pre/post-stay deals' },
      { href: 'schools', icon: '🎓', label: 'Schools', desc: 'Partner schools and contacts' },
    ],
  },
  finances: {
    title: 'Finances',
    items: [
      { href: 'finances', icon: '💰', label: 'Finance Settings', desc: 'Payout config, taux de change, payout fondateurs' },
      { href: 'billing-companies', icon: '🧾', label: 'Sociétés facturantes', desc: 'SIDLYS LLC, Bali Interns — règles par nationalité, Stripe, IBAN' },
      { href: 'drivers', icon: '🚗', label: 'Factures Chauffeurs', desc: 'Notas de transfert aéroport · Liées aux dossiers clients' },
    ],
  },
  team: {
    title: 'Team & Access',
    items: [
      { href: 'users', icon: '👤', label: 'Users', desc: 'Team access and role management' },
    ],
  },
}

function SettingsSection({ title, items, locale }: { title: string; items: SectionItem[]; locale: string }) {
  return (
    <div>
      <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.map(item => (
          <Link
            key={item.href}
            href={`/${locale}/settings/${item.href}`}
            className="bg-white border border-zinc-100 rounded-2xl p-4 hover:border-[#c8a96e] hover:shadow-sm transition-all group flex items-center gap-3"
          >
            <span className="text-2xl flex-shrink-0">{item.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[#1a1918] group-hover:text-[#c8a96e] transition-colors">{item.label}</p>
              <p className="text-xs text-zinc-400 mt-0.5">{item.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'fr'

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#1a1918]">Settings</h1>
        <p className="text-sm text-zinc-500 mt-1">Bali Interns OS platform configuration</p>
      </div>
      {Object.entries(SECTIONS).map(([key, section]) => (
        <SettingsSection key={key} title={section.title} items={section.items} locale={locale} />
      ))}
    </div>
  )
}
