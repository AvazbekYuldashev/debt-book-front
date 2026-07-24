const express = require('express');
const basePath = require('../basePath');
const { fetchUsers, updateUserStatus, buildAttachUrl } = require('../services/debtBookClient');
const { toSafeText } = require('../lib/validate');

const router = express.Router();

// Panel orqali qo'yish mumkin bo'lgan holatlar (backend ham shu ro'yxatni tekshiradi).
const MANAGEABLE_STATUSES = ['ACTIVE', 'IN_REGISTRATION', 'BLOCK'];
// Filtrda ko'rsatiladigan holatlar (NOT_REGISTERED — tizim holati, qo'lda qo'yilmaydi).
const FILTER_STATUSES = ['ACTIVE', 'IN_REGISTRATION', 'BLOCK', 'NOT_REGISTERED'];

const MAX_SEARCH_LENGTH = 60;
const PROFILE_ID_PATTERN = /^[0-9a-fA-F-]{10,64}$/;

/** Ro'yxatni yuklab, sahifani chizadi (xato bo'lsa ham sahifa ochiladi). */
async function renderList(req, res, extra) {
  const status = FILTER_STATUSES.includes(req.query.status) ? req.query.status : '';
  const search = toSafeText(req.query.search, { maxLength: MAX_SEARCH_LENGTH }).trim();

  let users = [];
  let error = (extra && extra.error) || null;
  try {
    users = await fetchUsers({ status, search });
  } catch (e) {
    error = error || e.message;
  }

  const counts = users.reduce((acc, user) => {
    const key = user.status || 'NOT_REGISTERED';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  res.render('members', {
    users: users.map((user) => Object.assign({}, user, { photoUrl: buildAttachUrl(user.photoId) })),
    counts,
    filterStatus: status,
    search,
    statuses: MANAGEABLE_STATUSES,
    filterStatuses: FILTER_STATUSES,
    error,
    success: (extra && extra.success) || null,
    active: 'members',
  });
}

router.get('/', async (req, res) => {
  await renderList(req, res, null);
});

router.post('/status', async (req, res) => {
  const profileId = String(req.body.profileId || '').trim();
  const status = String(req.body.status || '').trim().toUpperCase();
  const t = res.locals.t;

  if (!PROFILE_ID_PATTERN.test(profileId) || !MANAGEABLE_STATUSES.includes(status)) {
    return renderList(req, res, { error: t('members_error_invalid') });
  }

  try {
    await updateUserStatus(profileId, status);
    console.info(`[audit] foydalanuvchi holati o'zgartirildi: id=${profileId} status=${status} ip=${req.ip}`);
    return renderList(req, res, { success: t('members_status_changed', { status: t('status_' + status) }) });
  } catch (e) {
    return renderList(req, res, { error: e.message });
  }
});

module.exports = router;
