import { createClient } from '@libsql/client'
import bcrypt from 'bcryptjs'
import { loadEnvLocal, resolveDbConfig } from '../src/lib/db-config.mjs'

loadEnvLocal()
const db = createClient(resolveDbConfig())

async function main() {
  console.log('Conectando ao banco...')
  await db.execute("SELECT 1")
  console.log('Conectado!')

  const users = [
    { username: 'Ariana', password: '12345678' },
    { username: 'Liliana', password: '12345678' },
    { username: 'LuisMarchio03', password: 'LuisMarchio03' },
  ]

  const userIds = {}

  for (const u of users) {
    console.log(`Criando usuário: ${u.username}...`)
    const existing = await db.execute({
      sql: 'SELECT id FROM users WHERE username = ?',
      args: [u.username],
    })

    if (existing.rows.length > 0) {
      userIds[u.username] = existing.rows[0].id
      console.log(`  Usuário ${u.username} já existe (id: ${userIds[u.username]})`)
      continue
    }

    const id = crypto.randomUUID()
    const hash = await bcrypt.hash(u.password, 10)

    await db.execute({
      sql: 'INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)',
      args: [id, u.username, hash],
    })

    userIds[u.username] = id
    console.log(`  Criado com id: ${id}`)
  }

  const ownerId = userIds['LuisMarchio03']
  if (!ownerId) {
    console.error('Usuário LuisMarchio03 não encontrado!')
    process.exit(1)
  }

  const groupName = 'Compartilhado (Casa)'
  console.log(`Criando grupo: ${groupName}...`)

  const existingGroup = await db.execute({
    sql: 'SELECT id FROM groups WHERE name = ? AND created_by = ?',
    args: [groupName, ownerId],
  })

  let groupId

  if (existingGroup.rows.length > 0) {
    groupId = existingGroup.rows[0].id
    console.log(`  Grupo já existe (id: ${groupId})`)
  } else {
    groupId = crypto.randomUUID()
    await db.execute({
      sql: 'INSERT INTO groups (id, name, created_by) VALUES (?, ?, ?)',
      args: [groupId, groupName, ownerId],
    })
    console.log(`  Criado com id: ${groupId}`)
  }

  for (const [username, uid] of Object.entries(userIds)) {
    if (username === 'LuisMarchio03') {
      // Owner is automatically not a member - they own the group
      continue
    }

    console.log(`Adicionando ${username} ao grupo...`)
    const existingMember = await db.execute({
      sql: 'SELECT id FROM group_members WHERE group_id = ? AND user_id = ?',
      args: [groupId, uid],
    })

    if (existingMember.rows.length > 0) {
      console.log(`  ${username} já é membro`)
      continue
    }

    const memberId = crypto.randomUUID()
    await db.execute({
      sql: 'INSERT INTO group_members (id, group_id, user_id) VALUES (?, ?, ?)',
      args: [memberId, groupId, uid],
    })
    console.log(`  ${username} adicionado!`)
  }

  console.log('\n✅ Seed completo!')
  console.log('\nUsuários criados:')
  for (const u of users) {
    console.log(`  - ${u.username} (senha: ${u.password})`)
  }
  console.log(`\nGrupo: ${groupName}`)
  console.log(`  Dono: LuisMarchio03`)
  console.log(`  Membros: Ariana, Liliana`)

  process.exit(0)
}

main().catch(err => {
  console.error('Erro:', err)
  process.exit(1)
})
