/**
 * Kirish ma'lumotlarini tekshirish yordamchilari.
 *
 * Qoida: foydalanuvchidan kelgan har bir qiymat ishlatilishidan OLDIN
 * turi va chegarasi bo'yicha tekshiriladi. Bu SQL/komanda in'ektsiyasidan
 * tashqari mantiqiy suiiste'mollarning (masalan prizeCount=99999999) ham
 * oldini oladi.
 */

// ASCII boshqaruv belgilari (log/terminal in’ektsiyasi va yashirin baytlarga qarshi).
const CONTROL_CHARS = /[\u0000-\u001F\u007F]/g;

/** Faqat butun son, [min, max] oralig'ida. Aks holda null. */
function toBoundedInt(value, { min, max }) {
  const str = String(value === undefined || value === null ? '' : value).trim();
  if (!/^-?\d{1,12}$/.test(str)) return null;
  const num = Number.parseInt(str, 10);
  if (!Number.isSafeInteger(num) || num < min || num > max) return null;
  return num;
}

/** Matn maydoni: boshqaruv belgilarini olib tashlaydi va uzunlikni cheklaydi. */
function toSafeText(value, { maxLength = 200 } = {}) {
  if (typeof value !== 'string') return '';
  return value.replace(CONTROL_CHARS, '').slice(0, maxLength);
}

module.exports = { toBoundedInt, toSafeText };
