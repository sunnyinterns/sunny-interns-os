import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const DEFAULT_TEMPLATES = [
  // ── INTERN LEAD & BOOKING ──────────────────────────────────
  {
    id: 'default-welcome-lead',
    name: 'Welcome — New Application',
    category: 'intern_lead',
    subject: 'Welcome to Bali Interns, {{first_name}}!',
    body_html: `<h2>Welcome, {{first_name}}!</h2>
<p>Thank you for applying to Bali Interns. We are thrilled to receive your application!</p>
<p>Your profile is being reviewed by our team. The next step is to book your qualification interview — it's a 45-minute call with Charly to learn more about your project and ambitions.</p>
<p><strong>👉 <a href="{{booking_link}}">Book your interview here</a></strong></p>
<p>If you have any questions, feel free to reach us on WhatsApp: <a href="https://wa.me/33643487736">+33 6 43 48 77 36</a></p>
<p>See you soon!<br/>Charly — Bali Interns</p>`,
    version: 1,
    variables: ['first_name', 'booking_link'],
    updated_at: new Date().toISOString(),
  },
  {
    id: 'default-booking-confirmation',
    name: 'Interview Confirmed',
    category: 'intern_lead',
    subject: 'Your interview is confirmed, {{first_name}} 📅',
    body_html: `<h2>Your interview is confirmed!</h2>
<p>Hi {{first_name}},</p>
<p>Great news — your qualification interview with Bali Interns is confirmed for <strong>{{interview_date}}</strong> at <strong>{{interview_time}}</strong> (Bali time / WITA).</p>
<p><strong>📹 Google Meet link:</strong> <a href="{{meet_link}}">{{meet_link}}</a></p>
<h3>How to prepare:</h3>
<ul>
  <li>Have your CV ready to share on screen</li>
  <li>Think about your ideal internship (sector, company type, duration)</li>
  <li>Prepare a few questions about life in Bali</li>
</ul>
<p>See you soon!<br/>Charly — Bali Interns</p>`,
    version: 1,
    variables: ['first_name', 'interview_date', 'interview_time', 'meet_link'],
    updated_at: new Date().toISOString(),
  },
  {
    id: 'default-noshow',
    name: 'No-show — Reschedule',
    category: 'intern_lead',
    subject: 'We missed you today, {{first_name}} — rebook your interview',
    body_html: `<h2>We missed you today, {{first_name}}</h2>
<p>It looks like you weren't able to join our interview today. No worries — life happens!</p>
<p>Given your desired start date of <strong>{{desired_start_date}}</strong>, we encourage you to rebook as soon as possible so we can find the best match for you.</p>
<p><strong>👉 <a href="{{booking_link}}">Rebook your interview</a></strong></p>
<p>If you have any issues, reach us on WhatsApp: <a href="https://wa.me/33643487736">+33 6 43 48 77 36</a></p>
<p>Looking forward to speaking with you,<br/>Charly — Bali Interns</p>`,
    version: 1,
    variables: ['first_name', 'desired_start_date', 'booking_link'],
    updated_at: new Date().toISOString(),
  },
  // ── INTERN QUALIFICATION & PORTAL ─────────────────────────
  {
    id: 'default-portal-access',
    name: 'Portal Access — Welcome',
    category: 'intern_qualification',
    subject: '🌴 Your Bali Interns space is ready, {{first_name}}!',
    body_html: `<h2>Your Bali Interns portal is ready!</h2>
<p>Hi {{first_name}},</p>
<p>Following your qualification interview, we are happy to confirm that your profile is validated. Here is how to access your personal space:</p>
<p><strong>🔗 Portal link:</strong> <a href="{{portal_url}}">{{portal_url}}</a><br/>
<strong>🔑 Temporary password:</strong> <code>{{temp_password}}</code></p>
<h3>Your first actions:</h3>
<ol>
  <li>Upload your English CV (PDF)</li>
  <li>Complete your profile (passport, school info)</li>
  <li>Review the internship opportunities we propose</li>
</ol>
<p>Our team will be in touch as soon as we have matching opportunities for you!</p>
<p>Charly — Bali Interns</p>`,
    version: 1,
    variables: ['first_name', 'portal_url', 'temp_password'],
    updated_at: new Date().toISOString(),
  },
  {
    id: 'default-cv-feedback',
    name: 'CV Feedback — Update Needed',
    category: 'intern_qualification',
    subject: 'Action needed: please update your CV, {{first_name}}',
    body_html: `<h2>Your CV needs an update, {{first_name}}</h2>
<p>Our team has reviewed your CV and has some feedback to help you stand out to employers in Bali:</p>
<blockquote style="border-left: 3px solid #c8a96e; padding-left: 12px; color: #555;">
  {{cv_feedback}}
</blockquote>
<p>Please upload your updated CV directly on your portal:</p>
<p><strong>👉 <a href="{{portal_url}}">Access your portal</a></strong></p>
<p>The sooner you update it, the faster we can submit your profile to employers!</p>
<p>Charly — Bali Interns</p>`,
    version: 1,
    variables: ['first_name', 'cv_feedback', 'portal_url'],
    updated_at: new Date().toISOString(),
  },
  // ── INTERN JOBS & MATCHING ─────────────────────────────────
  {
    id: 'default-job-opportunity',
    name: 'New Job Opportunity',
    category: 'intern_jobs',
    subject: 'New internship opportunity for you, {{first_name}} 💼',
    body_html: `<h2>We found an opportunity for you!</h2>
<p>Hi {{first_name}},</p>
<p>Great news — we have a new internship opportunity that matches your profile:</p>
<ul>
  <li><strong>Company:</strong> {{company_name}}</li>
  <li><strong>Role:</strong> {{job_title}}</li>
  <li><strong>Location:</strong> {{city}}, Bali</li>
  <li><strong>Duration:</strong> {{duration}} months</li>
</ul>
<p>Log in to your portal to see the full details and let us know if you're interested:</p>
<p><strong>👉 <a href="{{portal_url}}">View the opportunity</a></strong></p>
<p>Please respond within 48 hours so we can move forward!</p>
<p>Charly — Bali Interns</p>`,
    version: 1,
    variables: ['first_name', 'company_name', 'job_title', 'city', 'duration', 'portal_url'],
    updated_at: new Date().toISOString(),
  },
  // ── INTERN CONVENTION & CLIENT ─────────────────────────────
  {
    id: 'default-convention-signed',
    name: 'Convention Signed — Welcome Client',
    category: 'intern_convention',
    subject: '🎉 Congratulations {{first_name}} — your internship is confirmed!',
    body_html: `<h2>Your internship is officially confirmed!</h2>
<p>Hi {{first_name}},</p>
<p>Congratulations! Your internship convention has been signed. Here is a summary:</p>
<ul>
  <li><strong>Company:</strong> {{company_name}}</li>
  <li><strong>Role:</strong> {{job_title}}</li>
  <li><strong>Start date:</strong> {{start_date}}</li>
  <li><strong>End date:</strong> {{end_date}}</li>
</ul>
<h3>Next steps:</h3>
<ol>
  <li>Payment of your Bali Interns package</li>
  <li>Visa document collection</li>
  <li>Pre-departure briefing</li>
</ol>
<p>Welcome to the Bali Interns family! 🌴</p>
<p>Charly — Bali Interns</p>`,
    version: 1,
    variables: ['first_name', 'company_name', 'job_title', 'start_date', 'end_date'],
    updated_at: new Date().toISOString(),
  },
  // ── INTERN PAYMENT ─────────────────────────────────────────
  {
    id: 'default-payment-request',
    name: 'Payment Request — Invoice',
    category: 'intern_payment',
    subject: 'Invoice ready — {{payment_amount}} EUR, {{first_name}}',
    body_html: `<h2>Your invoice is ready</h2>
<p>Hi {{first_name}},</p>
<p>Please find your Bali Interns invoice for the amount of <strong>{{payment_amount}} EUR</strong>.</p>
<p><strong>Payment deadline:</strong> {{payment_deadline}}</p>
<p>You can pay by bank transfer using the following details:</p>
<ul>
  <li><strong>IBAN:</strong> {{iban}}</li>
  <li><strong>BIC:</strong> {{bic}}</li>
  <li><strong>Reference:</strong> {{first_name}} {{last_name}} — Bali Interns</li>
</ul>
<p>Once payment is received, we will proceed with your visa application.</p>
<p>Charly — Bali Interns</p>`,
    version: 1,
    variables: ['first_name', 'last_name', 'payment_amount', 'payment_deadline', 'iban', 'bic'],
    updated_at: new Date().toISOString(),
  },
  {
    id: 'default-payment-reminder',
    name: 'Payment Reminder',
    category: 'intern_payment',
    subject: 'Reminder: payment pending for your Bali internship, {{first_name}}',
    body_html: `<h2>Payment reminder</h2>
<p>Hi {{first_name}},</p>
<p>This is a friendly reminder that your payment of <strong>{{payment_amount}} EUR</strong> is still pending.</p>
<p>To avoid delays in your visa application — which can take up to 4 weeks — please make your payment as soon as possible.</p>
<p><strong>Payment deadline:</strong> {{payment_deadline}}</p>
<p>If you have any questions, don't hesitate to reach out.</p>
<p>Charly — Bali Interns</p>`,
    version: 1,
    variables: ['first_name', 'payment_amount', 'payment_deadline'],
    updated_at: new Date().toISOString(),
  },
  {
    id: 'default-payment-confirmed',
    name: 'Payment Confirmed',
    category: 'intern_payment',
    subject: 'Payment received ✅ — next steps for your visa, {{first_name}}',
    body_html: `<h2>Payment received — thank you!</h2>
<p>Hi {{first_name}},</p>
<p>We have received your payment of <strong>{{payment_amount}} EUR</strong>. Thank you!</p>
<h3>What happens next:</h3>
<ol>
  <li><strong>Visa documents</strong> — you'll receive a checklist to upload on your portal</li>
  <li><strong>Visa processing</strong> — our agent Agent Visa will handle your visa application (3-4 weeks)</li>
  <li><strong>Pre-departure</strong> — we'll send you all the info you need before flying to Bali</li>
</ol>
<p>Keep an eye on your portal and email — we'll be in touch soon!</p>
<p>Charly — Bali Interns</p>`,
    version: 1,
    variables: ['first_name', 'payment_amount'],
    updated_at: new Date().toISOString(),
  },
  // ── INTERN VISA ────────────────────────────────────────────
  {
    id: 'default-visa-docs-request',
    name: 'Visa Documents Request',
    category: 'intern_visa',
    subject: 'Action needed: upload your visa documents, {{first_name}}',
    body_html: `<h2>Please upload your visa documents</h2>
<p>Hi {{first_name}},</p>
<p>It's time to collect your visa documents! Please upload the following on your portal as soon as possible:</p>
<ul>
  <li>✅ Passport (main page + page 4)</li>
  <li>✅ ID photo (white background, recent)</li>
  <li>✅ Bank statement (last 3 months)</li>
  <li>✅ Return flight ticket</li>
</ul>
<p><strong>👉 <a href="{{portal_url}}">Upload documents on your portal</a></strong></p>
<p>Processing time: 3-4 weeks after all documents are received.</p>
<p>Charly — Bali Interns</p>`,
    version: 1,
    variables: ['first_name', 'portal_url'],
    updated_at: new Date().toISOString(),
  },
  {
    id: 'default-visa-received',
    name: 'Visa Received — Congratulations',
    category: 'intern_visa',
    subject: '🎉 Your visa has arrived, {{first_name}}!',
    body_html: `<h2>Your visa is here!</h2>
<p>Hi {{first_name}},</p>
<p>Excellent news — your Indonesian internship visa has been received and is attached to this email.</p>
<p>You're almost ready to go! Here's what comes next:</p>
<ol>
  <li>Download the <strong>All Indonesia</strong> app on your phone</li>
  <li>Confirm your flight details on your portal</li>
  <li>Wait for your pre-departure briefing from Charly</li>
</ol>
<p>Bali is waiting for you! 🌴🏄</p>
<p>Charly — Bali Interns</p>`,
    version: 1,
    variables: ['first_name'],
    updated_at: new Date().toISOString(),
  },
  // ── INTERN PRE-DEPARTURE ───────────────────────────────────
  {
    id: 'default-j3-departure',
    name: 'J-3 Pre-departure — Indonesia App',
    category: 'intern_departure',
    subject: 'Your departure is in 3 days — important steps! ✈️',
    body_html: `<h2>Your adventure starts in 3 days!</h2>
<p>Hi {{first_name}},</p>
<p>You're flying to Bali on <strong>{{departure_date}}</strong> — here are the important things to do before you leave:</p>
<h3>🇮🇩 Indonesia App (mandatory)</h3>
<p>Download the <strong>All Indonesia</strong> app and complete your customs declaration before landing:</p>
<ul>
  <li>iOS: <a href="https://apps.apple.com/app/all-indonesia/id1234567890">App Store</a></li>
  <li>Android: <a href="https://play.google.com/store/apps/details?id=allindonesia">Google Play</a></li>
</ul>
<h3>🚗 Your airport transfer</h3>
<p>Your driver from <strong>{{driver_company}}</strong> will meet you at arrivals with a sign showing your name.</p>
<p>Flight: <strong>{{flight_number}}</strong> arriving at <strong>{{arrival_time}}</strong> (local time)</p>
<h3>📞 Emergency contacts</h3>
<ul>
  <li>Charly (Bali Interns): <a href="https://wa.me/33643487736">WhatsApp</a></li>
  <li>Your accommodation: {{accommodation_contact}}</li>
</ul>
<p>Have an amazing trip! 🌴</p>
<p>Charly — Bali Interns</p>`,
    version: 1,
    variables: ['first_name', 'departure_date', 'flight_number', 'arrival_time', 'driver_company', 'accommodation_contact'],
    updated_at: new Date().toISOString(),
  },
  // ── INTERN DURING & AFTER ──────────────────────────────────
  {
    id: 'default-review-request',
    name: 'Review Request — End of Internship',
    category: 'intern_internship',
    subject: 'How was your internship experience, {{first_name}}? 🌴',
    body_html: `<h2>How was your Bali experience?</h2>
<p>Hi {{first_name}},</p>
<p>Your internship at <strong>{{company_name}}</strong> is coming to an end — we hope it was an incredible experience!</p>
<p>It would mean a lot to us if you could leave a quick review:</p>
<ul>
  <li>⭐ <a href="{{google_review_link}}">Google Review (2 min)</a></li>
  <li>💼 <a href="{{linkedin_review_link}}">LinkedIn Recommendation</a></li>
</ul>
<p>We'd also love to feature your story! If you'd like to share a short video testimonial (30-60 sec), send it to us on WhatsApp.</p>
<p>Thank you for being part of the Bali Interns family. We hope to see you back soon! 🌴</p>
<p>Charly — Bali Interns</p>`,
    version: 1,
    variables: ['first_name', 'company_name', 'google_review_link', 'linkedin_review_link'],
    updated_at: new Date().toISOString(),
  },
  // ── EMPLOYER ──────────────────────────────────────────────
  {
    id: 'default-employer-cv-submission',
    name: 'CV Submission — Employer',
    category: 'employer',
    subject: 'Internship application — {{intern_name}} for {{job_title}}',
    body_html: `<h2>New internship application</h2>
<p>Dear {{employer_name}},</p>
<p>Please find below the profile of <strong>{{intern_name}}</strong>, a candidate from <strong>{{school_name}}</strong> who is interested in the <strong>{{job_title}}</strong> position at your company.</p>
<ul>
  <li><strong>Availability:</strong> from {{start_date}} for {{duration}} months</li>
  <li><strong>Key skills:</strong> {{skills}}</li>
  <li><strong>Languages:</strong> {{languages}}</li>
</ul>
<p>📎 CV attached to this email.</p>
<p>To share your feedback, simply reply to this email or access our employer portal:</p>
<p><strong>👉 <a href="{{employer_portal_url}}">View full profile & respond</a></strong></p>
<p>Thank you,<br/>Charly — Bali Interns<br/>team@bali-interns.com</p>`,
    version: 1,
    variables: ['employer_name', 'intern_name', 'job_title', 'school_name', 'start_date', 'duration', 'skills', 'languages', 'employer_portal_url'],
    updated_at: new Date().toISOString(),
  },
  {
    id: 'default-employer-review-request',
    name: 'Review Request — Employer',
    category: 'employer',
    subject: 'Quick feedback on {{intern_name}}\'s internship',
    body_html: `<h2>How was {{intern_name}}'s internship?</h2>
<p>Dear {{employer_name}},</p>
<p>{{intern_name}}'s internship at your company is coming to an end. We would greatly appreciate your feedback:</p>
<ol>
  <li>How would you rate {{intern_name}}'s overall performance? (1-5)</li>
  <li>Would you recommend Bali Interns to other companies?</li>
  <li>Would you like to host another intern from us?</li>
</ol>
<p>Simply reply to this email — it takes less than 2 minutes!</p>
<p>Thank you for your partnership,<br/>Charly — Bali Interns</p>`,
    version: 1,
    variables: ['employer_name', 'intern_name'],
    updated_at: new Date().toISOString(),
  },
  {
    id: 'default-sponsor-contract',
    name: 'Sponsor Contract — Employer',
    category: 'employer',
    subject: 'Sponsor contract to sign — {{intern_name}}',
    body_html: `<h2>Sponsor contract — {{intern_name}}</h2>
<p>Dear {{employer_name}},</p>
<p>Please find attached the sponsor contract for <strong>{{intern_name}}</strong>'s internship at your company.</p>
<p>This document is required by Indonesian immigration for the visa application. Please sign and return it at your earliest convenience.</p>
<p><strong>Internship details:</strong></p>
<ul>
  <li>Start date: {{start_date}}</li>
  <li>End date: {{end_date}}</li>
  <li>Role: {{job_title}}</li>
</ul>
<p>Thank you,<br/>Charly — Bali Interns</p>`,
    version: 1,
    variables: ['employer_name', 'intern_name', 'start_date', 'end_date', 'job_title'],
    updated_at: new Date().toISOString(),
  },
  // ── VISA AGENT ────────────────────────────────────────────
  {
    id: 'default-agent-visa-submission',
    name: 'Visa Dossier — Agent',
    category: 'agent',
    subject: 'Visa dossier — {{intern_name}} — internship from {{start_date}}',
    body_html: `<h2>New visa dossier — {{intern_name}}</h2>
<p>Dear agent,</p>
<p>Please find attached all documents required for the internship visa application of:</p>
<ul>
  <li><strong>Name:</strong> {{intern_name}}</li>
  <li><strong>Nationality:</strong> {{nationality}}</li>
  <li><strong>Passport number:</strong> {{passport_number}}</li>
  <li><strong>Passport expiry:</strong> {{passport_expiry}}</li>
  <li><strong>Internship start:</strong> {{start_date}}</li>
  <li><strong>Internship end:</strong> {{end_date}}</li>
  <li><strong>Company:</strong> {{company_name}}</li>
  <li><strong>Sponsor PT:</strong> {{sponsor_name}}</li>
</ul>
<p>Documents attached: passport, ID photo, bank statement, return flight ticket, sponsor contract.</p>
<p>Please confirm receipt and expected processing time.</p>
<p>Thank you,<br/>Charly — Bali Interns<br/>team@bali-interns.com</p>`,
    version: 1,
    variables: ['intern_name', 'nationality', 'passport_number', 'passport_expiry', 'start_date', 'end_date', 'company_name', 'sponsor_name'],
    updated_at: new Date().toISOString(),
  },
  // ── INTERNAL ──────────────────────────────────────────────
  {
    id: 'default-internal-new-application',
    name: 'New Application Alert — Internal',
    category: 'internal',
    subject: '🔔 New application: {{first_name}} {{last_name}} — {{main_desired_job}}',
    body_html: `<h2>New application received</h2>
<p><strong>{{first_name}} {{last_name}}</strong> just submitted an application.</p>
<ul>
  <li><strong>Email:</strong> {{email}}</li>
  <li><strong>WhatsApp:</strong> {{whatsapp}}</li>
  <li><strong>Desired job:</strong> {{main_desired_job}}</li>
  <li><strong>Available from:</strong> {{desired_start_date}} for {{desired_duration_months}} months</li>
  <li><strong>School:</strong> {{school_name}} ({{school_country}})</li>
  <li><strong>Source:</strong> {{touchpoint}}</li>
</ul>
<p><a href="{{case_url}}">View application in Bali Interns OS →</a></p>`,
    version: 1,
    variables: ['first_name', 'last_name', 'email', 'whatsapp', 'main_desired_job', 'desired_start_date', 'desired_duration_months', 'school_name', 'school_country', 'touchpoint', 'case_url'],
    updated_at: new Date().toISOString(),
  },
]

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .order('updated_at', { ascending: false })
    if (error) throw error
    if (!data || data.length === 0) return NextResponse.json(DEFAULT_TEMPLATES)
    return NextResponse.json(data)
  } catch {
    return NextResponse.json(DEFAULT_TEMPLATES, { status: 200 })
  }
}
