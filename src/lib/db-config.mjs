import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

/**
 * Lê .env.local para process.env. Silencioso se o arquivo não existir.
 * Só os scripts precisam chamar isto — o Next carrega .env.local sozinho.
 */
export function loadEnvLocal() {
  try {
    const content = readFileSync(resolve(__dirname, '..', '..', '.env.local'), 'utf-8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx === -1) continue
      process.env[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim()
    }
  } catch {}
}

/**
 * Turso quando TURSO_DATABASE_URL existe; senão SQLite local.
 * O fallback é proibido em produção: cair num arquivo efêmero do serverless
 * faria o app subir "funcionando" e perder os dados no próximo restart.
 */
export function resolveDbConfig() {
  const url = process.env.TURSO_DATABASE_URL
  if (url) {
    const authToken = process.env.TURSO_AUTH_TOKEN
    return authToken ? { url, authToken } : { url }
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'TURSO_DATABASE_URL é obrigatória em produção. ' +
      'O fallback para SQLite local existe apenas para desenvolvimento.'
    )
  }
  return { url: 'file:./dev.db' }
}
