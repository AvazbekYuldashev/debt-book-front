const crypto = require('crypto');
const db = require('../db');
const { listParticipants } = require('./participantsService');

const insertDrawStmt = db.prepare(`
  INSERT INTO draws (prize_count, created_at) VALUES (@prizeCount, @createdAt)
`);
const insertWinnerStmt = db.prepare(`
  INSERT INTO draw_winners (draw_id, profile_id, number, prize_rank, phone, name, surname)
  VALUES (@drawId, @profileId, @number, @prizeRank, @phone, @name, @surname)
`);

/** Fisher-Yates shuffle, crypto.randomInt bilan (kriptografik jihatdan xolis tasodifiylik). */
function shuffle(array) {
  const arr = array.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Ishtirokchilar orasidan random'da takrorlanmas g'oliblarni tanlab, draw yozuvini saqlaydi. */
function runDraw(prizeCount) {
  const participants = listParticipants();
  if (prizeCount < 1) {
    throw new Error('Mukofotlar soni kamida 1 bo\'lishi kerak');
  }
  if (participants.length === 0) {
    throw new Error('Ishtirokchilar ro\'yxati bo\'sh — avval sinxronlang');
  }
  if (prizeCount > participants.length) {
    throw new Error(`Mukofotlar soni (${prizeCount}) ishtirokchilar sonidan (${participants.length}) ko'p bo'la olmaydi`);
  }

  const winners = shuffle(participants).slice(0, prizeCount);
  const createdAt = new Date().toISOString();

  const tx = db.transaction(() => {
    const info = insertDrawStmt.run({ prizeCount, createdAt });
    const drawId = info.lastInsertRowid;
    winners.forEach((w, idx) => {
      insertWinnerStmt.run({
        drawId,
        profileId: w.profile_id,
        number: w.number,
        prizeRank: idx + 1,
        phone: w.phone,
        name: w.name,
        surname: w.surname,
      });
    });
    return drawId;
  });

  const drawId = tx();
  return { drawId, winners };
}

function listDraws() {
  return db.prepare(`SELECT * FROM draws ORDER BY id DESC`).all();
}

function getDrawWithWinners(drawId) {
  const draw = db.prepare(`SELECT * FROM draws WHERE id = ?`).get(drawId);
  if (!draw) return null;
  const winners = db.prepare(`SELECT * FROM draw_winners WHERE draw_id = ? ORDER BY prize_rank ASC`).all(drawId);
  return { draw, winners };
}

module.exports = { runDraw, listDraws, getDrawWithWinners };
