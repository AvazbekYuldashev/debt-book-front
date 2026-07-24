const crypto = require('crypto');

/**
 * CSRF himoyasi (double-submit cookie usuli, tashqi paketsiz).
 *
 * MUAMMO: himoyasiz holatda admin panelga kirgan holda boshqa saytni ochsa,
 * o'sha sayt yashirin forma orqali bizning /draws yoki /participants/sync
 * manzillarimizga POST yubora oladi — brauzer sessiya cookie'sini o'zi qo'shadi.
 *
 * YECHIM: har bir formaga tasodifiy token qo'yamiz va uni cookie'dagi token bilan
 * solishtiramiz. Boshqa sayt cookie qiymatini o'qiy olmaydi (httpOnly + same-origin),
 * shuning uchun to'g'ri tokenni forma ichiga qo'ya olmaydi.
 */

const COOKIE_NAME = 'lottery.csrf';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function isSecureRequest(req) {
  return Boolean(req.secure) || req.get('x-forwarded-proto') === 'https';
}

function timingSafeEqual(a, b) {
  const bufA = Buffer.from(String(a || ''), 'utf8');
  const bufB = Buffer.from(String(b || ''), 'utf8');
  if (bufA.length === 0 || bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function issueToken(req, res) {
  const token = crypto.randomBytes(32).toString('hex');
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isSecureRequest(req),
    path: '/',
  });
  if (req.cookies) req.cookies[COOKIE_NAME] = token;
  res.locals.csrfToken = token;
  return token;
}

module.exports = function csrfProtection(req, res, next) {
  const existing = req.cookies && req.cookies[COOKIE_NAME];
  if (existing) {
    res.locals.csrfToken = existing;
  } else {
    issueToken(req, res);
  }

  // Login muvaffaqiyatli bo'lganda tokenni yangilash uchun (sessiya bilan birga).
  res.rotateCsrfToken = () => issueToken(req, res);

  if (SAFE_METHODS.has(req.method)) return next();

  const sent = (req.body && req.body._csrf) || req.get('x-csrf-token');
  if (!timingSafeEqual(sent, res.locals.csrfToken)) {
    console.warn(`[csrf] rad etildi: ${req.method} ${req.originalUrl} ip=${req.ip}`);
    const message = typeof res.locals.t === 'function'
      ? res.locals.t('csrf_error')
      : 'Sessiya eskirdi — sahifani yangilab, qaytadan urinib ko\'ring.';
    return res.status(403).type('text/plain; charset=utf-8').send(message);
  }

  return next();
};

module.exports.COOKIE_NAME = COOKIE_NAME;
