import { createClient } from '@libsql/client'
import { loadEnvLocal, resolveDbConfig } from '../src/lib/db-config.mjs'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

loadEnvLocal()
const db = createClient(resolveDbConfig())

async function getColumns(table) {
  const result = await db.execute(`PRAGMA table_info(${table})`)
  return result.rows.map(r => r.name)
}

async function main() {
  // schema.sql é a fonte de verdade do schema e é idempotente (CREATE TABLE IF NOT EXISTS).
  // Sem isto, as tabelas lists/items nunca são criadas num banco novo.
  console.log('Aplicando schema.sql...')
  const schemaSql = readFileSync(resolve(__dirname, '..', 'schema.sql'), 'utf-8')
  await db.executeMultiple(schemaSql)

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
