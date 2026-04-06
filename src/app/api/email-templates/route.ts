import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const DEFAULT_TEMPLATES = [
  {
    id: 'default-welcome',
    name: 'Bienvenue stagiaire',
    category: 'onboarding',
    subject: 'Bienvenue chez Sunny Interns, {first_name} !',
    body_html: `<h1>Bienvenue {first_name} {last_name} !</h1>
<p>Nous sommes ravis de vous accueillir chez Sunny Interns.</p>
<p>Votre stage démarre le <strong>{arrival_date}</strong> pour une durée de <strong>{duration_weeks} semaines</strong>.</p>
<p>Votre poste : <strong>{job_title}</strong> chez <strong>{company_name}</strong>.</p>
<p>N'hésitez pas à nous contacter pour toute question.</p>
<p>À très bientôt,<br/>L'équipe Sunny Interns</p>`,
    version: 1,
    variables: ['first_name', 'last_name', 'arrival_date', 'duration_weeks', 'job_title', 'company_name'],
    updated_at: new Date().toISOString(),
  },
  {
    id: 'default-payment',
    name: 'Rappel paiement',
    category: 'billing',
    subject: 'Rappel : paiement de {payment_amount} en attente',
    body_html: `<h1>Rappel de paiement</h1>
<p>Bonjour {first_name},</p>
<p>Nous vous rappelons qu'un paiement de <strong>{payment_amount}</strong> est en attente pour votre stage.</p>
<p>Merci de régler via le lien suivant : <a href="{payment_link}">{payment_link}</a></p>
<p>Cordialement,<br/>L'équipe Sunny Interns</p>`,
    version: 1,
    variables: ['first_name', 'payment_amount', 'payment_link'],
    updated_at: new Date().toISOString(),
  },
  {
    id: 'default-arrival',
    name: "Confirmation arrivée",
    category: 'arrival',
    subject: 'Confirmation de votre arrivée le {arrival_date}',
    body_html: `<h1>Confirmation d'arrivée</h1>
<p>Bonjour {first_name},</p>
<p>Votre arrivée est confirmée pour le <strong>{arrival_date}</strong>.</p>
<p>Vol : <strong>{flight_number}</strong></p>
<p>Adresse de dépôt : <strong>{dropoff_address}</strong></p>
<p>Un chauffeur vous attendra à l'aéroport de Denpasar.</p>
<p>À très bientôt !<br/>L'équipe Sunny Interns</p>`,
    version: 1,
    variables: ['first_name', 'arrival_date', 'flight_number', 'dropoff_address'],
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
