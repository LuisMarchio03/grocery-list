import getDb from '@/lib/db'
import { NextResponse } from 'next/server'

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const db = getDb()
  const body = await request.json()
  const fields: string[] = []
  const args: (string | number)[] = []

  if (body.name !== undefined) {
    fields.push('name = ?')
    args.push(body.name)
  }
  if (body.quantity !== undefined) {
    fields.push('quantity = ?')
    args.push(body.quantity)
  }
  if (body.is_checked !== undefined) {
    fields.push('is_checked = ?')
    args.push(body.is_checked ? 1 : 0)
  }
  if (body.is_promotion !== undefined) {
    fields.push('is_promotion = ?')
    args.push(body.is_promotion ? 1 : 0)
  }
  if (body.photo_base64 !== undefined) {
    fields.push('photo_base64 = ?')
    args.push(body.photo_base64)
  }

  if (fields.length > 0) {
    args.push(params.id)
    await db.execute({
      sql: `UPDATE items SET ${fields.join(', ')} WHERE id = ?`,
      args,
    })
  }
  return NextResponse.json({ success: true })
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const db = getDb()
  await db.execute({
    sql: 'DELETE FROM items WHERE id = ?',
    args: [params.id],
  })
  return NextResponse.json({ success: true })
}
