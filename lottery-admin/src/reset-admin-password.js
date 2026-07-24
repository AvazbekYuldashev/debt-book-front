/**
 * Admin login/parolini to'g'ridan-to'g'ri bazada almashtirish (parol unutilganda).
 *
 * Parol HECH QAYERGA yozilmaydi — faqat bcrypt hash'i bazaga tushadi, shuning
 * uchun bu skriptni git'dagi kod bilan birga saqlash xavfsiz.
 *
 * Serverda ishlatish (baza 'lottery' foydalanuvchisiniki):
 *   cd /home/Desktop/lottery-admin
 *   sudo -u lottery /usr/local/bin/node src/reset-admin-password.js "yangi-kuchli-parol" [yangi-login]
 *
 * Eslatma: buyruq tarixida (bash history) parol qolib ketmasligi uchun buyruq
 * boshiga bo'sh joy qo'ying yoki keyin `history -c` bajaring.
 */

const bcrypt = require('bcryptjs');
const db = require('./db');

const MIN_PASSWORD_LENGTH = 10;

const password = process.argv[2];
const username = process.argv[3];

if (!password) {
  console.error('Foydalanish: node src/reset-admin-password.js <yangi-parol> [yangi-login]');
  process.exit(1);
}
if (password.length < MIN_PASSWORD_LENGTH) {
  console.error(`Parol kamida ${MIN_PASSWORD_LENGTH} belgidan iborat bo'lishi kerak.`);
  process.exit(1);
}
if (/^\d+$/.test(password) || /^(.)\1+$/.test(password)) {
  console.error('Parol juda oddiy: faqat raqamlardan yoki takrorlanuvchi belgidan iborat bo\'lmasin.');
  process.exit(1);
}

const current = db.prepare('SELECT username FROM admin WHERE id = 1').get();
const nextUsername = username || (current && current.username) || 'admin';
const hash = bcrypt.hashSync(password, 12);

db.prepare(`
  INSERT INTO admin (id, username, password_hash) VALUES (1, @username, @hash)
  ON CONFLICT(id) DO UPDATE SET username = excluded.username, password_hash = excluded.password_hash
`).run({ username: nextUsername, hash });

// Barcha ochiq sessiyalarni bekor qilamiz — eski cookie bilan kirib turgan
// odam (agar bo'lsa) parol almashgach ham qolib ketmasin.
try {
  db.prepare('DELETE FROM sessions').run();
} catch (e) {
  // sessions jadvali hali yaratilmagan bo'lsa — muammo emas.
}

console.log(`Tayyor. Login: ${nextUsername}. Barcha ochiq sessiyalar bekor qilindi.`);
