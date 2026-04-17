import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as {
    step_id: string
    step_title: string
    notes: string
    expected: string[]
    db_state?: Record<string, unknown>
  }

  const admin = createAdminClient()
  const { data, error } = await admin.from('qa_bugs').insert({
    step_id: body.step_id,
    step_title: body.step_title,
    notes: body.notes,
    expected: body.expected,
    db_state: body.db_state ?? null,
    status: 'open',
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notifier via Slack DM à Sidney (U0AT9DLV8P4)
  try {
    const slackToken = process.env.SLACK_BOT_TOKEN
    if (slackToken) {
      await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${slackToken}` },
        body: JSON.stringify({
          channel: 'U0AT9DLV8P4',
          text: `🐛 *Bug QA reporté — ${body.step_title}*\n\n> ${body.notes}\n\nÉcris *"bug"* dans le chat Claude pour que je corrige.\nBug ID: \`${data.id}\``,
        }),
      })
    }
  } catch { /* Slack non bloquant */ }

  return NextResponse.json({ id: data.id, status: 'open' })
}
