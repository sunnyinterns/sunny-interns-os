/**
 * update-email-templates.js
 * - Supprime rdv_confirmation (doublon)
 * - Corrige la marque "Sunny Interns" → "Bali Interns" partout
 * - Réécrit les 4 templates placeholder
 * - Connecte sponsor_contract_employer au bon format
 * - Renomme booking_confirmation clairement
 */
const { createClient } = require('@supabase/supabase-js')
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const LOGO = `<img src="https://images.squarespace-cdn.com/content/v1/6626071a2f10840f3786dba1/d44fa6d2-1445-45d0-8c64-9a1929cf406a/bali_interns_logo-landscape_white-nobackground.png?format=400w" alt="Bali Interns" style="height:28px;"/>`

const HEADER = `<div style="background:#1a1918;padding:24px 32px;">${LOGO}</div>`

const FOOTER = `<div style="background:#f4f3f1;padding:16px 32px;text-align:center;">
  <p style="font-size:12px;color:#9ca3af;margin:0;">Bali Interns — <a href="https://www.bali-interns.com" style="color:#c8a96e;text-decoration:none;">bali-interns.com</a> — <a href="mailto:team@bali-interns.com" style="color:#c8a96e;text-decoration:none;">team@bali-interns.com</a></p>
</div>`

function wrap(body) {
  return `<div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1918;">${HEADER}${body}${FOOTER}</div>`
}

function infoTable(rows) {
  const cells = rows.map(([label, value]) =>
    `<tr><td style="padding:6px 0;color:#6b7280;width:150px;font-size:14px;">${label}</td><td style="font-weight:600;font-size:14px;">${value}</td></tr>`
  ).join('')
  return `<div style="background:#f9f7f4;border-radius:12px;padding:24px;margin:24px 0;"><table style="width:100%;border-collapse:collapse;">${cells}</table></div>`
}

function cta(url, label) {
  return `<a href="${url}" style="display:inline-block;background:#c8a96e;color:#fff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:700;font-size:15px;margin:8px 0;">${label}</a>`
}

// ─── TEMPLATES ────────────────────────────────────────────────────────────────

