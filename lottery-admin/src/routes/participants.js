const express = require('express');
const { fetchActiveUsers } = require('../services/debtBookClient');
const { syncParticipants, listParticipants } = require('../services/participantsService');
const { toBoundedInt } = require('../lib/validate');

const router = express.Router();

// "Kun" qiymati faqat 1..3650 oralig'idagi butun son bo'lishi mumkin.
const MIN_DAYS = 1;
const MAX_DAYS = 3650;

function defaultDays() {
  return toBoundedInt(process.env.DEFAULT_ACTIVE_DAYS, { min: MIN_DAYS, max: MAX_DAYS }) || 30;
}

router.get('/', (req, res) => {
  const participants = listParticipants();
  res.render('participants', {
    participants,
    defaultDays: defaultDays(),
    syncResult: null,
    error: null,
    active: 'participants',
  });
});

router.post('/sync', async (req, res) => {
  const days = toBoundedInt(req.body.days, { min: MIN_DAYS, max: MAX_DAYS });
  if (days === null) {
    return res.status(400).render('participants', {
      participants: listParticipants(),
      defaultDays: defaultDays(),
      syncResult: null,
      error: res.locals.t('sync_error_days'),
      active: 'participants',
    });
  }

  let syncResult = null;
  let error = null;
  try {
    const activeUsers = await fetchActiveUsers(days);
    syncResult = syncParticipants(activeUsers);
    syncResult.fetched = activeUsers.length;
    syncResult.days = days;
  } catch (e) {
    error = e.message;
  }
  const participants = listParticipants();
  res.render('participants', {
    participants,
    defaultDays: days,
    syncResult,
    error,
    active: 'participants',
  });
});

module.exports = router;
