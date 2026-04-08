import * as dotenv from 'dotenv'
import { resolve } from 'path'
import pg from 'pg'

dotenv.config({ path: resolve(__dirname, '../.env.local') })

const ref = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace('https://', '').replace('.supabase.co', '')
const dbPassword = process.env.SUPABASE_DB_PASSWORD || process.env.SUPABASE_SERVICE_ROLE_KEY!

async function main() {
  // Try transaction pooler
  const dbUrl = `postgresql://postgres.${ref}:${dbPassword}@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres`
  const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } })

  try {
    await client.connect()
    console.log('Connected!')

    const res = await client.query(`SELECT e.enumlabel FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid WHERE t.typname = 'activity_type' ORDER BY e.enumsortorder`)
    console.log('Enum values:', res.rows.map(r => r.enumlabel))

    // Check column type
    const colRes = await client.query(`SELECT data_type, udt_name FROM information_schema.columns WHERE table_name = 'activity_feed' AND column_name = 'type'`)
    console.log('Column info:', colRes.rows[0])
  } catch (e: unknown) {
    const err = e as Error
    console.error('Error:', err.message)

    // Fallback: try direct connection
    const directUrl = `postgresql://postgres:${dbPassword}@db.${ref}.supabase.co:5432/postgres`
    const client2 = new pg.Client({ connectionString: directUrl, ssl: { rejectUnauthorized: false } })
    try {
      await client2.connect()
      console.log('Connected via direct!')
      const res = await client2.query(`SELECT e.enumlabel FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid WHERE t.typname = 'activity_type' ORDER BY e.enumsortorder`)
      console.log('Enum values:', res.rows.map(r => r.enumlabel))
      await client2.end()
    } catch (e2: unknown) {
      console.error('Direct error:', (e2 as Error).message)
    }
  } finally {
    await client.end().catch(() => {})
  }
}

main()
