import getDb from '@/lib/db'
import { getUserFromCookies } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function POST(
  request: Request,
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

  const { username } = await request.json()
  if (!username?.trim()) {
    return NextResponse.json({ error: 'Nome de usuário é obrigatório.' }, { status: 400 })
  }

  const userResult = await db.execute({
    sql: 'SELECT id, username FROM users WHERE username = ?',
    args: [username.trim()],
  })
  if (userResult.rows.length === 0) {
    return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 })
  }

  const targetUser = userResult.rows[0] as unknown as { id: string; username: string }
  if (targetUser.id === user.userId) {
    return NextResponse.json({ error: 'Você já é o dono do grupo.' }, { status: 400 })
  }

  const existing = await db.execute({
    sql: 'SELECT id FROM group_members WHERE group_id = ? AND user_id = ?',
    args: [id, targetUser.id],
  })
  if (existing.rows.length > 0) {
    return NextResponse.json({ error: 'Usuário já é membro do grupo.' }, { status: 409 })
  }

  const memberId = crypto.randomUUID()
  await db.execute({
    sql: 'INSERT INTO group_members (id, group_id, user_id) VALUES (?, ?, ?)',
    args: [memberId, id, targetUser.id],
  })
  return NextResponse.json({ id: memberId, user_id: targetUser.id, username: targetUser.username }, { status: 201 })
}

export async function DELETE(
  request: Request,
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

  const { memberId } = await request.json()
  if (!memberId) {
    return NextResponse.json({ error: 'ID do membro é obrigatório.' }, { status: 400 })
  }

  await db.execute({
    sql: 'DELETE FROM group_members WHERE id = ? AND group_id = ?',
    args: [memberId, id],
  })
  return NextResponse.json({ success: true })
}
