// ============================================================
//  Kalkulyatorda kiritilgan IFODANI yozuv izohi ichida saqlash.
//
//  NIMA UCHUN SHUNDAY: backend'da ifoda uchun alohida maydon YO'Q —
//  oldi-berdi DTO'sida faqat `description` bor. Shuning uchun ifoda
//  izohning oxiriga MAXSUS BELGILAR ichida qo'shiladi va ko'rsatishda
//  qaytadan ajratib olinadi. Foydalanuvchi hech qachon bu belgilarni
//  ko'rmaydi: izoh chiqadigan har bir joy `splitCalcNote` orqali o'tadi.
//
//  Ajratgich `⟪=` … `⟫` ATAYIN shunday tanlangan — bu belgilar telefon
//  klaviaturasida yo'q, ya'ni foydalanuvchi ularni tasodifan yozib,
//  o'z izohini "ifoda" qilib yubora olmaydi.
//
//  Backend maydon qo'shsa, shu fayl olib tashlanadi va `expression`
//  to'g'ridan-to'g'ri DTO'dan o'qiladi — qolgan kod o'zgarmaydi.
// ============================================================

const OPEN = '⟪=';
const CLOSE = '⟫';

/** Oxirgi qatordagi ifoda bloki. */
const PATTERN = /\n?⟪=([^⟫]*)⟫\s*$/;

/**
 * Ifodaning eng katta uzunligi.
 *
 * `description` backend'da cheklangan bo'lishi mumkin, ifoda esa uzun
 * bo'lib ketishi mumkin ("1000+2000+3000+…"). Izoh ifoda tufayli
 * kesilib qolmasin — juda uzun ifoda umuman saqlanmaydi.
 */
const MAX_EXPRESSION = 60;

/** Ifodada haqiqiy amal bormi (yakka son "amal" hisoblanmaydi). */
export const hasOperation = (expression: string): boolean =>
  /[+\-−*×/÷]/.test(expression.replace(/^-/, ''));

/**
 * Izohga ifodani biriktiradi.
 *
 * Ifoda bo'sh, amalsiz (yakka son) yoki juda uzun bo'lsa izoh
 * o'zgarishsiz qaytadi.
 */
export const attachCalcExpression = (note: string, expression: string | null): string => {
  const trimmedNote = note.trim();
  const expr = (expression ?? '').trim();
  if (!expr || !hasOperation(expr) || expr.length > MAX_EXPRESSION) return trimmedNote;
  const block = `${OPEN}${expr}${CLOSE}`;
  return trimmedNote ? `${trimmedNote}\n${block}` : block;
};

/**
 * Izohni foydalanuvchi matni va ifodaga ajratadi.
 *
 * Izoh chiqadigan HAR BIR joy shu funksiyadan o'tishi kerak, aks holda
 * ekranda `⟪=…⟫` ko'rinib qoladi.
 */
export const splitCalcNote = (
  raw: string | null | undefined,
): { note: string; expression: string | null } => {
  const text = (raw ?? '').trim();
  if (!text) return { note: '', expression: null };

  const match = PATTERN.exec(text);
  if (!match) return { note: text, expression: null };

  const expression = match[1].trim();
  const note = text.slice(0, match.index).trim();
  return { note, expression: expression || null };
};
