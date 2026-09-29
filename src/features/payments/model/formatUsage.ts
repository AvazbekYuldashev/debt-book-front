/**
 * Sarf ko'rsatkichlarini o'qiladigan matnga aylantirish.
 *
 * Sof funksiyalar: ekranga bog'liq emas, shuning uchun sinaladi.
 */

/**
 * Davomiylik: "12 soniya", "1 daq 05 son".
 *
 * Soniya BUTUNGA yaxlitlanadi - millisekund odamga hech narsa aytmaydi,
 * lekin "0 soniya" ham yozilmaydi: chaqiruv bo'lgan, demak vaqt ketgan.
 */
export const formatDuration = (ms: number): string => {
  const totalSeconds = Math.max(1, Math.round(ms / 1000));
  if (totalSeconds < 60) return `${totalSeconds} soniya`;

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes} daq ${String(seconds).padStart(2, '0')} son`;
};

/**
 * Summa: "75 so'm", "1 250 so'm".
 *
 * Tiyinlar TASHLANMAYDI, agar ular bo'lsa: 7.5 so'm/soniya hisobida
 * kasr qism tabiiy ravishda chiqadi va uni yashirish jamini
 * tushunarsiz qilardi.
 */
export const formatSum = (value: number): string => {
  const rounded = Math.round(value * 100) / 100;
  const whole = Math.trunc(rounded);
  const fraction = Math.round((rounded - whole) * 100);

  const grouped = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return fraction > 0
    ? `${grouped},${String(fraction).padStart(2, '0')} so'm`
    : `${grouped} so'm`;
};

/** Sana: "28.09.2026 20:45". */
export const formatWhen = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}`;
};
