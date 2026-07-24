/**
 * Oddiy in-memory so'rov cheklagichi (tashqi paketsiz).
 *
 * Nima uchun: parolni "brute force" (millionlab urinish) bilan topishning va
 * panelni so'rovlar bilan ko'mib tashlashning oldini oladi. Ilova bitta
 * process'da ishlaydi, sessiyalar ham xotirada — shuning uchun xotiradagi
 * hisoblagich yetarli.
 */

const CLEANUP_EVERY_MS = 60 * 1000;

function createRateLimiter({ windowMs, max }) {
  const hits = new Map();

  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) {
      if (entry.resetAt <= now) hits.delete(key);
    }
  }, CLEANUP_EVERY_MS);
  if (typeof cleanup.unref === 'function') cleanup.unref();

  function entryFor(key) {
    const now = Date.now();
    const found = hits.get(key);
    if (found && found.resetAt > now) return found;
    const fresh = { count: 0, resetAt: now + windowMs };
    hits.set(key, fresh);
    return fresh;
  }

  return {
    /** Urinishni hisobga oladi va limitdan oshgan-oshmaganini qaytaradi. */
    hit(key) {
      const entry = entryFor(key);
      entry.count += 1;
      return entry.count >= max;
    },
    isLimited(key) {
      const entry = hits.get(key);
      return Boolean(entry && entry.resetAt > Date.now() && entry.count >= max);
    },
    retryAfterSeconds(key) {
      const entry = hits.get(key);
      if (!entry) return 0;
      return Math.max(0, Math.ceil((entry.resetAt - Date.now()) / 1000));
    },
    /** Muvaffaqiyatli kirishdan keyin hisobni tozalaydi. */
    reset(key) {
      hits.delete(key);
    },
  };
}

/** Barcha so'rovlar uchun umumiy cheklov (flood/DoS'ga qarshi birinchi to'siq). */
function rateLimitMiddleware({ windowMs, max }) {
  const limiter = createRateLimiter({ windowMs, max });
  return function rateLimit(req, res, next) {
    if (limiter.hit(req.ip)) {
      res.setHeader('Retry-After', String(limiter.retryAfterSeconds(req.ip)));
      return res.status(429).type('text/plain; charset=utf-8').send('Too many requests');
    }
    return next();
  };
}

module.exports = { createRateLimiter, rateLimitMiddleware };
