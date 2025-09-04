// Service Worker básico para modo totem/offline
const CACHE_NAME = 'memoria-belz-v3';
const ASSETS = [
  '/',
  'index.html',
  'style.css',
  'script.js',
  'manifest.webmanifest',
  'img/background1.png',
  'img/background2.png',
  'img/cardfront.jpg',
  'img/img1.png',
  'img/img2.png',
  'img/img3.png',
  'img/img4.png',
  'img/img5.png',
  'img/img6.png',
  'img/img7.png',
  'img/img8.png',
  'img/img9.png',
  'img/img10.png',
  'img/conecta.jpeg',
  'img/frame.png'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k!==CACHE_NAME).map(k => caches.delete(k)) )));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(e.request).then(resp => resp || fetch(e.request).then(net => {
        // Cache-first update (stale-while-revalidate simples para assets GET)
        if (e.request.method === 'GET') {
          const copy = net.clone();
          caches.open(CACHE_NAME).then(c=>c.put(e.request, copy));
        }
        return net;
      }).catch(()=>caches.match('index.html')))
    );
  }
});
