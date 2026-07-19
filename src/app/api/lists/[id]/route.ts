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
    sql: 'SELECT * FROM lists WHERE id = ?',
    args: [id],
  })
  if (result.rows.length === 0) {
    return NextResponse.json({ error: 'List not found' }, { status: 404 })
  }
  return NextResponse.json(result.rows[0])
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromCookies()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { id } = await params

  if (!(await canAccessList(id, user.userId))) {
    return NextResponse.json({ error: 'Lista não encontrada.' }, { status: 404 })
  }

  const db = getDb()
  const { name, group_id } = await request.json()

  if (group_id !== undefined) {
    if (group_id) {
      const isMember = await db.execute({
        sql: 'SELECT id FROM group_members WHERE group_id = ? AND user_id = ?',
        args: [group_id, user.userId],
      })
      if (isMember.rows.length === 0) {
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
      sql: 'UPDATE lists SET name = ?, group_id = ? WHERE id = ?',
      args: [name, group_id || null, id],
    })
  } else {
    await db.execute({
      sql: 'UPDATE lists SET name = ? WHERE id = ?',
      args: [name, id],
    })
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(
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
  await db.execute({
    sql: 'DELETE FROM lists WHERE id = ?',
    args: [id],
  })
  return NextResponse.json({ success: true })
}
