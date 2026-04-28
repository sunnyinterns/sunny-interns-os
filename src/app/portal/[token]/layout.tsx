export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ margin: 0, fontFamily: "'Outfit', system-ui, sans-serif", background: '#FFFBF0', minHeight: '100vh' }}>
      {/* Google Fonts — Outfit + Playfair Display */}
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=Playfair+Display:wght@400;600;700&display=swap');`}</style>
      <header style={{ background: '#1A1A1A', padding: '14px 24px', display: 'flex', alignItems: 'center' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://djoqjgiyseobotsjqcgz.supabase.co/storage/v1/object/public/brand-assets/logos/logo_landscape_white.png"
          alt="Bali Interns"
          style={{ height: '28px', width: 'auto' }}
        />
      </header>
      <main style={{ maxWidth: '640px', margin: '0 auto', padding: '24px' }}>{children}</main>
    </div>
  )
}
