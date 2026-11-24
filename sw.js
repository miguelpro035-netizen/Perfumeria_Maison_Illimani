/* Maison Illimani — Service Worker (Guía C3-A2: «proxy invisible» entre navegador y red)
   install: precache de todos los archivos · fetch: Cache Storage primero, red de respaldo · activate: limpia versiones viejas. */
const CACHE_NAME = 'cat-2-perfumeria-maison-illi-v1.0.0';
const ASSETS_TO_CACHE = [
 "./",
 "./assets/images/armani-acqua-di-gi.svg",
 "./assets/images/carolina-herrera-good-girl.svg",
 "./assets/images/chanel-bleu.svg",
 "./assets/images/chanel-n-5.svg",
 "./assets/images/dior-sauvage.svg",
 "./assets/images/dolce-gabbana-light-blue.svg",
 "./assets/images/lanc-me-la-vie-est-belle.svg",
 "./assets/images/logo.svg",
 "./assets/images/maison-illimani-altiplano.svg",
 "./assets/images/maison-illimani-cielo-pace-o.svg",
 "./assets/images/maison-illimani-decant-10-ml-a-elecci-n.svg",
 "./assets/images/maison-illimani-estuche-regalo-ella.svg",
 "./assets/images/maison-illimani-estuche-regalo-l.svg",
 "./assets/images/maison-illimani-illimani-noir.svg",
 "./assets/images/maison-illimani-mbar-3600.svg",
 "./assets/images/maison-illimani-set-descubrimiento-5-decants.svg",
 "./assets/images/maison-illimani-titicaca.svg",
 "./assets/images/maison-illimani-yungas.svg",
 "./assets/images/paco-rabanne-1-million.svg",
 "./assets/images/versace-eros.svg",
 "./assets/images/yves-saint-laurent-black-opium.svg",
 "./data/products.json",
 "./data/site.json",
 "./icons/icon-192.png",
 "./icons/icon-512.png",
 "./index.html",
 "./manifest.json",
 "./script.js",
 "./styles.css",
 "./vendor/jquery-3.6.0.min.js",
 "./vendor/purify.min.js"
];
const RUNTIME_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('cat-2-perfumeria-maison-illi-') && k !== CACHE_NAME).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (event) => {
  const request = event.request; const url = new URL(request.url);
  if (request.method !== 'GET') return;
  if (url.origin !== self.location.origin && !RUNTIME_HOSTS.includes(url.hostname)) return;
  event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => {
    if (response && response.ok) { const copy = response.clone(); caches.open(CACHE_NAME).then((c) => c.put(request, copy)); }
    return response;
  }).catch(() => request.mode === 'navigate' ? caches.match('./index.html') : new Response('Recurso no disponible sin conexión.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }))));
});
self.addEventListener('sync', (event) => { if (event.tag === 'pedidos-pendientes') event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((l) => l.forEach((c) => c.postMessage({ type: 'SYNC_AVAILABLE' })))); });
self.addEventListener('message', (event) => { if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting(); });
