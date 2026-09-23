import type { VoiceCurrency, VoiceIntent } from '../api/voice';

/**
 * Tushunilgan gapni oldi-berdi formasiga qo'yish qoidalari.
 *
 * ASOSIY QOIDA: ovoz FAQAT bo'sh maydonni to'ldiradi. Foydalanuvchi qo'lda
 * yozgan summani yoki tanlagan odamni ustidan yozib yuborish — eng yomon
 * xato turi, chunki u sezilmay qoladi. Odam "50 ming" deb yozgan bo'lsa va
 * keyin izohni aytsa, summasi o'zgarib ketganini saqlagandan keyin biladi.
 *
 * Saqlash tugmasi bosilmaydi: foydalanuvchi ko'rib, o'zi tasdiqlaydi.
 */

export interface TransactionFormState {
  amount: string;
  description: string;
  counterpartyId: string;
  /** Odam formada qo'lda tanlanadimi. `false` bo'lsa kontakt allaqachon qat'iy. */
  counterpartyEditable: boolean;
}

export interface TransactionFormPatch {
  description: string;
  amount?: string;
  currency?: VoiceCurrency;
  counterpartyId?: string;
}

const CURRENCIES: VoiceCurrency[] = ['UZS', 'USD', 'RUB'];

/**
 * @param format summani maydon ko'rinishiga keltiradi ("50000" -> "50 000")
 */
export function applyTransactionIntent(
  intent: VoiceIntent,
  current: TransactionFormState,
  format: (raw: string) => string,
): TransactionFormPatch {
  const patch: TransactionFormPatch = { description: intent.text ?? '' };

  const amount = intent.amount;
  if (!current.amount.trim() && typeof amount === 'number' && Number.isFinite(amount) && amount > 0) {
    patch.amount = format(String(amount));
  }

  // Valyuta summadan FARQLI o'laroq, tanlangan bo'lsa ham almashtiriladi.
  // Sabab: bu maydonda "bo'sh" holat yo'q — unda har doim odatiy qiymat
  // turadi (masalan dollar). Odam "so'm" deb AYTGAN bo'lsa, bu taxmin
  // emas, aniq ko'rsatma: uni e'tiborsiz qoldirish yozuvni noto'g'ri
  // valyutada saqlashga olib borardi.
  if (intent.currency && CURRENCIES.includes(intent.currency)) {
    patch.currency = intent.currency;
  }

  // Kontakt faqat BITTA aniq topilganda qo'yiladi. Ikkitasi mos kelgan
  // bo'lsa (AMBIGUOUS) hech narsa qilmaymiz — tanlovni odam qiladi, dastur
  // taxmin qilmaydi. Bu ovozli kiritishning eng xavfli joyi: qarz begona
  // odamning yozuviga tushib qolishi mumkin.
  if (
    current.counterpartyEditable &&
    !current.counterpartyId.trim() &&
    intent.contactOutcome === 'RESOLVED' &&
    intent.contactPartyId
  ) {
    patch.counterpartyId = intent.contactPartyId;
  }

  return patch;
}
