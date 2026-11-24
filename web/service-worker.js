/* eslint-env serviceworker */
// ============================================================
//  OFLAYN QOBIQ ("app shell") + bildirishnoma.
//
//  NIMA UCHUN BU KERAK: brauzerda ilovaning o'zi ham serverdan
//  yuklanadi. Oflaynda sahifa yangilansa yoki ilova yopib qayta
//  ochilsa, index.html va JS to'plami kelmaydi — odam brauzerning
//  "internet yo'q" sahifasini ko'radi. Ya'ni keshdagi ma'lumot
//  saqlanib turgan bo'lsa ham, uni KO'RSATADIGAN ilova ishga
//  tushmaydi. Shuning uchun qobiq shu yerda keshlanadi.
//
//  Bildirishnoma qismi ham shu faylda qoladi: mobil Chromium'da
//  sahifadan `new Notification()` ishlamaydi ("Illegal constructor"),
//  bildirishnoma registration.showNotification orqali chiqarilishi
//  SHART.
// ============================================================

const CACHE = 'tez-top-shell-v1';

/** Ilova ishga tushishi uchun zarur, nomi o'zgarmaydigan fayllar. */
const SHELL = [
  '/',
  '/manifest.webmanifest',
  '/favicon.ico',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
];

/** Nomida hash bor fayllar shu yerda yotadi — ya'ni mazmuni o'zgarmaydi. */
const STATIC_DIRS = ['/_expo/', '/assets/'];

/** JS to'plami. Har build'da nomi o'zgaradi, eskisi keshda yig'ilib qolmasin. */
const JS_DIR = '/_expo/static/js/';

/**
 * Keshdan HECH QACHON berilmaydigan yo'llar.
 *
 *  /api/        — so'rov haqiqatan yiqilishi KERAK. Keshdan javob
 *                 berilsa ilova "internet bor" deb o'ylar va oflayn
 *                 amal navbatga tushmasdan yo'qolib ketardi.
 *  version.txt  — deploy tekshiruvi shu faylga tayanadi; eskisi
 *                 "sayt yangilandi" deb yolg'on gapiradi.
 */
const NEVER_CACHE = ['/api/', '/version.txt'];

/** Shriftlar boshqa domendan keladi — oflaynda ular ham kerak. */
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

/** Faqat shu turdagi so'rovlar keshdan beriladi (HTML bundan tashqari). */
const STATIC_DESTINATIONS = ['script', 'style', 'font', 'image'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      // Har fayl ALOHIDA qo'shiladi: `addAll` bittasi topilmasa
      // butun o'rnatishni yiqitar va oflayn rejim umuman ishlamasdi.
      await Promise.all(SHELL.map((url) => cache.add(url).catch(() => undefined)));
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((name) => name !== CACHE).map((name) => caches.delete(name)));
      await self.clients.claim();
    })()
  );
});

const isStaticPath = (pathname) => STATIC_DIRS.some((dir) => pathname.startsWith(dir));

/**
 * Bu manzil ILOVANING o'zimi (docroot'dagi alohida sahifa emasmi).
 *
 * Saytda ilovadan tashqari mustaqil sahifalar ham bor: privacy.html,
 * terms.html, delete-account.html — Play Store talabi. Ular ilova
 * qobig'i EMAS va ikki narsani buzishi mumkin edi:
 *   - ochilganda qobiq keshining ustiga yozilib, keyin ilova o'rniga
 *     maxfiylik sahifasi ko'rsatilardi;
 *   - oflaynda ularning o'rniga ilova chizilib, odam manzilga ishonmay
 *     qolardi.
 * Ilovaning ichki manzillari (`/`, `/contacts/...`) `.html` bilan
 * tugamaydi — ajratish shunga tayanadi.
 */
const isAppShellPath = (pathname) => pathname === '/' || !pathname.endsWith('.html');

/**
 * Keshga yozishga yaroqli javobmi.
 *
 * 206 (qismli) javobni `cache.put` qabul qilmaydi va xato tashlaydi;
 * `opaque` esa boshqa domendagi shrift — statusi 0 bo'ladi, lekin
 * saqlash mumkin va kerak.
 */
const isStorable = (response) =>
  Boolean(response) && (response.status === 200 || response.type === 'opaque');

/** Eski JS to'plamlarini keshdan olib tashlaydi — faqat joriysi qoladi. */
const dropOtherBundles = async (cache, keepUrl) => {
  const keys = await cache.keys();
  await Promise.all(
    keys.map((key) => {
      if (key.url === keepUrl) return undefined;
      return new URL(key.url).pathname.startsWith(JS_DIR) ? cache.delete(key) : undefined;
    })
  );
};

/**
 * SAHIFA: avval tarmoq, bo'lmasa kesh.
 *
 * Tarmoq birinchi bo'lishi SHART: teskarisida yangi deploy chiqqanda
 * odam eski ilovada qolib ketardi. Javob doim `/` kaliti bilan
 * saqlanadi — ilova bir sahifali va istalgan manzilda shu qobiq
 * ko'rsatiladi.
 */
const pageFromNetworkThenCache = async (request) => {
  const cache = await caches.open(CACHE);
  const isShell = isAppShellPath(new URL(request.url).pathname);
  try {
    const response = await fetch(request);
    if (isShell && isStorable(response)) await cache.put('/', response.clone());
    return response;
  } catch {
    const cached = isShell ? await cache.match('/') : undefined;
    if (cached) return cached;
    // Keshda ham yo'q: brauzerning odatiy xatosi ko'rsatiladi.
    return Response.error();
  }
};

/** STATIK FAYL: avval kesh. Nomida hash bor, demak eskirmaydi. */
const assetFromCacheThenNetwork = async (request) => {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (isStorable(response)) {
    if (new URL(request.url).pathname.startsWith(JS_DIR)) {
      await dropOtherBundles(cache, request.url);
    }
    await cache.put(request, response.clone());
  }
  return response;
};

self.addEventListener('fetch', (event) => {
  const { request } = event;
  // Yozuv amallari (POST/PUT/...) keshga aloqasi yo'q — ularni oflayn
  // navbat ilovaning o'zida ushlaydi.
  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  const sameOrigin = url.origin === self.location.origin;
  if (sameOrigin && NEVER_CACHE.some((path) => url.pathname.startsWith(path))) return;

  if (request.mode === 'navigate') {
    event.respondWith(pageFromNetworkThenCache(request));
    return;
  }

  const cacheable = sameOrigin
    ? isStaticPath(url.pathname) || STATIC_DESTINATIONS.includes(request.destination)
    : FONT_HOSTS.includes(url.hostname);

  if (cacheable) event.respondWith(assetFromCacheThenNetwork(request));
});

// Bildirishnoma bosilganda: ochiq oynani fokuslaymiz, bo'lmasa yangisini ochamiz.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) return client.focus();
        }
        if (self.clients.openWindow) return self.clients.openWindow('/');
        return undefined;
      })
  );
});
