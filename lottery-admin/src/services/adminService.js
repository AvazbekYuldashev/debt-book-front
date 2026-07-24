const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('../db');

const getStmt = db.prepare(`SELECT username, password_hash FROM admin WHERE id = 1`);
const updateStmt = db.prepare(`UPDATE admin SET username = @username, password_hash = @passwordHash WHERE id = 1`);

// Admin topilmaganda ham bcrypt bir xil vaqt sarflasin — javob tezligiga qarab
// login mavjudligini aniqlab bo'lmasin (timing attack).
const DUMMY_HASH = bcrypt.hashSync(crypto.randomBytes(16).toString('hex'), 10);

/** Satrlarni uzunlik/qiymat farqini vaqtdan sezdirmasdan solishtiradi. */
function timingSafeEqual(a, b) {
  const bufA = Buffer.from(String(a || ''), 'utf8');
  const bufB = Buffer.from(String(b || ''), 'utf8');
  if (bufA.length === 0 || bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function getAdmin() {
  return getStmt.get();
}

function verifyCredentials(username, password) {
  const admin = getAdmin();
  const hash = admin ? admin.password_hash : DUMMY_HASH;
  const passwordOk = bcrypt.compareSync(password || '', hash);
  const usernameOk = admin ? timingSafeEqual(username, admin.username) : false;
  return Boolean(admin) && usernameOk && passwordOk;
}

function verifyPassword(password) {
  const admin = getAdmin();
  if (!admin) return false;
  return bcrypt.compareSync(password || '', admin.password_hash);
}

function updateCredentials({ username, newPassword }) {
  const admin = getAdmin();
  updateStmt.run({
    username: username || admin.username,
    passwordHash: bcrypt.hashSync(newPassword, 12),
  });
}

module.exports = { getAdmin, verifyCredentials, verifyPassword, updateCredentials };
