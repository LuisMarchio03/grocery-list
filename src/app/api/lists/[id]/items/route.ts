import getDb from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const db = getDb()
  const result = await db.execute({
    sql: 'SELECT * FROM items WHERE list_id = ? ORDER BY is_checked ASC, created_at ASC',
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

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const db = getDb()
  await db.execute({
    sql: 'DELETE FROM items WHERE list_id = ? AND is_checked = 1',
    args: [params.id],
  })
  return NextResponse.json({ success: true })
}
