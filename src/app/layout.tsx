import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Bali Interns',
  description: 'Your internship in Bali',
  icons: {
    icon: '/favicon.svg',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}
