require('dotenv').config();
const crypto = require('crypto');
const path = require('path');
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');

const SqliteSessionStore = require('./sessionStore');
const requireAuth = require('./middleware/requireAuth');
const securityHeaders = require('./middleware/securityHeaders');
const csrfProtection = require('./middleware/csrf');
const { rateLimitMiddleware } = require('./middleware/rateLimit');
const authRoutes = require('./routes/auth');
const membersRoutes = require('./routes/members');
const participantsRoutes = require('./routes/participants');
const drawsRoutes = require('./routes/draws');
const accountRoutes = require('./routes/account');
const langRoutes = require('./routes/lang');
const { i18nMiddleware } = require('./i18n');

const app = express();

const basePath = require('./basePath');

// Express versiyasini oshkor qilmaymiz (hujumchi uchun ortiqcha ma'lumot).
app.disable('x-powered-by');

// Apache reverse-proxy ortida turibmiz: haqiqiy IP (rate limit uchun) va
// https ekanini (secure cookie uchun) X-Forwarded-* sarlavhalaridan olamiz.
app.set('trust proxy', 1);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));

// Forma hajmini cheklaymiz — katta "body" bilan xotirani to'ldirishning oldi olinadi.
app.use(express.urlencoded({ extended: false, limit: '32kb' }));
app.use(cookieParser());
app.use(securityHeaders);
app.use(rateLimitMiddleware({ windowMs: 60 * 1000, max: 300 }));
app.use(basePath, express.static(path.join(__dirname, '..', 'public')));

/**
 * SESSION_SECRET bo'lmasa sessiya cookie'sini soxtalashtirish mumkin bo'lardi.
 * Shuning uchun yo'q bo'lsa tasodifiy kalit yasaymiz (xizmat to'xtamasin), lekin
 * balandroq ovozda ogohlantiramiz — restartda hamma sessiya bekor bo'ladi.
 */
let sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret || sessionSecret === 'dev-secret') {
  sessionSecret = crypto.randomBytes(48).toString('hex');
  console.warn('[xavfsizlik] SESSION_SECRET sozlanmagan — vaqtincha tasodifiy kalit ishlatilmoqda. .env ga doimiy qiymat qo\'ying!');
}

app.use(session({
  name: 'lottery.sid',
  store: new SqliteSessionStore(),
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    // 'auto': HTTPS orqali kelgan so'rovda cookie faqat HTTPS'da yuboriladigan
    // bo'ladi. Qat'iy true qilinsa, proksi X-Forwarded-Proto yubormasa kirish
    // umuman ishlamay qolishi mumkin edi.
    secure: 'auto',
    maxAge: 1000 * 60 * 60 * 12,
  },
}));

// Har bir view'da hrefs uchun ishlatiladigan bazaviy yo'l va tarjima funksiyasi (t).
app.use((req, res, next) => {
  res.locals.base = basePath;
  next();
});
app.use(i18nMiddleware);
app.use(csrfProtection);

app.use(basePath, authRoutes);
app.use(basePath + '/lang', langRoutes);
app.use(basePath + '/members', requireAuth, membersRoutes);
app.use(basePath + '/participants', requireAuth, participantsRoutes);
app.use(basePath + '/draws', requireAuth, drawsRoutes);
app.use(basePath + '/account', requireAuth, accountRoutes);

app.get(basePath + '/', requireAuth, (req, res) => res.redirect(basePath + '/participants'));
if (basePath) {
  app.get(basePath, requireAuth, (req, res) => res.redirect(basePath + '/participants'));
}

app.use((req, res) => {
  res.status(404).type('text/plain; charset=utf-8').send('Not found');
});

// Xatolik matnini (stack trace) foydalanuvchiga ko'rsatmaymiz — faqat logga.
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  const status = Number(err && (err.status || err.statusCode));
  // Mijoz xatosi (juda katta body, buzuq forma va h.k.) — 4xx qaytaramiz, log'ni
  // "xato" bilan to'ldirmaymiz (aks holda log'ni ataylab to'ldirish mumkin bo'lardi).
  if (Number.isInteger(status) && status >= 400 && status < 500) {
    console.warn(`[so'rov rad etildi] ${status} ${req.method} ${req.originalUrl} ip=${req.ip}`);
    return res.status(status).type('text/plain; charset=utf-8').send('So\'rov qabul qilinmadi');
  }
  console.error('[xato]', req.method, req.originalUrl, err);
  return res.status(500).type('text/plain; charset=utf-8').send('Server xatosi');
});

const PORT = process.env.PORT || 4000;
// Faqat localhost'da tinglaymiz: tashqaridan panelga to'g'ridan-to'g'ri (HTTPS'siz)
// kirib bo'lmasin — kirish faqat Apache proksi orqali, TLS bilan.
const HOST = process.env.HOST || '127.0.0.1';
const server = app.listen(PORT, HOST, () => {
  console.log(`Lottery admin ${HOST}:${PORT} da ishga tushdi`);
});

// Sekin so'rov (slowloris) hujumlariga qarshi: ulanish cheksiz ochiq turmaydi.
server.headersTimeout = 15 * 1000;
server.requestTimeout = 30 * 1000;
server.keepAliveTimeout = 10 * 1000;
server.maxHeadersCount = 100;

// Kutilmagan xatolik butun xizmatni jim yiqitmasin — logga yozamiz.
process.on('unhandledRejection', (reason) => {
  console.error('[xato] ushlanmagan promise rad etildi:', reason);
});
