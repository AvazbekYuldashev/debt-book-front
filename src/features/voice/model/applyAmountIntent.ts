import type { VoiceIntent } from '../api/voice';

/**
 * "Summa + izoh" ko'rinishidagi oddiy formalar uchun qoidalar.
 *
 * Kunlik xarajat va gap to'yona shunday: valyuta ham, qarama-qarshi tomon
 * ham yo'q — faqat qancha va nima uchun.
 *
 * Oldi-berdi formasidagi bilan BIR XIL qoida: qo'lda yozilgan summa
 * ustidan yozilmaydi. Bu xato sezilmay qoladi — odam saqlagandan keyin
 * biladi.
 */

export interface AmountFormState {
  amount: string;
  note: string;
}

export interface AmountFormPatch {
  note: string;
  amount?: string;
}

export function applyAmountIntent(
  intent: VoiceIntent,
  current: AmountFormState,
  format: (raw: string) => string,
): AmountFormPatch {
  const patch: AmountFormPatch = { note: intent.text ?? '' };

  const amount = intent.amount;
  if (
    !current.amount.trim() &&
    typeof amount === 'number' &&
    Number.isFinite(amount) &&
    amount > 0
  ) {
    patch.amount = format(String(amount));
  }
  return patch;
}
