import { Suspense } from 'react'

function CancelledContent() {
  return (
    <div style={{ minHeight: '100vh', background: '#fafaf7', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ background: '#111110', padding: '8px 16px', borderRadius: 8, display: 'inline-block', marginBottom: 24 }}>
          <img src="https://djoqjgiyseobotsjqcgz.supabase.co/storage/v1/object/public/brand-assets/logos/logo_landscape_white.png" alt="Bali Interns" style={{ height: 24 }} />
        </div>
        <p style={{ fontSize: 32, margin: '0 0 12px' }}>✅</p>
        <h1 style={{ fontSize: 20, fontWeight: 500, color: '#1a1918', margin: '0 0 8px' }}>RDV annulé</h1>
        <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 24px' }}>
          Votre entretien a bien été annulé. Pour reprendre votre candidature, vous pouvez prendre un nouveau rendez-vous.
        </p>
        <a href="/book" style={{ display: 'inline-block', background: '#c8a96e', color: 'white', padding: '12px 24px', borderRadius: 10, textDecoration: 'none', fontWeight: 500, fontSize: 14 }}>
          Reprendre un RDV
        </a>
        <p style={{ marginTop: 16, fontSize: 12, color: '#9ca3af' }}>
          Questions ? <a href="mailto:team@bali-interns.com" style={{ color: '#c8a96e' }}>team@bali-interns.com</a>
        </p>
      </div>
    </div>
  )
}

export default function CancelledPage() {
  return <Suspense><CancelledContent /></Suspense>
}
