const express = require('express');
const { runDraw, listDraws, getDrawWithWinners } = require('../services/drawService');
const { listParticipants } = require('../services/participantsService');
const { toBoundedInt } = require('../lib/validate');

const router = express.Router();

// Mukofotlar soni va draw ID uchun qat'iy chegaralar.
const MAX_PRIZES = 1000;
const MAX_ID = 2147483647;

router.get('/', (req, res) => {
  res.render('draw', {
    participantCount: listParticipants().length,
    result: null,
    error: null,
    active: 'draws',
  });
});

router.post('/', (req, res) => {
  const prizeCount = toBoundedInt(req.body.prizeCount, { min: 1, max: MAX_PRIZES });
  let result = null;
  let error = null;
  if (prizeCount === null) {
    error = res.locals.t('draw_error_prize_count');
  } else {
    try {
      result = runDraw(prizeCount);
      console.info(`[audit] viktorina o'tkazildi: drawId=${result.drawId} mukofot=${prizeCount} ip=${req.ip}`);
    } catch (e) {
      error = e.message;
    }
  }
  res.status(error ? 400 : 200).render('draw', {
    participantCount: listParticipants().length,
    result,
    error,
    active: 'draws',
  });
});

router.get('/history', (req, res) => {
  const draws = listDraws();
  res.render('history', { draws, active: 'history' });
});

router.get('/history/:id', (req, res) => {
  const id = toBoundedInt(req.params.id, { min: 1, max: MAX_ID });
  if (id === null) {
    return res.status(400).type('text/plain; charset=utf-8').send('Draw ID noto\'g\'ri');
  }
  const detail = getDrawWithWinners(id);
  if (!detail) {
    return res.status(404).type('text/plain; charset=utf-8').send('Draw topilmadi');
  }
  res.render('draw-detail', { ...detail, active: 'history' });
});

module.exports = router;
