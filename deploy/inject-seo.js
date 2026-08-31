#!/usr/bin/env node
/* eslint-disable no-console */
// ============================================================
//  dist/index.html ni qidiruv tizimlari uchun to'ldiradi.
//
//  NIMA UCHUN ALOHIDA QADAM: index.html ni `expo export` o'zi yasaydi va
//  har build'da qaytadan yozadi - unga qo'lda tegib bo'lmaydi. app.json
//  esa faqat title/description/theme-color/favicon beradi; canonical,
//  Open Graph, manifest va JSON-LD uchun joy yo'q.
//
//  ISHLATISH:  npm run build:web && node deploy/inject-seo.js
// ============================================================
const fs = require('fs');
const path = require('path');

const ORIGIN = 'https://pul-hisob.uz';
const FILE = path.join(__dirname, '..', 'dist', 'index.html');

const TITLE = "Tez Top — pul hisob: qarz daftari, gap to'yona va xarajatlar";
const DESCRIPTION =
  "Tez Top (pul-hisob.uz) — mijozlar bilan oldi-berdi, qarzlar, gap to'yona va " +
  "xarajatlarni telefonda yuritish uchun ilova. O'zbek, rus va ingliz tillarida.";

// Qidiruv roboti JavaScript'ni ishga tushirmasa ham sahifada haqiqiy matn
// ko'rsin. Bu ilovaning rostakam tavsifi - foydalanuvchiga ko'rinadiganidan
// boshqa narsa emas.
const NOSCRIPT = `
      <h1>Tez Top — pul hisob</h1>
      <p>
        Tez Top (pul-hisob.uz) — mijozlar bilan oldi-berdini, qarzlarni,
        gap to'yona va xarajatlarni telefoningizda yuritish uchun ilova.
      </p>
      <ul>
        <li>Qarzlar: kim qancha berishi va olishi kerakligi, valyuta bo'yicha alohida</li>
        <li>Gap to'yona: guruh a'zolari bilan oldi-berdi, har birlik alohida hisoblanadi</li>
        <li>Xarajatlar: kategoriyalar bo'yicha hisob va statistika</li>
      </ul>
      <p>Ilovadan foydalanish uchun JavaScript'ni yoqing.</p>
      <p>
        <a href="/privacy.html">Maxfiylik siyosati</a> ·
        <a href="/terms.html">Foydalanish shartlari</a>
      </p>`;

const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': ORIGIN + '/#website',
      url: ORIGIN + '/',
      name: 'Tez Top',
      alternateName: ['pul-hisob', 'pul hisob', 'Tez Top pul hisob'],
      inLanguage: 'uz',
      publisher: { '@id': ORIGIN + '/#org' },
    },
    {
      '@type': 'Organization',
      '@id': ORIGIN + '/#org',
      name: 'TEZ-TOP',
      legalName: "\"TEZ-TOP\" mas'uliyati cheklangan jamiyat",
      url: ORIGIN + '/',
      logo: {
        '@type': 'ImageObject',
        url: ORIGIN + '/icon-512.png',
        width: 512,
        height: 512,
      },
    },
    {
      '@type': 'SoftwareApplication',
      name: 'Tez Top',
      applicationCategory: 'FinanceApplication',
      operatingSystem: 'Android, Web',
      inLanguage: ['uz', 'ru', 'en'],
      url: ORIGIN + '/',
      image: ORIGIN + '/icon-512.png',
      description: DESCRIPTION,
      publisher: { '@id': ORIGIN + '/#org' },
      // Narx: ilova bepul. Reyting/sharh soni YOZILMAYDI - o'ylab
      // topilgan raqam strukturali ma'lumotlar qoidasini buzadi.
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'UZS' },
    },
  ],
};

const HEAD_TAGS = `
<link rel="canonical" href="${ORIGIN}/">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
<meta name="application-name" content="Tez Top">
<meta name="apple-mobile-web-app-title" content="Tez Top">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png">
<link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Tez Top">
<meta property="og:locale" content="uz_UZ">
<meta property="og:url" content="${ORIGIN}/">
<meta property="og:title" content="${TITLE}">
<meta property="og:description" content="${DESCRIPTION}">
<meta property="og:image" content="${ORIGIN}/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${TITLE}">
<meta name="twitter:description" content="${DESCRIPTION}">
<meta name="twitter:image" content="${ORIGIN}/og-image.png">
<script type="application/ld+json">${JSON.stringify(JSON_LD)}</script>
`;

function fail(message) {
  console.error('inject-seo: ' + message);
  process.exit(1);
}

if (!fs.existsSync(FILE)) fail(FILE + ' topilmadi — avval `npm run build:web`.');

let html = fs.readFileSync(FILE, 'utf8');

if (html.includes('rel="canonical"')) {
  console.log('inject-seo: allaqachon qo\'shilgan, o\'tkazib yuborildi.');
  process.exit(0);
}

// Expo qo'ygan qisqa sarlavha/tavsifni boyroq variantiga almashtiramiz.
if (!/<title>[^<]*<\/title>/.test(html)) fail('<title> topilmadi');
html = html.replace(/<title>[^<]*<\/title>/, '<title>' + TITLE + '</title>');

if (!/<meta name="description" content="[^"]*">/.test(html)) fail('description meta topilmadi');
html = html.replace(
  /<meta name="description" content="[^"]*">/,
  '<meta name="description" content="' + DESCRIPTION + '">'
);

if (!html.includes('</head>')) fail('</head> topilmadi');
html = html.replace('</head>', HEAD_TAGS + '</head>');

const noscriptRe = /<noscript>[\s\S]*?<\/noscript>/;
if (!noscriptRe.test(html)) fail('<noscript> topilmadi');
html = html.replace(noscriptRe, '<noscript>' + NOSCRIPT + '\n    </noscript>');

fs.writeFileSync(FILE, html);
console.log('inject-seo: dist/index.html to\'ldirildi (' + html.length + ' bayt).');
