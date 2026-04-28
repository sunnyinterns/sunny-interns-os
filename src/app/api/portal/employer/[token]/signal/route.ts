
import { createClient as svc } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

function getAdmin() {
  return svc(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// POST — employer signals a problem: no_show | cannot_reach
// body: { sub_id: string; signal: "no_show" | "cannot_reach"; note?: string }
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const body = await req.json() as { sub_id: string; signal: "no_show" | "cannot_reach"; note?: string }
  const admin = getAdmin()

  // Verify token
  const { data: access } = await admin
    .from("employer_portal_access")
    .select("company_id, case_id")
    .eq("token", token).single()
  if (!access) return NextResponse.json({ error: "Invalid token" }, { status: 403 })

  const { data: sub } = await admin
    .from("job_submissions")
    .select("id, case_id, jobs!job_submissions_job_id_fkey(title, public_title)")
    .eq("id", body.sub_id).single()
  if (!sub) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Store signal in employer_comment + flag for Charly
  const signalLabel = body.signal === "no_show" ? "⚠️ No-show" : "⚠️ Cannot reach candidate"
  const note = body.note ? ` — ${body.note}` : ""
  await admin.from("job_submissions").update({
    employer_comment: `${signalLabel}${note}`,
    updated_at: new Date().toISOString(),
  }).eq("id", body.sub_id)

  // Notify Charly via admin_notification
  const job = sub.jobs as unknown as Record<string, unknown>
  const jobTitle = (job?.public_title ?? job?.title ?? "this position") as string
  await admin.from("admin_notifications").insert({
    type: "urgent",
    title: `${signalLabel} — ${jobTitle}`,
    message: `Employer reported ${body.signal} for case ${sub.case_id}. Immediate follow-up required.`,
    case_id: sub.case_id as string,
    read: false,
    created_at: new Date().toISOString(),
  }).then(() => null, () => null)

  await admin.from("activity_feed").insert({
    case_id: sub.case_id as string,
    type: "employer_signal",
    title: signalLabel,
    description: `Employer reported via portal${note}`,
    source: "employer_portal",
    status: "pending_action",
  }).then(() => null, () => null)

  // Also email Charly
  const { Resend } = await import("resend")
  const resend = new Resend(process.env.RESEND_API_KEY)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://sunny-interns-os.vercel.app"
  await resend.emails.send({
    from: "Bali Interns OS <team@bali-interns.com>",
    to: "team@bali-interns.com",
    subject: `🚨 ${signalLabel} — Action required`,
    html: `<p>An employer has reported: <strong>${signalLabel}</strong>${note}</p><p>Case: ${sub.case_id}</p><p><a href="${appUrl}/fr/cases/${sub.case_id}">View case →</a></p>`,
  }).catch(() => null)

  return NextResponse.json({ success: true })
}
