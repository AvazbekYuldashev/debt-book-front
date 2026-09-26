import type { VoiceCurrency, VoiceDirection, VoiceGapMember, VoiceIntent } from '../api/voice';

/**
 * Gap kassada aytilgan gapdan keyin nima qilish kerakligini hal qiladi.
 *
 * Qarzlar bo'limidagi hal qiluvchidan ALOHIDA turadi, chunki nishon
 * boshqa: u yerda kontakt, bu yerda kassa a'zosi va uning kassasi. Bitta
 * funksiyaga siqilsa, ikki bo'limning qoidalari bir-birini buzardi.
 *
 * Sof funksiya: navigatsiya ham, holat ham bu yerda yo'q. Eng xavfli
 * holat ("ikkita Sardor") aynan shu yerda to'xtatiladi.
 */

export interface GapVoicePrefill {
  amount?: number;
  direction?: VoiceDirection;
  currency?: VoiceCurrency;
  note?: string;
}

export type GapVoiceCommand =
  /** A'zo aniq — o'sha odamning ekraniga o'tamiz. */
  | { kind: 'OPEN_MEMBER'; member: VoiceGapMember; prefill: GapVoicePrefill }
  /** Bir nechta a'zo mos keldi — TANLOVNI ODAM QILADI. */
  | { kind: 'CHOOSE_MEMBER'; options: VoiceGapMember[]; prefill: GapVoicePrefill }
  /** Kim haqida gapirilgani aniqlanmadi. */
  | { kind: 'NO_MEMBER'; prefill: GapVoicePrefill };

function prefillOf(intent: VoiceIntent): GapVoicePrefill {
  const amount = intent.amount;
  return {
    amount: typeof amount === 'number' && Number.isFinite(amount) && amount > 0 ? amount : undefined,
    // Yo'nalish AYTILMAGAN bo'lishi mumkin. Bu xato emas: a'zo ekranida
    // "Oldim" va "Berdim" tugmalari turadi va tanlovni odam qiladi -
    // summa esa o'sha tugmani bosgach formaga tushadi.
    direction: intent.direction ?? undefined,
    currency: intent.currency ?? undefined,
    note: intent.text?.trim() || undefined,
  };
}

export function resolveGapCommand(intent: VoiceIntent): GapVoiceCommand {
  const prefill = prefillOf(intent);

  // Bir nechta mos kelgan a'zo — birinchisini OLMAYMIZ. Kassada pul
  // begona odamning hisobiga tushib qolsa, uni keyin topish qiyin.
  if (intent.gapOutcome === 'AMBIGUOUS') {
    const options = intent.gapOptions ?? [];
    if (options.length > 0) return { kind: 'CHOOSE_MEMBER', options, prefill };
    return { kind: 'NO_MEMBER', prefill };
  }

  if (intent.gapOutcome === 'RESOLVED' && intent.gapMember?.memberId) {
    return { kind: 'OPEN_MEMBER', member: intent.gapMember, prefill };
  }

  return { kind: 'NO_MEMBER', prefill };
}
