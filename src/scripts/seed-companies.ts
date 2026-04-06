import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const DESTINATION_ID = 'fc9ece85-e5d5-41d2-9142-79054244bbce'

const companies = [
  'Studio Kozak',
  'PT Lab Kreatif Dan Strategix',
  'Baam Box',
  'Kintsugi',
  'MPI Hospitalite',
  'Natural Love SA',
  'Earth Moon Magic',
  'Punky Production',
  'Young Film Makers',
  'Singa Kelompok Internasional',
  'SAS Konket Publicite',
  'CG Company International',
  'PT Divine Design Agency',
  'Moka Consulting',
  'Scar Reef Resort',
  'dlncdt llc',
  'Studio 3D Motion',
  'Fluidz',
  'Balifornia',
  'Kelapa Creative',
  'Juwuk Manis Studio',
  'Seminyak Digital',
  'Canggu Creative Hub',
  'Bali Tech Academy',
  'Indo Marketing Pro',
  'Bali Content Studio',
  'Sunrise Agency',
  'Pacific Rim Digital',
  'Island Creative Lab',
  'Denpasar Studios',
]

async function seed() {
  console.log(`Seeding ${companies.length} companies...`)

  const rows = companies.map((name) => ({
    name,
    destination_id: DESTINATION_ID,
    country: 'Indonesia',
    is_active: true,
  }))

  const { data, error } = await supabase
    .from('companies')
    .insert(rows)
    .select()

  if (error) {
    console.error('Error:', error.message)
    process.exit(1)
  }

  console.log(`✓ Inserted/updated ${data?.length ?? 0} companies`)
  process.exit(0)
}

seed()
