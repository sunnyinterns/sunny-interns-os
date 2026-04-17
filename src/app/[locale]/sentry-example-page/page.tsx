'use client'
import * as Sentry from '@sentry/nextjs'

export default function SentryPage() {
  return (
    <div style={{padding:'40px',fontFamily:'sans-serif'}}>
      <h1>Sentry test</h1>
      <button onClick={() => { throw new Error('Sentry test error - Bali Interns OS') }}>
        Trigger test error
      </button>
      <button style={{marginLeft:'16px'}} onClick={() => Sentry.captureMessage('Sentry test message OK')}>
        Send test message
      </button>
    </div>
  )
}
