import getDb from '@/lib/db'
import { getUserFromCookies } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function GET() {
  const user = getUserFromCookies()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const db = getDb()
  const result = await db.execute({
    sql: `SELECT g.id, g.name, g.created_by, g.created_at,
            (SELECT COUNT(*) FROM group_members gm WHERE gm.group_id = g.id) AS member_count
     FROM groups g
     WHERE g.created_by = ?
        OR g.id IN (SELECT gm.group_id FROM group_members gm WHERE gm.user_id = ?)
     ORDER BY g.created_at DESC`,
    args: [user.userId, user.userId],
  })
  return NextResponse.json(result.rows)
}

export async function POST(request: Request) {
  const user = getUserFromCookies()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { name } = await request.json()
  if (!name?.trim()) {
    return NextResponse.json({ error: 'Nome do grupo é obrigatório.' }, { status: 400 })
  }

  const db = getDb()
  const id = crypto.randomUUID()
  await db.execute({
    sql: 'INSERT INTO groups (id, name, created_by) VALUES (?, ?, ?)',
    args: [id, name.trim(), user.userId],
  })
  return NextResponse.json({ id, name: name.trim() }, { status: 201 })
}
