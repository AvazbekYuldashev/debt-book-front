/**
 * Ovoz sarfining hisobi.
 *
 * Bitta ovoz IKKI marta pul yeydi: audioni tanish (daqiqaga to'lanadi) va
 * gapni tushunish (tokenga to'lanadi). Ikkalasi ham bitta ustunda, SO'MDA
 * saqlanadi - shuning uchun serverdan kelgan davr summasi ALLAQACHON
 * to'liq. Bu yerda qo'shish yo'q: qo'shsak ikki marta sanalardi.
 */

/**
 * Umumiy summaning tushunishga ketgan ULUSHI qancha foiz.
 *
 * Ko'rsatish uchun: "900 so'm, shundan 310 so'm tushunishga". Jami nol
 * bo'lsa null - "0%" degan yolg'on raqamdan ko'ra hech narsa yaxshiroq.
 */
export const modelShare = (total: number, model: number): number | null =>
  total > 0 ? model / total : null;

/**
 * Bitta ovozning o'rtacha narxi.
 *
 * Nolga bo'lishdan saqlanadi: hali gapirilmagan bo'lsa null qaytadi va
 * ekranda umuman ko'rsatilmaydi - "0 so'm" degan yolg'on raqamdan ko'ra
 * hech narsa yaxshiroq.
 */
export const perVoice = (spend: number, count: number): number | null =>
  count > 0 ? spend / count : null;

/** Model tarifi: 1 million token uchun dollarda, va dollar kursi. */
export interface ModelPricing {
  inputPerMillion: number;
  outputPerMillion: number;
  usdRate: number;
  /** Qaysi model tarifi - "Claude Opus 5". */
  label: string;
}

/**
 * Tokenlarning SO'MDAGI narxi.
 *
 * Qatorda faqat umumiy narx saqlanadi, tafsilotda esa kirish va chiqish
 * alohida ko'rsatiladi - shuning uchun bu yerda qayta hisoblanadi.
 * Tarif ham, kurs ham serverdan keladi: ilovada qotirilsa, eski
 * o'rnatilgan nusxalar eskirgan raqam ko'rsatardi.
 */
export const tokenCost = (
  tokens: number,
  perMillionUsd: number,
  usdRate: number,
): number => (tokens * perMillionUsd * usdRate) / 1_000_000;

/**
 * Bitta ovozning TO'LIQ narxi: tanish + tushunish.
 *
 * Yangi yozuvlarda ikkala narx ham qatorning o'zida so'mda saqlanadi va
 * shunchaki qo'shiladi. ESKI yozuvlarda tushunish narxi nol - ular tarif
 * sozlanmagan paytda yozilgan; unda tokenlardan bugungi tarif bilan
 * qayta hisoblanadi.
 *
 * Modal ham, ro'yxat qatori ham SHU funksiyadan o'qiydi: ikki joyda ikki
 * xil raqam chiqsa, qaysi biri to'g'ri ekani bilinmasdi.
 */
export const commandCost = (
  command: {
    stt?: { cost: number } | null;
    model?: { cost: number; promptTokens: number; completionTokens: number } | null;
  },
  pricing: ModelPricing | null | undefined,
): { stt: number; model: number; total: number } => {
  const stt = command.stt?.cost ?? 0;
  const model = command.model
    ? command.model.cost > 0
      ? command.model.cost
      : pricing
        ? tokenCost(command.model.promptTokens, pricing.inputPerMillion, pricing.usdRate)
          + tokenCost(command.model.completionTokens, pricing.outputPerMillion, pricing.usdRate)
        : 0
    : 0;
  return { stt, model, total: stt + model };
};
