import LangToggle from '@/components/portal/LangToggle'

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ margin: 0, fontFamily: 'Arial, sans-serif', background: '#fafaf9', minHeight: '100vh' }}>
      <header style={{ background: '#111110', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="https://djoqjgiyseobotsjqcgz.supabase.co/storage/v1/object/public/brand-assets/logos/logo_landscape_white.png" alt="Bali Interns" style={{ height: '26px' }} />
        <LangToggle />
      </header>
      <main style={{ maxWidth: '640px', margin: '0 auto', padding: '24px' }}>{children}</main>
    </div>
  )
}
