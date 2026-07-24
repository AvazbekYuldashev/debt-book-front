const crypto = require('crypto');

/**
 * Xavfsizlik sarlavhalari (helmet o'rniga qo'lda — serverda yangi npm paket
 * o'rnatish talab qilinmasin uchun).
 *
 * - CSP: XSS bo'lsa ham tashqi skript yuklanmaydi/ishlamaydi (nonce bilan faqat
 *   bizning inline skript ruxsat etiladi).
 * - frame-ancestors/X-Frame-Options: clickjacking (ko'rinmas iframe ustidan bosish).
 * - nosniff: brauzer fayl turini o'zicha "taxmin" qilmasin.
 * - HSTS: HTTPS orqali kelgan bo'lsa, brauzer keyingi safar ham HTTPS'da kelsin.
 */
/**
 * Profil rasmlari Debt-Book backendidan keladi. Panel bilan bitta domenda
 * bo'lsa 'self' yetarli, lekin lokal ishlab chiqishda (127.0.0.1) manba
 * boshqa bo'ladi — shuning uchun API origin'ini CSP'ga qo'shamiz.
 */
function apiImageOrigin() {
  const candidates = [process.env.ATTACH_BASE_URL, process.env.DEBT_BOOK_API_URL];
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      const url = new URL(candidate);
      // Ichki manzil (127.0.0.1:8080) brauzer uchun ma'nosiz — CSP'ga qo'shmaymiz,
      // bunday holatda rasmlar nisbiy yo'l bilan ('self') keladi.
      if (url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '::1') continue;
      return url.origin;
    } catch (e) { /* noto'g'ri URL — e'tiborsiz qoldiramiz */ }
  }
  return '';
}

const IMG_ORIGIN = apiImageOrigin();

module.exports = function securityHeaders(req, res, next) {
  const nonce = crypto.randomBytes(16).toString('base64');
  res.locals.cspNonce = nonce;

  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    `img-src 'self' data:${IMG_ORIGIN ? ' ' + IMG_ORIGIN : ''}`,
    `script-src 'self' 'nonce-${nonce}'`,
    // Inline style ATRIBUTLARI (style="...") nonce qabul qilmaydi — shuning uchun unsafe-inline.
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self'",
  ].join('; '));

  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');

  if (req.secure || req.get('x-forwarded-proto') === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  next();
};
