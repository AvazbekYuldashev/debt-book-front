const express = require('express');
const { getAdmin, verifyPassword, updateCredentials } = require('../services/adminService');

const router = express.Router();

// Parol siyosati: 10 belgidan qisqa yoki keng tarqalgan parollar qabul qilinmaydi.
const MIN_PASSWORD_LENGTH = 10;
const WEAK_PASSWORDS = new Set([
  '12345678', '123456789', '1234567890', 'password', 'parol123', 'qwertyuiop',
  'admin123', 'adminadmin', '11111111', '00000000', 'iloveyou', 'qwerty123',
]);

function isWeakPassword(password, username) {
  const value = String(password || '');
  const lower = value.toLowerCase();
  if (WEAK_PASSWORDS.has(lower)) return true;
  if (username && lower === String(username).toLowerCase()) return true;
  // Faqat bitta belgidan iborat ("aaaaaaaaaa") yoki faqat raqamlar bo'lsa — zaif.
  if (/^(.)\1+$/.test(value)) return true;
  if (/^\d+$/.test(value)) return true;
  return false;
}

router.get('/', (req, res) => {
  res.render('account', { username: getAdmin().username, error: null, success: null, active: 'account' });
});

router.post('/', (req, res) => {
  const { currentPassword, newUsername, newPassword, confirmPassword } = req.body;
  const admin = getAdmin();
  const t = res.locals.t;
  const render = (opts) => res.render('account', { ...opts, active: 'account' });

  if (!verifyPassword(currentPassword)) {
    return render({ username: admin.username, error: t('account_error_wrong_current'), success: null });
  }
  if (!newPassword || newPassword.length < MIN_PASSWORD_LENGTH) {
    return render({ username: admin.username, error: t('account_error_too_short'), success: null });
  }
  if (newPassword !== confirmPassword) {
    return render({ username: admin.username, error: t('account_error_mismatch'), success: null });
  }
  if (isWeakPassword(newPassword, newUsername || admin.username)) {
    return render({ username: admin.username, error: t('account_error_weak'), success: null });
  }

  updateCredentials({ username: newUsername, newPassword });
  console.info(`[audit] admin login/parol o'zgartirildi: ip=${req.ip}`);
  render({ username: newUsername || admin.username, error: null, success: t('account_success') });
});

module.exports = router;
