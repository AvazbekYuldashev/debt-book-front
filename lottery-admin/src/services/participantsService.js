const db = require('../db');

const insertStmt = db.prepare(`
  INSERT INTO participants (profile_id, number, phone, name, surname, first_seen_at, is_active)
  VALUES (@profileId, @number, @phone, @name, @surname, @firstSeenAt, 1)
`);
const reactivateStmt = db.prepare(`
  UPDATE participants SET phone = @phone, name = @name, surname = @surname, is_active = 1
  WHERE profile_id = @profileId
`);
const deactivateAllStmt = db.prepare(`UPDATE participants SET is_active = 0`);
const nextNumberStmt = db.prepare(`SELECT COALESCE(MAX(number), 0) + 1 AS next FROM participants`);
const existingIdsStmt = db.prepare(`SELECT profile_id FROM participants`);
const activeCountStmt = db.prepare(`SELECT COUNT(*) AS count FROM participants WHERE is_active = 1`);

/**
 * Debt-Book'dan kelgan (joriy davrda faol bo'lgan) foydalanuvchilar ro'yxatini sinxronlaydi.
 * Yangi profile_id'larga navbatdagi raqam beriladi va raqam doimiy saqlanadi.
 * Ushbu sinxronlashda qaytmagan (joriy davrda tranzaksiya qilmagan) foydalanuvchilar
 * "nofaol" deb belgilanadi — ro'yxatda va viktorinada ko'rinmaydi, lekin raqami yo'qolmaydi
 * (keyingi safar yana faol bo'lsa, xuddi shu raqam bilan qaytadi).
 */
function syncParticipants(activeUsers) {
  const existingIds = new Set(existingIdsStmt.all().map((r) => r.profile_id));
  const now = new Date().toISOString();

  const tx = db.transaction((users) => {
    deactivateAllStmt.run();
    let added = 0;
    for (const u of users) {
      if (existingIds.has(u.profileId)) {
        reactivateStmt.run({ profileId: u.profileId, phone: u.phone, name: u.name, surname: u.surname });
        continue;
      }
      const number = nextNumberStmt.get().next;
      insertStmt.run({
        profileId: u.profileId,
        number,
        phone: u.phone,
        name: u.name,
        surname: u.surname,
        firstSeenAt: now,
      });
      existingIds.add(u.profileId);
      added += 1;
    }
    return added;
  });

  const added = tx(activeUsers);
  return { added, total: activeCountStmt.get().count };
}

/** Faqat joriy davrda faol (oxirgi sinxronlashda qaytgan) ishtirokchilar — ro'yxat va viktorina uchun. */
function listParticipants() {
  return db.prepare(`SELECT * FROM participants WHERE is_active = 1 ORDER BY number ASC`).all();
}

module.exports = { syncParticipants, listParticipants };
