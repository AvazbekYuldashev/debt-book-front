// ============================================================
//  Kalkulyatorda kiritilgan IFODA ("10×2+55÷99").
//
//  Ifoda backend'da ALOHIDA ustunda saqlanadi (`money.calc_note`) —
//  izoh odam yozgan matn, ifoda esa hisob tarixi. Ularni bitta maydonga
//  qo'shish qidiruvni ham, eksportni ham buzardi.
//
//  Bu fayl ikki narsa uchun qoladi:
//    1. `hasOperation` — yakka sonni "amal" deb saqlab qo'ymaslik uchun;
//    2. `splitLegacyCalcNote` — QISQA MUDDAT ichida izoh ichiga yozilgan
//       eski yozuvlarni to'g'ri ko'rsatish uchun (pastga qarang).
// ============================================================

/**
 * ESKI USUL bilan yozilgan yozuvlar uchun ajratgich.
 *
 * `calc_note` ustuni paydo bo'lishidan oldin ifoda izohning oxiriga shu
 * belgilar ichida qo'shilardi. O'sha davrda yaratilgan yozuvlar bazada
 * qolgan — ularni endi FAQAT O'QIYMIZ, yangisini bu ko'rinishda hech
 * qachon yozmaymiz. Agar bu tozalansa (yoki migratsiya bilan ustunga
 * ko'chirilsa), shu funksiyani olib tashlash mumkin.
 */
const LEGACY_PATTERN = /\n?⟪=([^⟫]*)⟫\s*$/;

/** Ifodada haqiqiy amal bormi (yakka son "amal" hisoblanmaydi). */
export const hasOperation = (expression: string): boolean =>
  /[+\-−*×/÷]/.test(expression.replace(/^-/, ''));

/**
 * Izohni foydalanuvchi matni va (bo'lsa) ESKI USULDAGI ifodaga ajratadi.
 *
 * Yangi yozuvlarda ifoda izoh ichida bo'lmaydi — bunda `expression` null
 * qaytadi va izoh o'zgarishsiz o'tadi.
 */
export const splitLegacyCalcNote = (
  raw: string | null | undefined,
): { note: string; expression: string | null } => {
  const text = (raw ?? '').trim();
  if (!text) return { note: '', expression: null };

  const match = LEGACY_PATTERN.exec(text);
  if (!match) return { note: text, expression: null };

  const expression = match[1].trim();
  return { note: text.slice(0, match.index).trim(), expression: expression || null };
};

/**
 * Ko'rsatish uchun yakuniy juftlik: izoh va ifoda.
 *
 * Avval ALOHIDA ustunga qaraydi (yangi yozuvlar), u bo'sh bo'lsa izoh
 * ichidagi eski ko'rinishga tushadi. Shu sababli ikkala davrda yaratilgan
 * yozuv ham bir xil ko'rinadi va xizmat belgilari ekranga chiqmaydi.
 */
export const resolveCalcNote = (
  description: string | null | undefined,
  calcNote?: string | null,
): { note: string; expression: string | null } => {
  const legacy = splitLegacyCalcNote(description);
  const stored = (calcNote ?? '').trim();
  return { note: legacy.note, expression: stored || legacy.expression };
};
