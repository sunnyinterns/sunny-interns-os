import { redirect } from 'next/navigation'
import { CalendarAutoSync } from '@/components/layout/CalendarAutoSync'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/AppShell'
import { PushNotifications } from '@/components/layout/PushNotifications'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/fr/login')
  }

  return (
    <AppShell>
      <PushNotifications />
      <CalendarAutoSync />
      {children}
    </AppShell>
  )
}
