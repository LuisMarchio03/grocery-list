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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromCookies()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { id } = await params

  if (!(await canAccessItem(id, user.userId))) {
    return NextResponse.json({ error: 'Item não encontrado.' }, { status: 404 })
  }

  const db = getDb()
  const result = await db.execute({
    sql: 'SELECT photo_base64 FROM items WHERE id = ?',
    args: [id],
  })
  if (result.rows.length === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return NextResponse.json(result.rows[0])
}
