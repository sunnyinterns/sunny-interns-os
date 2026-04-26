import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY!;
const ALLOWED = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
const MAX_SIZE = 10 * 1024 * 1024;


const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "https://bali-interns-website.vercel.app",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

function sb() { return createClient(SUPABASE_URL, SERVICE_KEY); }

type Extracted = {
  first_name?: string; last_name?: string; email?: string;
  phone?: string; school?: string; degree?: string;
  graduation_year?: string; languages?: string[];
  english_level?: string; desired_fields?: string[];
  skills?: string[]; linkedin_url?: string;
};

export async function POST(req: NextRequest) {
  try {
    if (!SERVICE_KEY) return NextResponse.json({ error: "Storage not configured" }, { status: 500 });
    if (!ANTHROPIC_KEY) return NextResponse.json({ error: "AI not configured" }, { status: 500 });

    const fd = await req.formData();
    const file = fd.get("cv");
    if (!file || !(file instanceof File)) return NextResponse.json({ error: "No file" }, { status: 400 });
    if (!ALLOWED.includes(file.type)) return NextResponse.json({ error: "PDF or DOCX only" }, { status: 400 });
    if (file.size > MAX_SIZE) return NextResponse.json({ error: "Max 10MB" }, { status: 400 });

    const db = sb();
    const ts = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const storagePath = `cv-drops/${ts}_${safeName}`;
    const buf = Buffer.from(await file.arrayBuffer());

    // 1. Upload to Supabase Storage (OS bucket)
    const { error: upErr } = await db.storage.from("intern-cvs").upload(storagePath, buf, { contentType: file.type, upsert: false });
    if (upErr) return NextResponse.json({ error: `Upload: ${upErr.message}` }, { status: 500 });

    const { data: { publicUrl } } = db.storage.from("intern-cvs").getPublicUrl(storagePath);

    // 2. OCR via Claude
    const b64 = buf.toString("base64");
    const mediaType = file.type === "application/pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    
    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: "claude-opus-4-5-20251101",
        max_tokens: 1024,
        messages: [{
          role: "user",
          content: [
            { type: "document", source: { type: "base64", media_type: mediaType, data: b64 } },
            { type: "text", text: `Extract from this CV and return ONLY valid JSON (no markdown):
{
  "first_name": "", "last_name": "", "email": "", "phone": "",
  "school": "", "degree": "", "graduation_year": "",
  "english_level": "beginner|intermediate|advanced|fluent|native",
  "languages": [], "desired_fields": [], "skills": [], "linkedin_url": ""
}
If a field is not found, use null. desired_fields: marketing/communication/business/design/event/other.` }
          ]
        }]
      })
    });

    let extracted: Extracted = {};
    if (aiRes.ok) {
      const aiData = await aiRes.json() as { content?: Array<{ text?: string }> };
      const raw = aiData.content?.[0]?.text?.replace(/```json|```/g, "").trim() ?? "{}";
      try { extracted = JSON.parse(raw) as Extracted; } catch { /* keep empty */ }
    }

    // 3. Create or find lead in OS
    let leadId: string | null = null;
    if (extracted.email) {
      const { data: existing } = await db.from("leads").select("id").eq("email", extracted.email.toLowerCase().trim()).single();
      if (existing) {
        leadId = existing.id as string;
        // Update lead with CV URL
        await db.from("leads").update({ cv_url: publicUrl, updated_at: new Date().toISOString() }).eq("id", leadId);
      } else {
        const { data: newLead } = await db.from("leads").insert({
          email: extracted.email.toLowerCase().trim(),
          first_name: extracted.first_name ?? null,
          last_name: extracted.last_name ?? null,
          phone: extracted.phone ?? null,
          school: extracted.school ?? null,
          source: "cv_drop_website",
          status: "new",
          cv_url: publicUrl,
          created_at: new Date().toISOString(),
        }).select("id").single();
        leadId = newLead?.id as string ?? null;
      }
    }

    // 4. Record in cv_drops table for tracking
    await db.from("cv_drops").insert({
      email: extracted.email ?? null,
      first_name: extracted.first_name ?? null,
      last_name: extracted.last_name ?? null,
      phone: extracted.phone ?? null,
      school: extracted.school ?? null,
      cv_url: publicUrl,
      source: "website_hero",
      status: "extracted",
      lead_id: leadId ?? null,
    }).then(() => null).catch(() => null); // non-blocking

    return NextResponse.json({ extracted, lead_id: leadId, cv_url: publicUrl }, { headers: CORS_HEADERS });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500, headers: CORS_HEADERS });
  }
}
