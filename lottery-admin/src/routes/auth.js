const express = require('express');
const basePath = require('../basePath');
const { getAdmin, verifyCredentials } = require('../services/adminService');
const { createRateLimiter } = require('../middleware/rateLimit');
const { toSafeText } = require('../lib/validate');

const router = express.Router();

// Login/parol uzunligi cheklanadi: juda uzun qiymat bilan bcrypt'ni ataylab
// sekinlashtirib (CPU'ni band qilib) xizmatni cho'ktirish mumkin emas.
const MAX_USERNAME_LENGTH = 100;
const MAX_PASSWORD_LENGTH = 200;

// 15 daqiqada 5 ta xato urinishdan keyin IP bloklanadi (parolni terib topishga qarshi).
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 5;
const loginLimiter = createRateLimiter({ windowMs: LOGIN_WINDOW_MS, max: LOGIN_MAX_ATTEMPTS });

router.get('/login', (req, res) => {
  if (req.session && req.session.isAdmin) {
    return res.redirect(basePath + '/');
  }
  res.render('login', { error: null });
});

router.post('/login', (req, res) => {
  const username = toSafeText(req.body.username, { maxLength: MAX_USERNAME_LENGTH });
  const password = typeof req.body.password === 'string'
    ? req.body.password.slice(0, MAX_PASSWORD_LENGTH)
    : '';

  if (loginLimiter.isLimited(req.ip)) {
    const minutes = Math.ceil(loginLimiter.retryAfterSeconds(req.ip) / 60);
    console.warn(`[login] bloklangan IP urinishi: ip=${req.ip}`);
    res.setHeader('Retry-After', String(loginLimiter.retryAfterSeconds(req.ip)));
    return res.status(429).render('login', { error: res.locals.t('login_error_too_many', { minutes }) });
  }

  if (!getAdmin()) {
    return res.render('login', { error: res.locals.t('login_error_not_configured') });
  }

  if (!verifyCredentials(username, password)) {
    loginLimiter.hit(req.ip);
    console.warn(`[login] muvaffaqiyatsiz urinish: ip=${req.ip} username=${String(username || '').slice(0, 40)}`);
    // Login xato yoki parol xatoligini ajratmaymiz — hujumchiga ma'lumot bermaslik uchun.
    return res.status(401).render('login', { error: res.locals.t('login_error_wrong') });
  }

  loginLimiter.reset(req.ip);

  // Sessiya ID'sini yangilaymiz: "session fixation" hujumida hujumchi oldindan
  // bergan ID kirishdan keyin ham ishlab qolmasin.
  req.session.regenerate((err) => {
    if (err) {
      console.error('[login] sessiya yangilanmadi', err);
      return res.status(500).render('login', { error: res.locals.t('login_error_wrong') });
    }
    req.session.isAdmin = true;
    if (typeof res.rotateCsrfToken === 'function') res.rotateCsrfToken();
    console.info(`[login] muvaffaqiyatli kirish: ip=${req.ip}`);
    return res.redirect(basePath + '/');
  });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('lottery.sid');
    res.redirect(basePath + '/login');
  });
});

module.exports = router;
