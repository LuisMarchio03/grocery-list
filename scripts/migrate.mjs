import { createClient } from '@libsql/client'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadEnv() {
  try {
    const envPath = resolve(__dirname, '..', '.env.local')
    const content = readFileSync(envPath, 'utf-8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx === -1) continue
      const key = trimmed.slice(0, eqIdx).trim()
      const value = trimmed.slice(eqIdx + 1).trim()
      process.env[key] = value
    }
  } catch {}
}

loadEnv()

const dbUrl = process.env.TURSO_DATABASE_URL
const dbToken = process.env.TURSO_AUTH_TOKEN

if (!dbUrl || !dbToken) {
  console.error('TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set')
  process.exit(1)
}

const db = createClient({ url: dbUrl, authToken: dbToken })

async function getColumns(table) {
  const result = await db.execute(`PRAGMA table_info(${table})`)
  return result.rows.map(r => r.name)
}

async function main() {
  console.log('Aplicando migration...')

  // Create new tables
  const newTables = [
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_by TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS group_members (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(group_id, user_id)
    )`,
  ]

  for (const sql of newTables) {
    console.log(`  ${sql.split('\n')[0].trim()}...`)
    await db.execute(sql)
  }

  // Alter lists to add new columns (SQLite doesn't support IF NOT EXISTS for ALTER)
  const listsCols = await getColumns('lists')
  if (!listsCols.includes('created_by')) {
    console.log('  ALTER TABLE lists ADD COLUMN created_by TEXT REFERENCES users(id)...')
    await db.execute("ALTER TABLE lists ADD COLUMN created_by TEXT REFERENCES users(id)")
  }
  if (!listsCols.includes('group_id')) {
    console.log('  ALTER TABLE lists ADD COLUMN group_id TEXT REFERENCES groups(id) ON DELETE SET NULL...')
    await db.execute("ALTER TABLE lists ADD COLUMN group_id TEXT REFERENCES groups(id) ON DELETE SET NULL")
  }

  console.log('Migration concluída!')
  process.exit(0)
}

main().catch(err => {
  console.error('Erro:', err)
  process.exit(1)
})
