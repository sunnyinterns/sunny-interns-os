
import { createClient as svc } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

function getAdmin() {
  return svc(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// POST — Charly envoie l'email d'annulation à 1 employeur manuellement
// body: { sub_id: string, send_email: boolean }
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: caseId } = await params
  const body = await req.json() as { sub_id: string; send_email?: boolean }
  const admin = getAdmin()

  const { data: sub } = await admin
    .from("job_submissions")
    .select(`
      id, status,
      cases!job_submissions_case_id_fkey(
        interns(first_name, last_name)
      ),
      jobs!job_submissions_job_id_fkey(
        public_title, title,
        contacts!jobs_contact_id_fkey(first_name, email, companies!contacts_company_id_fkey(name))
      )
    `)
    .eq("id", body.sub_id)
    .eq("case_id", caseId)
    .single()

  if (!sub) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Mark as cancelled
  await admin.from("job_submissions").update({
    status: "cancelled",
    updated_at: new Date().toISOString(),
  }).eq("id", body.sub_id)

  // Remove from pending_cancellations flag
  const { data: caseRow } = await admin.from("cases").select("alert_sent_flags").eq("id", caseId).single()
  const flags = (caseRow?.alert_sent_flags ?? {}) as Record<string, unknown>
  const pending = (flags.pending_cancellations as Array<{sub_id: string}> ?? [])
    .filter((p) => p.sub_id !== body.sub_id)
  flags.pending_cancellations = pending
  if (pending.length === 0) delete flags.pending_cancellations
  await admin.from("cases").update({ alert_sent_flags: flags }).eq("id", caseId)

  // Send cancellation email if requested
  if (body.send_email) {
    const job = sub.jobs as unknown as Record<string, unknown>
    const contact = job?.contacts as Record<string, unknown> | null
    const contactEmail = contact?.email as string | null
    const intern = (sub.cases as unknown as Record<string, unknown>)?.interns as Record<string, unknown> | null

    if (contactEmail) {
      const { data: tmpl } = await admin
        .from("email_templates").select("subject, body_html")
        .eq("slug", "candidature_cancelled_employer").eq("is_active", true).single()

      if (tmpl) {
        let subject = tmpl.subject as string
        let html = tmpl.body_html as string
        const vars: Record<string, string> = {
          employer_first_name: (contact?.first_name as string) ?? "there",
          intern_first_name: (intern?.first_name as string) ?? "",
          job_title: (job?.public_title as string) ?? (job?.title as string) ?? "",
        }
        for (const [k, v] of Object.entries(vars)) {
          const re = new RegExp(`{{${k}}}`, "g")
          subject = subject.replace(re, v)
          html = html.replace(re, v)
        }
        const { Resend } = await import("resend")
        const resend = new Resend(process.env.RESEND_API_KEY)
        await resend.emails.send({
          from: "Bali Interns <team@bali-interns.com>",
          to: contactEmail,
          subject,
          html,
        })
      }
    }
  }

  await admin.from("activity_feed").insert({
    case_id: caseId, type: "job_cancelled", source: "manual",
    title: "Submission cancelled",
    description: `Employer notified: ${body.send_email ? "email sent" : "no email"}`,
    status: "completed",
  }).then(() => null, () => null)

  return NextResponse.json({ success: true })
}
