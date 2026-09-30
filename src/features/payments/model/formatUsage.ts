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

  // Ishora ALOHIDA ajratiladi. Manfiy sonda `Math.trunc` nolga qarab
  // kesadi va kasr qism manfiy chiqadi: -614.91 da tiyin -91 bo'lib,
  // "noldan katta" shartidan o'tmay tushib qolardi. Balans qarzda
  // bo'lganda ekranda "-614" turardi, sarf esa "614,91" - bir xil pul,
  // ikki xil raqam.
  const negative = rounded < 0;
  const abs = Math.abs(rounded);

  const whole = Math.trunc(abs);
  const fraction = Math.round((abs - whole) * 100);

  const grouped = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const body = fraction > 0
    ? `${grouped},${String(fraction).padStart(2, '0')} so'm`
    : `${grouped} so'm`;

  return negative ? `-${body}` : body;
};

/** Sana: "28.09.2026 20:45". */
export const formatWhen = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}`;
};
