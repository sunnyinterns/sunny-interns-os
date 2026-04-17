import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Ce endpoint proxy billing_companies (géré dans settings/finance/billing-companies)
// pour la compatibilité avec BillingForm qui attend le schéma billing_entities
export async function GET() {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('billing_companies')
    .select('id, name, bank_iban, bank_name, legal_form, currency, stripe_link, is_default, is_active, billing_rule')
    .order('is_default', { ascending: false })
  // Map billing_companies → format attendu par BillingForm (iban = bank_iban)
  const mapped = (data ?? []).map(bc => ({
    id: bc.id,
    name: bc.name,
    iban: bc.bank_iban,
    bank_name: bc.bank_name,
    legal_form: bc.legal_form,
    currency: bc.currency,
    stripe_link: bc.stripe_link,
    is_default: bc.is_default,
    is_active: bc.is_active,
    billing_rule: bc.billing_rule,
  }))
  return NextResponse.json(mapped)
}
