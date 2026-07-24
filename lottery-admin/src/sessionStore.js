const session = require('express-session');
const db = require('./db');

/**
 * Sessiyalarni SQLite'da saqlaydigan store (yangi npm paketsiz — mavjud
 * better-sqlite3 ustiga yozilgan).
 *
 * Nima uchun: standart MemoryStore (a) xizmat qayta ishga tushganda hamma
 * sessiyani yo'qotadi, (b) juda ko'p so'rov kelsa xotirani to'ldirib
 * xizmatni yiqitish uchun vosita bo'la oladi (DoS).
 */

db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    sid TEXT PRIMARY KEY,
    expires_at INTEGER NOT NULL,
    data TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
`);

const selectStmt = db.prepare(`SELECT data, expires_at FROM sessions WHERE sid = ?`);
const upsertStmt = db.prepare(`
  INSERT INTO sessions (sid, expires_at, data) VALUES (@sid, @expiresAt, @data)
  ON CONFLICT(sid) DO UPDATE SET expires_at = excluded.expires_at, data = excluded.data
`);
const touchStmt = db.prepare(`UPDATE sessions SET expires_at = @expiresAt WHERE sid = @sid`);
const deleteStmt = db.prepare(`DELETE FROM sessions WHERE sid = ?`);
const purgeStmt = db.prepare(`DELETE FROM sessions WHERE expires_at <= ?`);
const clearStmt = db.prepare(`DELETE FROM sessions`);
const countStmt = db.prepare(`SELECT COUNT(*) AS count FROM sessions WHERE expires_at > ?`);

const DEFAULT_TTL_MS = 1000 * 60 * 60 * 12;
const PURGE_EVERY_MS = 10 * 60 * 1000;

function expiryOf(sess) {
  const cookieExpires = sess && sess.cookie && sess.cookie.expires;
  if (cookieExpires) return new Date(cookieExpires).getTime();
  return Date.now() + DEFAULT_TTL_MS;
}

class SqliteSessionStore extends session.Store {
  constructor() {
    super();
    const timer = setInterval(() => {
      try {
        purgeStmt.run(Date.now());
      } catch (e) {
        console.error('[session] eskirganlarni tozalashda xato', e);
      }
    }, PURGE_EVERY_MS);
    if (typeof timer.unref === 'function') timer.unref();
  }

  get(sid, callback) {
    try {
      const row = selectStmt.get(sid);
      if (!row) return callback(null, null);
      if (row.expires_at <= Date.now()) {
        deleteStmt.run(sid);
        return callback(null, null);
      }
      return callback(null, JSON.parse(row.data));
    } catch (e) {
      // Buzilgan yozuv sessiyani "yo'q" deb hisoblanadi — xizmat yiqilmasin.
      return callback(null, null);
    }
  }

  set(sid, sess, callback) {
    try {
      upsertStmt.run({ sid, expiresAt: expiryOf(sess), data: JSON.stringify(sess) });
      return callback(null);
    } catch (e) {
      return callback(e);
    }
  }

  touch(sid, sess, callback) {
    try {
      touchStmt.run({ sid, expiresAt: expiryOf(sess) });
      return callback(null);
    } catch (e) {
      return callback(e);
    }
  }

  destroy(sid, callback) {
    try {
      deleteStmt.run(sid);
      return callback(null);
    } catch (e) {
      return callback(e);
    }
  }

  clear(callback) {
    try {
      clearStmt.run();
      return callback(null);
    } catch (e) {
      return callback(e);
    }
  }

  length(callback) {
    try {
      return callback(null, countStmt.get(Date.now()).count);
    } catch (e) {
      return callback(e);
    }
  }
}

module.exports = SqliteSessionStore;