const TEMPLATES = [

  // 1. booking_confirmation — rename + fix brand
  {
    slug: 'booking_confirmation',
    name: 'Interview booked — confirmation to intern',
    subject: 'Your Bali Interns interview is confirmed, {{first_name}} 📅',
    body_html: wrap(`
<div style="padding:40px 32px;">
  <h1 style="font-size:24px;font-weight:700;margin-bottom:8px;">Your interview is confirmed 📅</h1>
  <p style="color:#6b7280;font-size:16px;margin-bottom:24px;">Hi {{first_name}},</p>
  <p style="font-size:16px;line-height:1.6;">Great news — your qualification interview with the Bali Interns team is officially booked. This is the first real step toward your internship in Bali, and we're looking forward to speaking with you.</p>
  ${infoTable([
    ['📅 Date', '{{rdv_date}}'],
    ['🕐 Time', '{{rdv_time}}'],
    ['📍 Format', 'Google Meet (link below)'],
  ])}
  ${cta('{{meet_link}}', 'Join the interview →')}
  <p style="font-size:15px;font-weight:700;margin:28px 0 12px;">How to prepare:</p>
  <ul style="font-size:15px;line-height:1.9;padding-left:20px;color:#374151;">
    <li>Think about your desired sector, availability, and goals for Bali</li>
    <li>Have your CV handy if you have one ready</li>
    <li>Prepare any questions about the visa, housing, or the process</li>
    <li>No need to dress up — just show up with energy ☀️</li>
  </ul>
  <p style="font-size:15px;margin-top:24px;line-height:1.6;">The interview lasts about 30–45 minutes. We'll talk about your project, match you with the best opportunities, and answer all your questions.</p>
  <p style="font-size:15px;margin-top:20px;">Need to reschedule? No problem — use the link below or simply reply to this email.</p>
  ${cta('{{reschedule_link}}', 'Reschedule →')}
  <p style="margin-top:40px;color:#6b7280;font-size:14px;">See you soon,<br/><strong style="color:#1a1918;">{{manager_name}}, Bali Interns</strong></p>
</div>`)
  },

  // 2. alumni_welcome — full rewrite
  {
    slug: 'alumni_welcome',
    name: 'Alumni — end of internship',
    subject: 'Your Bali Interns adventure — thank you, {{first_name}} 🌴',
    body_html: wrap(`
<div style="padding:40px 32px;">
  <div style="text-align:center;margin-bottom:32px;">
    <div style="font-size:48px;margin-bottom:12px;">🌴</div>
    <h1 style="font-size:26px;font-weight:700;margin-bottom:6px;">What an adventure, {{first_name}}.</h1>
    <p style="font-size:16px;color:#6b7280;">Your internship at {{company_name}} is now complete.</p>
  </div>
  <p style="font-size:16px;line-height:1.6;">We hope this experience in Bali was everything you were looking for — and a little more. It's been a pleasure supporting you throughout this journey.</p>

  <div style="background:#f9f7f4;border-radius:12px;padding:24px;margin:28px 0;">
    <p style="font-weight:700;font-size:15px;margin:0 0 16px;">3 ways to stay connected 🤝</p>

    <p style="font-size:15px;font-weight:600;margin:0 0 4px;">⭐ Leave a review</p>
    <p style="font-size:14px;color:#6b7280;line-height:1.6;margin:0 0 16px;">Your honest feedback helps future interns make the right decision and helps us grow. It takes 2 minutes and means the world to us.</p>

    <p style="font-size:15px;font-weight:600;margin:0 0 4px;">📸 Share your story</p>
    <p style="font-size:14px;color:#6b7280;line-height:1.6;margin:0 0 16px;">Tag us on Instagram or TikTok, share a photo, a reel, a memory from Bali. Every piece of content helps us show the world what this is really like.</p>

    <p style="font-size:15px;font-weight:600;margin:0 0 4px;">🎯 Join the Ambassador programme</p>
    <p style="font-size:14px;color:#6b7280;line-height:1.6;margin:0;">You loved it — now share it. Recommend Bali Interns to friends from your school and earn a referral bonus for each intern who completes their placement. Ask us for your personal referral link.</p>
  </div>

  <p style="font-size:15px;line-height:1.6;">Whatever comes next — whether it's another adventure, a job, or back to classes — we wish you the very best. You'll always be part of the Bali Interns family.</p>
  <p style="font-size:15px;margin-top:12px;">Reply to this email anytime. We'd love to hear how things go. 🙏</p>
  <p style="margin-top:40px;color:#6b7280;font-size:14px;">With gratitude,<br/><strong style="color:#1a1918;">{{manager_name}} &amp; the Bali Interns Team</strong></p>
</div>`)
  },

  // 3. partner_welcome — full rewrite
  {
    slug: 'partner_welcome',
    name: 'Partner welcome — new company onboarded',
    subject: 'Welcome to the Bali Interns network, {{company_name}}!',
    body_html: wrap(`
<div style="padding:40px 32px;">
  <h1 style="font-size:24px;font-weight:700;margin-bottom:8px;">Welcome to Bali Interns 🤝</h1>
  <p style="color:#6b7280;font-size:16px;margin-bottom:24px;">Hi {{contact_name}},</p>
  <p style="font-size:16px;line-height:1.6;">We're excited to welcome <strong>{{company_name}}</strong> to the Bali Interns network. Your internship offer is now visible to our pool of pre-qualified candidates from French schools.</p>
  ${infoTable([
    ['Company', '{{company_name}}'],
    ['Position', '{{job_title}}'],
    ['Your contact', '{{manager_name}} — {{manager_email}}'],
  ])}
  <p style="font-size:15px;font-weight:700;margin:0 0 12px;">What happens next:</p>
  <ul style="font-size:15px;line-height:1.9;padding-left:20px;color:#374151;">
    <li>We match your offer with the most relevant candidate profiles</li>
    <li>You receive CVs directly via your partner portal</li>
    <li>You select your intern and we handle everything else — visa, housing, arrival</li>
    <li>We stay in touch throughout the internship period</li>
  </ul>
  <p style="font-size:15px;margin-top:24px;line-height:1.6;">Have a question or want to discuss a specific profile? Reply to this email or reach out to {{manager_name}} directly.</p>
  ${cta('{{employer_portal_url}}', 'Access your partner portal →')}
  <p style="margin-top:40px;color:#6b7280;font-size:14px;">Looking forward to working together,<br/><strong style="color:#1a1918;">{{manager_name}}, Bali Interns</strong></p>
</div>`)
  },

  // 4. ugc_thank_you — full rewrite
  {
    slug: 'ugc_thank_you',
    name: 'UGC — thank you for your testimonial',
    subject: 'Thank you for your testimonial, {{first_name}} 🙏',
    body_html: wrap(`
<div style="padding:40px 32px;">
  <h1 style="font-size:24px;font-weight:700;margin-bottom:8px;">Thank you, {{first_name}} 🙏</h1>
  <p style="color:#6b7280;font-size:16px;margin-bottom:24px;">Your testimonial has been received.</p>
  <p style="font-size:16px;line-height:1.6;">Your feedback is incredibly valuable — not just for us, but for every future intern trying to decide whether to take the leap. Your words help them imagine what's possible.</p>
  <p style="font-size:15px;line-height:1.6;margin-top:16px;">Your testimonial will be reviewed and published on our website and social media once validated. If you included photos or videos, we'll tag you when we post — let us know if you'd prefer otherwise.</p>
  <div style="background:#f9f7f4;border-radius:12px;padding:20px 24px;margin:28px 0;">
    <p style="font-weight:700;font-size:15px;margin:0 0 10px;">One more thing 👇</p>
    <p style="font-size:14px;line-height:1.6;color:#374151;margin:0;">If you haven't already, a short review on Google really helps us reach more students. It takes 60 seconds and makes a big difference for a small team like ours.</p>
  </div>
  <p style="font-size:15px;line-height:1.6;">Thank you again for being part of the Bali Interns story. Stay in touch — we love hearing from alumni. 🌴</p>
  <p style="margin-top:40px;color:#6b7280;font-size:14px;">With appreciation,<br/><strong style="color:#1a1918;">{{manager_name}}, Bali Interns</strong></p>
</div>`)
  },

  // 5. password_reset — full rewrite
  {
    slug: 'password_reset',
    name: 'Password reset',
    subject: 'Reset your Bali Interns password',
    body_html: wrap(`
<div style="padding:40px 32px;">
  <h1 style="font-size:24px;font-weight:700;margin-bottom:8px;">Reset your password 🔐</h1>
  <p style="color:#6b7280;font-size:16px;margin-bottom:24px;">Hi {{first_name}},</p>
  <p style="font-size:16px;line-height:1.6;">We received a request to reset the password for your Bali Interns account. Click the button below to choose a new password.</p>
  ${cta('{{reset_url}}', 'Reset my password →')}
  <p style="font-size:14px;color:#6b7280;margin-top:12px;">This link expires in <strong>24 hours</strong>.</p>
  <p style="font-size:14px;line-height:1.6;margin-top:24px;color:#374151;">If you didn't request a password reset, you can safely ignore this email. Your account is still secure.</p>
  <p style="font-size:13px;color:#9ca3af;margin-top:32px;">For security, never share this link with anyone. Bali Interns will never ask for your password.</p>
  <p style="margin-top:32px;color:#6b7280;font-size:14px;">The Bali Interns Team</p>
</div>`)
  },

  // 6. sponsor_contract_employer — fix brand (was fine but say "Sunny Interns" in name only)
  {
    slug: 'sponsor_contract_employer',
    name: 'Partnership Agreement to employer',
    subject: 'Partnership Agreement to sign — {{intern_name}} at {{company_name}}',
    body_html: wrap(`
<div style="padding:40px 32px;">
  <h1 style="font-size:22px;font-weight:700;margin-bottom:8px;">Partnership Agreement — action required</h1>
  <p style="font-size:16px;line-height:1.6;">Dear {{contact_name}},</p>
  <p style="font-size:16px;line-height:1.6;">The internship convention for <strong>{{intern_name}}</strong> has been signed. We now invite you to complete your company information and sign the <strong>Partnership Agreement</strong> for this placement.</p>
  ${infoTable([
    ['Intern', '{{intern_name}}'],
    ['Position', '{{job_title}}'],
    ['Start date', '{{start_date}}'],
    ['Duration', '{{duration}} months'],
    ['Visa Sponsor', '{{sponsor_name}}'],
  ])}
  <p style="font-size:14px;color:#6b7280;line-height:1.6;">This agreement is required for the visa process. It formalises the collaboration between the visa sponsor and your company for this specific intern. A new agreement will be required for each intern placement.</p>
  ${cta('{{employer_portal_url}}', 'Access partner portal →')}
  <p style="font-size:13px;color:#9ca3af;margin-top:12px;">Signing takes less than 2 minutes via your partner portal.</p>
  <p style="margin-top:32px;color:#6b7280;font-size:14px;">Thank you,<br/><strong style="color:#1a1918;">{{manager_name}}, Bali Interns</strong></p>
</div>`)
  },

]

async function main() {
  // 1. Delete rdv_confirmation (duplicate)
  const { error: delErr } = await s.from('email_templates').delete().eq('slug', 'rdv_confirmation')
  if (delErr) console.error('❌ Delete rdv_confirmation:', delErr.message)
  else console.log('🗑️  Deleted: rdv_confirmation (duplicate of booking_confirmation)')

  // 2. Update all templates
  for (const t of TEMPLATES) {
    const { data: existing } = await s.from('email_templates').select('id').eq('slug', t.slug).single()
    if (!existing) {
      console.log(`⚠️  Not found: ${t.slug}`)
      continue
    }
    const { error } = await s.from('email_templates')
      .update({ name: t.name, subject: t.subject, body_html: t.body_html })
      .eq('slug', t.slug)
    if (error) console.error(`❌ ${t.slug}:`, error.message)
    else console.log(`✅ Updated: ${t.slug} → "${t.name}"`)
  }

  console.log('\nDone.')
}

main().catch(console.error)
