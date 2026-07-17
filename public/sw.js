// Bump a cada mudança de estratégia: o activate apaga todo cache com nome diferente.
const CACHE = 'grocery-list-v2'

const PRECACHE_URLS = ['/manifest.json']

self.addEventListener('install', (event) => {
  // Assume no próximo carregamento em vez de esperar todas as abas fecharem.
  // Sem isto, um PWA instalado pode nunca receber a correção.
  self.skipWaiting()
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE_URLS)))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

// Grava a resposta no cache sem travar o que já foi devolvido ao cliente,
// mas prende a escrita ao ciclo de vida do evento com waitUntil. Sem isto o
// navegador pode reciclar o worker antes da escrita terminar, descartando a
// atualização em silêncio. O catch cobre QuotaExceededError, comum em
// aparelhos com pouco armazenamento — exatamente o tipo de celular do bug.
function cachePut(event, response) {
  if (response.ok && response.type === 'basic') {
    const clone = response.clone()
    event.waitUntil(
      caches
        .open(CACHE)
        .then((cache) => cache.put(event.request, clone))
        .catch(() => {})
    )
  }
  return response
}

/** Estático com hash no nome: genuinamente imutável, seguro para cache-first puro. */
function isHashedAsset(url) {
  return url.pathname.startsWith('/_next/static/')
}

/**
 * Nome fixo mas conteúdo pode mudar em deploy (ícone trocado, manifest
 * atualizado). Cache-first puro aqui prenderia o PWA já instalado num
 * arquivo velho para sempre — precisa revalidar em segundo plano.
 */
function isRevalidatable(url) {
  return url.pathname.startsWith('/icons/') || url.pathname === '/manifest.json'
}

// Página própria de fallback quando não há rede E não há nada no cache
// (ex.: primeiríssima visita offline, antes de qualquer navegação online ter
// alimentado o cache). Sem isto, event.respondWith(undefined) violaria o
// spec e o navegador mostraria a própria tela genérica de erro de rede em
// vez do app.
const OFFLINE_HTML = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Sem conexão</title>
  </head>
  <body>
    <h1>Sem conexão</h1>
    <p>Não foi possível carregar esta página. Verifique sua internet e tente novamente.</p>
  </body>
</html>`

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  const url = new URL(event.request.url)

  // Só mexe no que é nosso.
  if (url.origin !== self.location.origin) return

  // A API NUNCA passa pelo cache: dado velho quebra a sincronização
  // e serve dados de outro usuário depois de trocar de login.
  if (url.pathname.startsWith('/api/')) return

  if (isHashedAsset(url)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached
        return fetch(event.request).then((response) => cachePut(event, response))
      })
    )
    return
  }

  if (isRevalidatable(url)) {
    // Stale-while-revalidate: devolve o cache na hora (rápido, funciona
    // offline) e dispara a atualização em paralelo para a próxima carga.
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const refresh = fetch(event.request).then((response) => cachePut(event, response))
        // Prende a atualização em segundo plano ao evento explicitamente:
        // quando `cached` existe, a promise acima (a que respondWith recebe)
        // resolve antes de `refresh` terminar, então sem esta linha o
        // worker poderia ser reciclado antes do cachePut interno rodar.
        event.waitUntil(refresh.catch(() => {}))
        return cached || refresh
      })
    )
    return
  }

  // Navegação/HTML: network-first. O cache é só rede de segurança offline.
  // É isto que impede o HTML velho de apontar para chunks que não existem mais.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => cachePut(event, response))
        .catch(async () => {
          const cached = (await caches.match(event.request)) || (await caches.match('/'))
          if (cached) return cached
          return new Response(OFFLINE_HTML, {
            status: 503,
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          })
        })
    )
    return
  }

  // Resto: rede, sem cache.
})
