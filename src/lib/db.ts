import { createClient } from '@libsql/client'
import type { Client } from '@libsql/client'

let db: Client

export default function getDb(): Client {
  if (!db) {
    db = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN!,
    })
  }
  return db
}
