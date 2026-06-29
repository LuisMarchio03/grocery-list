import getDb from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  const db = getDb()
  const result = await db.execute(`
    SELECT
      l.id,
      l.name,
      l.created_at,
      COUNT(i.id) AS total,
      COALESCE(SUM(i.is_checked), 0) AS checked
    FROM lists l
    LEFT JOIN items i ON i.list_id = l.id
    GROUP BY l.id, l.name, l.created_at
    ORDER BY l.created_at DESC
  `)
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
