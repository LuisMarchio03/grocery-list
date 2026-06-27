import getDb from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  const db = getDb()
  const result = await db.execute('SELECT * FROM lists ORDER BY created_at DESC')
  return NextResponse.json(result.rows)
}

export async function POST(request: Request) {
  const db = getDb()
  const { name } = await request.json()
  const id = crypto.randomUUID()
  await db.execute({
    sql: 'INSERT INTO lists (id, name) VALUES (?, ?)',
    args: [id, name],
  })
  return NextResponse.json({ id, name }, { status: 201 })
}
