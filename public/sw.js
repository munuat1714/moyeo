const CACHE_NAME = 'moyeo-shell-v1'
const SHELL = ['/app', '/manifest.webmanifest', '/icons/moyeo-192.png', '/icons/moyeo-512.png']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))))
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return
  event.respondWith(fetch(event.request).catch(async () => {
    const cached = await caches.match(event.request)
    if (cached) return cached
    if (event.request.mode === 'navigate') return (await caches.match('/app')) || Response.error()
    return Response.error()
  }))
})
