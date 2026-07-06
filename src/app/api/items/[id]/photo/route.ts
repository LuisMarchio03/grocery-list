import getDb from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const db = getDb()
  const result = await db.execute({
    sql: 'SELECT photo_base64 FROM items WHERE id = ?',
    args: [params.id],
  })
  const photo = result.rows.length ? (result.rows[0].photo_base64 as string) : ''
  return NextResponse.json({ photo_base64: photo || '' })
}
