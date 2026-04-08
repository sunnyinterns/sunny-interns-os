import webpush from 'web-push'
import { createClient } from '@/lib/supabase/server'

function initWebPush() {
  const pub = process.env.VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  const email = process.env.VAPID_EMAIL ?? 'team@bali-interns.com'
  if (!pub || !priv) return false
  webpush.setVapidDetails(`mailto:${email}`, pub, priv)
  return true
}

interface PushPayload {
  title: string
  body: string
  url?: string
}

export async function sendPushToUser(email: string, payload: PushPayload): Promise<void> {
  if (!initWebPush()) return
  try {
    const supabase = await createClient()
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth_key')
      .eq('user_email', email)
    if (!subs || subs.length === 0) return
    const message = JSON.stringify(payload)
    await Promise.allSettled(
      subs.map((sub) =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
          message
        )
      )
    )
  } catch {
    // Push failures are non-critical
  }
}

export async function sendPushToAll(payload: PushPayload): Promise<void> {
  if (!initWebPush()) return
  try {
    const supabase = await createClient()
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth_key')
    if (!subs || subs.length === 0) return
    const message = JSON.stringify(payload)
    await Promise.allSettled(
      subs.map((sub) =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
          message
        )
      )
    )
  } catch {
    // Push failures are non-critical
  }
}
