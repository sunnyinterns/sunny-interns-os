/**
 * migrate-all.ts — Execute all pending Supabase migrations
 * Usage: npx tsx src/scripts/migrate-all.ts
 */
import * as fs from 'fs'
import * as path from 'path'
import * as https from 'https'
import * as http from 'http'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌  NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local')
  process.exit(1)
}

const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations')

async function execSQL(sql: string): Promise<{ error?: string }> {
  const url = new URL('/rest/v1/rpc/exec_sql', SUPABASE_URL)
  const body = JSON.stringify({ sql })
  const lib = url.protocol === 'https:' ? https : http

  return new Promise((resolve) => {
    const req = lib.request(
      {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          apikey: SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          Prefer: 'return=minimal',
        },
      },
      (res) => {
        let data = ''
        res.on('data', (chunk: Buffer) => { data += chunk.toString() })
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve({})
          } else {
            resolve({ error: `HTTP ${res.statusCode}: ${data}` })
          }
        })
      }
    )
    req.on('error', (e: Error) => resolve({ error: e.message }))
    req.write(body)
    req.end()
  })
}

async function execSQLDirect(sql: string): Promise<{ error?: string }> {
  // Try via pg-meta API (Supabase hosted)
  const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]
  if (!projectRef) return { error: 'Cannot extract project ref from URL' }

  const url = `https://${projectRef}.supabase.co/pg/query`
  const body = JSON.stringify({ query: sql })
  const lib = https

  return new Promise((resolve) => {
    const urlObj = new URL(url)
    const req = lib.request(
      {
        hostname: urlObj.hostname,
        path: urlObj.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          apikey: SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        },
      },
      (res) => {
        let data = ''
        res.on('data', (chunk: Buffer) => { data += chunk.toString() })
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve({})
          } else {
            resolve({ error: `HTTP ${res.statusCode}: ${data}` })
          }
        })
      }
    )
    req.on('error', (e: Error) => resolve({ error: e.message }))
    req.write(body)
    req.end()
  })
}

async function runMigration(filePath: string): Promise<void> {
  const filename = path.basename(filePath)
  console.log(`\n📄  Running migration: ${filename}`)

  const sql = fs.readFileSync(filePath, 'utf-8')

  // Try exec_sql RPC first
  let result = await execSQL(sql)
  if (!result.error) {
    console.log(`   ✅  ${filename} — OK via RPC`)
    return
  }

  console.log(`   ⚠️   RPC failed: ${result.error}`)

  // Try pg-meta direct query
  result = await execSQLDirect(sql)
  if (!result.error) {
    console.log(`   ✅  ${filename} — OK via pg-meta`)
    return
  }

  console.log(`   ⚠️   pg-meta failed: ${result.error}`)
  console.log(`   📋  SQL to run manually in Supabase SQL Editor:`)
  console.log('   ' + '-'.repeat(60))
  // Print first 500 chars as preview
  console.log('   ' + sql.slice(0, 500) + (sql.length > 500 ? '...' : ''))
  console.log('   ' + '-'.repeat(60))
}

async function main() {
  console.log('🚀  Sunny Interns OS — Migration Runner')
  console.log(`   Supabase: ${SUPABASE_URL}`)
  console.log(`   Migrations dir: ${migrationsDir}`)

  if (!fs.existsSync(migrationsDir)) {
    console.error('❌  Migrations directory not found:', migrationsDir)
    process.exit(1)
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => path.join(migrationsDir, f))

  if (files.length === 0) {
    console.log('ℹ️   No migration files found.')
    return
  }

  console.log(`\n📦  Found ${files.length} migration file(s):`)
  files.forEach((f) => console.log(`    - ${path.basename(f)}`))

  for (const file of files) {
    await runMigration(file)
  }

  console.log('\n✨  Migration run complete.')
  console.log('   If any migration failed, run the SQL manually in Supabase SQL Editor.')
  console.log('   URL: https://supabase.com/dashboard/project/djoqjgiyseobotsjqcgz/sql/new')
}

void main()
