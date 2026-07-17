import { createClient } from '@libsql/client'
import type { Client } from '@libsql/client'
import { resolveDbConfig } from './db-config.mjs'

let db: Client

export default function getDb(): Client {
  if (!db) db = createClient(resolveDbConfig())
  return db
}
