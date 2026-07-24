const API_URL = process.env.DEBT_BOOK_API_URL;
const INTERNAL_KEY = process.env.DEBT_BOOK_INTERNAL_KEY;

/** Debt-Book backendidan so'nggi N kun ichida faol foydalanuvchilar ro'yxatini oladi. */
async function fetchActiveUsers(days) {
  const url = `${API_URL}/active-users?days=${encodeURIComponent(days)}`;
  const res = await fetch(url, {
    headers: { 'X-Internal-Key': INTERNAL_KEY },
  });
  if (!res.ok) {
    throw new Error(`Debt-Book API xatosi: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

module.exports = { fetchActiveUsers };
