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

const db = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN })

const [users, groups, members, lists] = await Promise.all([
  db.execute('SELECT id, username FROM users ORDER BY username'),
  db.execute('SELECT g.id, g.name, u.username AS owner FROM groups g JOIN users u ON u.id = g.created_by'),
  db.execute('SELECT g.name AS group_name, u.username AS member FROM group_members gm JOIN groups g ON g.id = gm.group_id JOIN users u ON u.id = gm.user_id ORDER BY g.name, u.username'),
  db.execute("SELECT l.name, u.username AS owner, COALESCE(g.name, '(privada)') AS grupo FROM lists l LEFT JOIN users u ON u.id = l.created_by LEFT JOIN groups g ON g.id = l.group_id ORDER BY l.name"),
])

console.log('=== USUÁRIOS ===')
for (const u of users.rows) console.log(`  ${u.username} (${u.id})`)

console.log('\n=== GRUPOS ===')
for (const g of groups.rows) console.log(`  ${g.name} (dono: ${g.owner})`)

console.log('\n=== MEMBROS ===')
for (const m of members.rows) console.log(`  ${m.group_name} <- ${m.member}`)

console.log('\n=== LISTAS ===')
for (const l of lists.rows) console.log(`  ${l.name} (${l.owner}) [${l.grupo}]`)

process.exit(0)
