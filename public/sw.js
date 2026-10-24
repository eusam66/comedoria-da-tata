// Worker mantido manualmente. O build atual não usa next-pwa/Workbox.
// Atualize a versão ao mudar a estratégia ou o shell offline.
const CACHE = 'tata-public-v3';
const LEGACY_CACHES = /^(workbox-|start-url$|google-fonts-|static-|next-|others$|cross-origin$|apis$)/;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) {
      if ((name.startsWith('tata-public-') && name !== CACHE) || LEGACY_CACHES.test(name))
        await caches.delete(name);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  // Nunca interceptar mutações, APIs, Auth, pedidos, checkout ou WhatsApp.
  if (request.method !== 'GET' || url.origin !== self.location.origin ||
      /^\/(api|admin|pedido)(\/|$)/.test(url.pathname) || url.search ||
      request.headers.get('RSC') === '1') return;

  const staticAsset = /^\/(icons|branding|pratos|_next\/static)\//.test(url.pathname);
  const shell = request.mode === 'navigate' && url.pathname === '/';
  if (!staticAsset && !shell) return;
  // Network first: o shell offline serve apenas navegação. APIs nunca usam cache.
  event.respondWith((async () => {
    try {
      const response = await fetch(request);
      if (response.ok && response.type === 'basic') {
        try {
          const cache = await caches.open(CACHE);
          await cache.put(request, response.clone());
          const keys = await cache.keys();
          // Limita o crescimento após atualizações de chunks e imagens.
          if (keys.length > 100) await cache.delete(keys[0]);
        } catch { /* Falta de espaço/permissão de cache não interrompe a rede. */ }
      }
      return response;
    } catch {
      try {
        const cached = await (await caches.open(CACHE)).match(request);
        if (cached) return cached;
      } catch { /* Sem cache disponível, mantém a falha de rede. */ }
      return Response.error();
    }
  })());
});
