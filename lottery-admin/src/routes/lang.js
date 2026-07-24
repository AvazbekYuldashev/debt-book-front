const express = require('express');
const basePath = require('../basePath');
const { SUPPORTED } = require('../i18n');

const router = express.Router();

router.get('/:code', (req, res) => {
  const code = req.params.code;
  if (SUPPORTED.includes(code)) {
    res.cookie('lang', code, { maxAge: 1000 * 60 * 60 * 24 * 365, sameSite: 'lax' });
  }
  const back = req.get('referer') || basePath + '/';
  res.redirect(back);
});

module.exports = router;
