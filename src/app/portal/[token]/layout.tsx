import LangToggle from '@/components/portal/LangToggle'

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body style={{ margin: 0, fontFamily: 'Arial, sans-serif', background: '#fafaf9' }}>
        <header style={{ background: '#111110', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-white.svg" alt="Bali Interns" style={{ height: '28px' }} />
          <LangToggle />
        </header>
        <main style={{ maxWidth: '640px', margin: '0 auto', padding: '24px' }}>{children}</main>
      </body>
    </html>
  )
}
