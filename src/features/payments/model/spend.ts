/**
 * Ovoz sarfining hisobi.
 *
 * Bitta ovoz IKKI marta pul yeydi: audioni tanish (daqiqaga to'lanadi) va
 * gapni tushunish (tokenga to'lanadi). Foydalanuvchi uchun esa bu bitta
 * amal - "shu ovoz menga shuncha turdi". Shuning uchun ekranda ular
 * qo'shiladi, ichida esa alohida qoladi.
 */

/**
 * Davr uchun umumiy sarf: tanish + tushunish.
 *
 * Tushunish narxi NULL bo'lishi mumkin - tarif yoki dollar kursi
 * yo'q. Unda faqat tanish qaytadi: yarim raqam noldan yaxshi, lekin
 * "to'liq emas" ekani `isPartial` bilan bilinadi.
 */
export const periodSpend = (stt: number, model: number | null | undefined): number =>
  stt + (typeof model === 'number' ? model : 0);

/** Tushunish narxi hisoblanmaganmi - ekranda shuni aytish uchun. */
export const isPartial = (model: number | null | undefined): boolean =>
  typeof model !== 'number';

/**
 * Bitta ovozning o'rtacha narxi.
 *
 * Nolga bo'lishdan saqlanadi: hali gapirilmagan bo'lsa null qaytadi va
 * ekranda umuman ko'rsatilmaydi - "0 so'm" degan yolg'on raqamdan ko'ra
 * hech narsa yaxshiroq.
 */
export const perVoice = (spend: number, count: number): number | null =>
  count > 0 ? spend / count : null;
