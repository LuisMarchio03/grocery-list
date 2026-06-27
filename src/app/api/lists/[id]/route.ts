import getDb from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const db = getDb()
  const result = await db.execute({
    sql: 'SELECT * FROM lists WHERE id = ?',
    args: [params.id],
  })
  if (result.rows.length === 0) {
    return NextResponse.json({ error: 'List not found' }, { status: 404 })
  }
  return NextResponse.json(result.rows[0])
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const db = getDb()
  const { name } = await request.json()
  await db.execute({
    sql: 'UPDATE lists SET name = ? WHERE id = ?',
    args: [name, params.id],
  })
  return NextResponse.json({ success: true })
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const db = getDb()
  await db.execute({
    sql: 'DELETE FROM lists WHERE id = ?',
    args: [params.id],
  })
  return NextResponse.json({ success: true })
}
