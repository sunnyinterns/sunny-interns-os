#!/usr/bin/env tsx
// Migration script: executes supabase/migrations/003_real_process.sql
// Usage: npx tsx src/scripts/migrate.ts

import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load env from .env.local
const envPath = resolve(process.cwd(), '.env.local')
try {
  const envContent = readFileSync(envPath, 'utf8')
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    const val = trimmed.slice(eqIdx + 1).trim()
    if (!process.env[key]) process.env[key] = val
  }
} catch {
  // .env.local not found, rely on existing env vars
}

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF ?? 'djoqjgiyseobotsjqcgz'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
const SQL_FILE = resolve(process.cwd(), 'supabase/migrations/003_real_process.sql')

async function executeSql(sql: string): Promise<void> {
  // Strategy 1: pg-meta API (Supabase hosted)
  const pgMetaUrl = `https://${PROJECT_REF}.supabase.co/pg-meta/v1/query`
  try {
    const res = await fetch(pgMetaUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    })
    if (res.ok) {
      console.log('✅ Migration executed via pg-meta API')
      return
    }
    const errText = await res.text()
    console.warn(`⚠ pg-meta failed (${res.status}): ${errText.slice(0, 200)}`)
  } catch (e) {
    console.warn('⚠ pg-meta unreachable:', e)
  }

  // Strategy 2: rpc/exec_sql (if function exists in DB)
  const rpcUrl = `https://${PROJECT_REF}.supabase.co/rest/v1/rpc/exec_sql`
  try {
    const res = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    })
    if (res.ok) {
      console.log('✅ Migration executed via rpc/exec_sql')
      return
    }
    console.warn(`⚠ rpc/exec_sql failed (${res.status})`)
  } catch (e) {
    console.warn('⚠ rpc/exec_sql unreachable:', e)
  }

  // Strategy 3: Supabase Management API (needs SUPABASE_ACCESS_TOKEN)
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN
  if (accessToken) {
    const mgmtUrl = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`
    try {
      const res = await fetch(mgmtUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: sql }),
      })
      if (res.ok) {
        console.log('✅ Migration executed via Management API')
        return
      }
      console.warn(`⚠ Management API failed (${res.status})`)
    } catch (e) {
      console.warn('⚠ Management API unreachable:', e)
    }
  }

  // Fallback: print SQL for manual execution
  console.error('\n❌ Could not execute migration automatically.')
  console.error('→ Please run this SQL manually in Supabase Studio:')
  console.error('  https://supabase.com/dashboard/project/djoqjgiyseobotsjqcgz/editor\n')
  console.error('─'.repeat(60))
  console.error(sql.slice(0, 1000) + (sql.length > 1000 ? '\n... (truncated)' : ''))
  console.error('─'.repeat(60))
  process.exit(1)
}

async function main() {
  console.log('🚀 Running migration 003_real_process.sql...')

  if (!SERVICE_ROLE_KEY) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY not set')
    process.exit(1)
  }

  const sql = readFileSync(SQL_FILE, 'utf8')
  console.log(`📄 Loaded SQL (${sql.length} chars)`)

  await executeSql(sql)
  console.log('✅ Migration 003 complete')
}

main().catch((e) => {
  console.error('❌ Fatal:', e)
  process.exit(1)
})
