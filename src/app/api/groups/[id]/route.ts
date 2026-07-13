import getDb from '@/lib/db'
import { getUserFromCookies } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const user = await getUserFromCookies()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const db = getDb()
  const group = await db.execute({
    sql: 'SELECT * FROM groups WHERE id = ? AND created_by = ?',
    args: [id, user.userId],
  })
  if (group.rows.length === 0) {
    return NextResponse.json({ error: 'Grupo não encontrado.' }, { status: 404 })
  }

  await db.execute({
    sql: 'DELETE FROM groups WHERE id = ?',
    args: [id],
  })
  return NextResponse.json({ success: true })
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const user = await getUserFromCookies()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const db = getDb()

  const groupResult = await db.execute({
    sql: `SELECT g.*,
            (SELECT COUNT(*) FROM group_members gm WHERE gm.group_id = g.id) AS member_count
     FROM groups g WHERE g.id = ?`,
    args: [id],
  })
  if (groupResult.rows.length === 0) {
    return NextResponse.json({ error: 'Grupo não encontrado.' }, { status: 404 })
  }

  const membersResult = await db.execute({
    sql: `SELECT u.id, u.username
     FROM group_members gm
     JOIN users u ON u.id = gm.user_id
     WHERE gm.group_id = ?
     ORDER BY u.username`,
    args: [id],
  })

  const group = groupResult.rows[0] as Record<string, unknown>
  return NextResponse.json({
    ...group,
    members: membersResult.rows,
  })
}
