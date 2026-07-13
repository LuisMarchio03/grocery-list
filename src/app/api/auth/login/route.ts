import { NextResponse } from 'next/server'
import getDb from '@/lib/db'
import { comparePassword, signToken } from '@/lib/auth'

export async function POST(request: Request) {
  const { username, password } = await request.json()

  if (!username?.trim() || !password?.trim()) {
    return NextResponse.json({ error: 'Usuário e senha são obrigatórios.' }, { status: 400 })
  }

  const db = getDb()

  const result = await db.execute({
    sql: 'SELECT * FROM users WHERE username = ?',
    args: [username.trim()],
  })

  if (result.rows.length === 0) {
    return NextResponse.json({ error: 'Usuário ou senha inválidos.' }, { status: 401 })
  }

  const user = result.rows[0]
  const valid = await comparePassword(password, user.password_hash as string)

  if (!valid) {
    return NextResponse.json({ error: 'Usuário ou senha inválidos.' }, { status: 401 })
  }

  const token = signToken({ userId: user.id as string, username: user.username as string })

  const response = NextResponse.json({ id: user.id, username: user.username })
  response.cookies.set('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })

  return response
}
