import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const body = await request.json() as {
    to: string
    templateId?: string
    subject?: string
    html?: string
    variables?: Record<string, string>
  }

  // TODO: Replace with Resend when RESEND_API_KEY is configured
  console.log('[EMAIL SEND]', {
    to: body.to,
    subject: body.subject,
    templateId: body.templateId,
    variables: body.variables,
  })

  return NextResponse.json({ success: true, provider: 'console' })
}
