const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const dataDir = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(dataDir, 'lottery.sqlite'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS participants (
    profile_id TEXT PRIMARY KEY,
    number INTEGER UNIQUE NOT NULL,
    phone TEXT,
    name TEXT,
    surname TEXT,
    first_seen_at TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS draws (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prize_count INTEGER NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS draw_winners (
    draw_id INTEGER NOT NULL,
    profile_id TEXT NOT NULL,
    number INTEGER NOT NULL,
    prize_rank INTEGER NOT NULL,
    phone TEXT,
    name TEXT,
    surname TEXT,
    FOREIGN KEY (draw_id) REFERENCES draws(id)
  );

  CREATE TABLE IF NOT EXISTS admin (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    username TEXT NOT NULL,
    password_hash TEXT NOT NULL
  );
`);

// Eski bazalarda (is_active ustuni qo'shilishidan oldin yaratilgan) ustunni qo'shib qo'yamiz.
const participantColumns = db.prepare(`PRAGMA table_info(participants)`).all().map((c) => c.name);
if (!participantColumns.includes('is_active')) {
  db.exec(`ALTER TABLE participants ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1`);
}

// Birinchi ishga tushishda .env'dagi admin ma'lumotlari bilan boshlang'ich qator yaratiladi.
// Shundan keyin admin login/parol shu jadvalda saqlanadi (ilova ichidan o'zgartiriladi).
const seedAdmin = db.prepare(`
  INSERT INTO admin (id, username, password_hash)
  SELECT 1, ?, ?
  WHERE NOT EXISTS (SELECT 1 FROM admin WHERE id = 1)
`);
if (process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD_HASH) {
  seedAdmin.run(process.env.ADMIN_USERNAME, process.env.ADMIN_PASSWORD_HASH);
}

module.exports = db;
