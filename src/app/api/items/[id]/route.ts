import getDb from '@/lib/db'
import { getUserFromCookies } from '@/lib/auth'
import { NextResponse } from 'next/server'

async function canAccessItem(itemId: string, userId: string): Promise<boolean> {
  const db = getDb()
  const result = await db.execute({
    sql: `SELECT i.id FROM items i
     JOIN lists l ON l.id = i.list_id
     WHERE i.id = ? AND (
       l.created_by = ? OR
       l.group_id IN (SELECT group_id FROM group_members WHERE user_id = ?)
     )`,
    args: [itemId, userId, userId],
  })
  return result.rows.length > 0
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = getUserFromCookies()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  if (!(await canAccessItem(params.id, user.userId))) {
    return NextResponse.json({ error: 'Item não encontrado.' }, { status: 404 })
  }

  const db = getDb()
  const body = await request.json()
  const allowed = ['name', 'quantity', 'is_checked', 'is_promotion', 'photo_base64']

  for (const key of allowed) {
    if (key in body) {
      await db.execute({
        sql: `UPDATE items SET ${key} = ? WHERE id = ?`,
        args: [body[key], params.id],
      })
    }
  }
  return NextResponse.json({ success: true })
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const user = getUserFromCookies()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  if (!(await canAccessItem(params.id, user.userId))) {
    return NextResponse.json({ error: 'Item não encontrado.' }, { status: 404 })
  }

  const db = getDb()
  await db.execute({
    sql: 'DELETE FROM items WHERE id = ?',
    args: [params.id],
  })
  return NextResponse.json({ success: true })
}
