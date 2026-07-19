import getDb from '@/lib/db'
import { getUserFromCookies } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function GET() {
  const user = await getUserFromCookies()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const db = getDb()
  const result = await db.execute({
    sql: `SELECT l.id, l.name, l.created_at, l.group_id,
            (SELECT COUNT(*) FROM items i WHERE i.list_id = l.id) AS item_count,
            g.name AS group_name
     FROM lists l
     LEFT JOIN groups g ON g.id = l.group_id
      WHERE l.created_by = ?
         OR l.group_id IN (SELECT gm.group_id FROM group_members gm WHERE gm.user_id = ?)
         OR l.group_id IN (SELECT g.id FROM groups g WHERE g.created_by = ?)
     ORDER BY l.created_at DESC`,
    args: [user.userId, user.userId, user.userId],
  })
  return NextResponse.json(result.rows)
}

export async function POST(request: Request) {
  const user = await getUserFromCookies()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const db = getDb()
  const { name, group_id } = await request.json()
  const id = crypto.randomUUID()

  if (group_id) {
    const isMember = await db.execute({
      sql: 'SELECT id FROM group_members WHERE group_id = ? AND user_id = ?',
      args: [group_id, user.userId],
    })
    if (isMember.rows.length === 0 && group_id !== null) {
      const isOwner = await db.execute({
        sql: 'SELECT id FROM groups WHERE id = ? AND created_by = ?',
        args: [group_id, user.userId],
      })
      if (isOwner.rows.length === 0) {
        return NextResponse.json({ error: 'Você não é membro deste grupo.' }, { status: 403 })
      }
    }
  }

  await db.execute({
    sql: 'INSERT INTO lists (id, name, created_by, group_id) VALUES (?, ?, ?, ?)',
    args: [id, name, user.userId, group_id || null],
  })
  return NextResponse.json({ id, name }, { status: 201 })
}
