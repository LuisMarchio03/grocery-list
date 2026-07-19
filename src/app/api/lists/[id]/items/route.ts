import getDb from '@/lib/db'
import { getUserFromCookies } from '@/lib/auth'
import { NextResponse } from 'next/server'

async function canAccessList(listId: string, userId: string): Promise<boolean> {
  const db = getDb()
  const result = await db.execute({
    sql: `SELECT id FROM lists WHERE id = ? AND (
      created_by = ? OR
      group_id IN (SELECT group_id FROM group_members WHERE user_id = ?) OR
      group_id IN (SELECT g.id FROM groups g WHERE g.created_by = ?)
    )`,
    args: [listId, userId, userId, userId],
  })
  return result.rows.length > 0
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromCookies()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { id } = await params

  if (!(await canAccessList(id, user.userId))) {
    return NextResponse.json({ error: 'Lista não encontrada.' }, { status: 404 })
  }

  const db = getDb()
  const result = await db.execute({
    sql: `SELECT id, list_id, name, quantity, is_checked, is_promotion,
                 CASE WHEN photo_base64 != '' THEN 1 ELSE 0 END AS has_photo,
                 created_at
          FROM items WHERE list_id = ? ORDER BY is_checked ASC, created_at ASC`,
    args: [id],
  })
  return NextResponse.json(result.rows)
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromCookies()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { id: listId } = await params

  if (!(await canAccessList(listId, user.userId))) {
    return NextResponse.json({ error: 'Lista não encontrada.' }, { status: 404 })
  }

  const db = getDb()
  const { name, quantity } = await request.json()
  const itemId = crypto.randomUUID()
  await db.execute({
    sql: 'INSERT INTO items (id, list_id, name, quantity) VALUES (?, ?, ?, ?)',
    args: [itemId, listId, name, quantity || ''],
  })
  return NextResponse.json({ id: itemId, name, quantity: quantity || '' }, { status: 201 })
}
