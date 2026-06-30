import getDb from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const db = getDb()
  const result = await db.execute({
    sql: `SELECT id, list_id, name, quantity, is_checked, is_promotion,
                 CASE WHEN photo_base64 IS NOT NULL AND photo_base64 != '' THEN 1 ELSE 0 END AS has_photo,
                 created_at
          FROM items WHERE list_id = ?
          ORDER BY is_checked ASC, created_at ASC`,
    args: [params.id],
  })
  return NextResponse.json(result.rows)
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const db = getDb()
  const { name, quantity } = await request.json()
  const itemId = crypto.randomUUID()
  await db.execute({
    sql: 'INSERT INTO items (id, list_id, name, quantity) VALUES (?, ?, ?, ?)',
    args: [itemId, params.id, name, quantity || ''],
  })
  return NextResponse.json({ id: itemId, name, quantity }, { status: 201 })
}
