const API_URL = process.env.DEBT_BOOK_API_URL;
const INTERNAL_KEY = process.env.DEBT_BOOK_INTERNAL_KEY;

const REQUEST_TIMEOUT_MS = 15000;

/** Ichki API'ga so'rov: kalit sarlavhasi + timeout (backend javob bermay qolsa osilib qolmaslik uchun). */
async function request(path, options) {
  const opts = options || {};
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method: opts.method || 'GET',
      headers: Object.assign({ 'X-Internal-Key': INTERNAL_KEY }, opts.headers || {}),
      body: opts.body,
      signal: controller.signal,
    });
    if (!res.ok) {
      let detail = '';
      try {
        const text = await res.text();
        detail = text ? ` — ${text.slice(0, 200)}` : '';
      } catch (e) { /* javobni o'qib bo'lmadi — statusning o'zi yetarli */ }
      throw new Error(`Debt-Book API xatosi: ${res.status} ${res.statusText}${detail}`);
    }
    return res.status === 204 ? null : res.json();
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('Debt-Book API javob bermadi (timeout)');
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

/** Debt-Book backendidan so'nggi N kun ichida faol foydalanuvchilar ro'yxatini oladi. */
async function fetchActiveUsers(days) {
  return request(`/active-users?days=${encodeURIComponent(days)}`);
}

/** Barcha foydalanuvchilar (a'zolar) — ixtiyoriy status va qidiruv filtri bilan. */
async function fetchUsers({ status, search } = {}) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (search) params.set('search', search);
  const query = params.toString();
  return request(`/users${query ? `?${query}` : ''}`);
}

/** Foydalanuvchi holatini o'zgartiradi (ACTIVE / IN_REGISTRATION / BLOCK). */
async function updateUserStatus(profileId, status) {
  return request(`/users/${encodeURIComponent(profileId)}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
}

/**
 * Profil rasmlarining bazaviy manzili.
 *
 * MUHIM: server .env da API manzili ICHKI bo'ladi (http://127.0.0.1:8080/...) —
 * bunday havola foydalanuvchi brauzeridan OCHILMAYDI. Shuning uchun:
 *  - ichki (localhost/127.0.0.1) bo'lsa → nisbiy `/api/v1` ishlatamiz
 *    (panel va API bitta domenda, Apache /api ni backendga uzatadi);
 *  - tashqi domen bo'lsa → o'sha domendan quramiz;
 *  - ATTACH_BASE_URL berilgan bo'lsa — hammasidan ustun (lokal ishlab chiqish uchun).
 */
function resolveAttachBase() {
  const override = (process.env.ATTACH_BASE_URL || '').trim().replace(/\/$/, '');
  if (override) return override;
  try {
    const url = new URL(API_URL);
    const internal = url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '::1';
    return internal ? '/api/v1' : `${url.origin}/api/v1`;
  } catch (e) {
    return '/api/v1';
  }
}

const ATTACH_BASE = resolveAttachBase();

/** Profil rasmi URL'i: `<base>/attach/open/<photoId>`. */
function buildAttachUrl(photoId) {
  const id = (photoId || '').trim();
  if (!id) return '';
  return `${ATTACH_BASE}/attach/open/${encodeURIComponent(id)}`;
}

module.exports = { fetchActiveUsers, fetchUsers, updateUserStatus, buildAttachUrl };
