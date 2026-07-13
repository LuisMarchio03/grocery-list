import getDb from '@/lib/db'
import { getUserFromCookies } from '@/lib/auth'
import { NextResponse } from 'next/server'

async function canAccessList(listId: string, userId: string): Promise<boolean> {
  const db = getDb()
  const result = await db.execute({
    sql: `SELECT id FROM lists WHERE id = ? AND (
      created_by = ? OR
      group_id IN (SELECT group_id FROM group_members WHERE user_id = ?)
    )`,
    args: [listId, userId, userId],
  })
  return result.rows.length > 0
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const user = getUserFromCookies()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  if (!(await canAccessList(params.id, user.userId))) {
    return NextResponse.json({ error: 'Lista não encontrada.' }, { status: 404 })
  }

  const db = getDb()
  const result = await db.execute({
    sql: `SELECT id, list_id, name, quantity, is_checked, is_promotion,
                 CASE WHEN photo_base64 != '' THEN 1 ELSE 0 END AS has_photo,
                 created_at
          FROM items WHERE list_id = ? ORDER BY is_checked ASC, created_at ASC`,
    args: [params.id],
  })
  return NextResponse.json(result.rows)
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = getUserFromCookies()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  if (!(await canAccessList(params.id, user.userId))) {
    return NextResponse.json({ error: 'Lista não encontrada.' }, { status: 404 })
  }

  const db = getDb()
  const { name, quantity } = await request.json()
  const id = crypto.randomUUID()
  await db.execute({
    sql: 'INSERT INTO items (id, list_id, name, quantity) VALUES (?, ?, ?, ?)',
    args: [id, params.id, name, quantity || ''],
  })
  return NextResponse.json({ id, name, quantity: quantity || '' }, { status: 201 })
}
