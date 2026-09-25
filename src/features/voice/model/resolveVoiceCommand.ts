import type {
  VoiceCurrency,
  VoiceDirection,
  VoiceIntent,
  VoiceItem,
  VoiceSettlement,
} from '../api/voice';

/**
 * Aytilgan gapdan keyin nima qilish kerakligini hal qiladi.
 *
 * Sof funksiya: navigatsiya ham, holat ham bu yerda yo'q. Sabab — qaror
 * qoidalari testdan o'tishi kerak. Eng xavfli holat ("ikkita Ali") aynan shu
 * yerda to'xtatiladi, shuning uchun uni ekran kodiga aralashtirib yuborish
 * mumkin emas.
 */

export interface VoiceCommandPrefill {
  amount?: number;
  direction?: VoiceDirection;
  currency?: VoiceCurrency;
  note?: string;
  /**
   * Narxnoma qatorlari.
   *
   * Bular ham olib o'tilishi SHART. Ilgari bu yerda faqat summa bor edi:
   * yuqori paneldagi tugma bilan gapirilganda chek qatorlari jimgina
   * tushib qolardi va yozuv "28 000 so'm" bo'lib saqlanardi — nima
   * sotib olingani ko'rinmasdi.
   */
  items?: VoiceItem[];
  calcNote?: string;
  /**
   * Bir nechta valyutadagi ochiq qoldiq. Birinchisi yuqoridagi
   * `amount`/`currency`da, qolganlari shu yerda navbatini kutadi.
   */
  settlements?: VoiceSettlement[];
}

export type VoiceCommand =
  /** Kontakt ham, yo'nalish ham aniq — to'g'ridan-to'g'ri oynani ochamiz. */
  | { kind: 'OPEN_CONTACT'; contactId: string; prefill: VoiceCommandPrefill }
  /** Kontakt aniq, lekin berdimmi-oldimmi noma'lum — odamdan so'raymiz. */
  | { kind: 'ASK_DIRECTION'; contactId: string; prefill: VoiceCommandPrefill }
  /** Bir nechta odam mos keldi — TANLOVNI ODAM QILADI. */
  | { kind: 'CHOOSE_CONTACT'; prefill: VoiceCommandPrefill }
  /** Kim haqida gapirilgani aniqlanmadi. */
  | { kind: 'NO_CONTACT'; prefill: VoiceCommandPrefill };

function prefillOf(intent: VoiceIntent): VoiceCommandPrefill {
  const amount = intent.amount;
  return {
    amount: typeof amount === 'number' && Number.isFinite(amount) && amount > 0 ? amount : undefined,
    direction: intent.direction ?? undefined,
    currency: intent.currency ?? undefined,
    note: intent.text?.trim() || undefined,
    items: intent.items?.length ? intent.items : undefined,
    calcNote: intent.calcNote || undefined,
    settlements: intent.settlements?.length ? intent.settlements : undefined,
  };
}

export function resolveVoiceCommand(intent: VoiceIntent): VoiceCommand {
  const prefill = prefillOf(intent);

  // Bir nechta mos kelgan odam — birinchisini OLMAYMIZ. Ovozli kiritishning
  // eng xavfli joyi shu: qarz begona odamning yozuviga tushib qolishi mumkin,
  // va buni keyin topish qiyin.
  if (intent.contactOutcome === 'AMBIGUOUS') {
    return { kind: 'CHOOSE_CONTACT', prefill };
  }

  if (intent.contactOutcome === 'RESOLVED' && intent.contactId) {
    return prefill.direction
      ? { kind: 'OPEN_CONTACT', contactId: intent.contactId, prefill }
      : { kind: 'ASK_DIRECTION', contactId: intent.contactId, prefill };
  }

  return { kind: 'NO_CONTACT', prefill };
}
