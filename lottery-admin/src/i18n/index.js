const dictionaries = require('./dictionaries');

const SUPPORTED = ['uz', 'ru', 'en'];
const DEFAULT_LANG = 'uz';

function normalizeLang(lang) {
  return SUPPORTED.includes(lang) ? lang : DEFAULT_LANG;
}

function translate(lang, key, params) {
  const dict = dictionaries[normalizeLang(lang)];
  let str = dict[key] || dictionaries[DEFAULT_LANG][key] || key;
  if (params) {
    Object.keys(params).forEach((k) => {
      str = str.replace(new RegExp(`{{${k}}}`, 'g'), params[k]);
    });
  }
  return str;
}

/** Har bir so'rovda res.locals.t va res.locals.lang ni sozlaydi (cookie'dan tanlangan til). */
function i18nMiddleware(req, res, next) {
  const lang = normalizeLang(req.cookies && req.cookies.lang);
  res.locals.lang = lang;
  res.locals.t = (key, params) => translate(lang, key, params);
  next();
}

module.exports = { SUPPORTED, DEFAULT_LANG, normalizeLang, translate, i18nMiddleware };
