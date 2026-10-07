import type { VoiceCommand } from './voiceCommand';

/**
 * Ovoz yaratgan amalni ochish qarori.
 *
 * Sof funksiya: qayerga borishni hal qiladi, borishni esa ekran
 * bajaradi. Shu sababli qaror React'siz va navigatsiyasiz sinaladi.
 *
 * Sarf tarixi PROFIL bo'limida, amallar esa boshqa bo'limlarda turadi -
 * o'tish tablar aro bo'ladi (bildirishnoma qo'ng'irog'i ham shunday).
 */
export type OpenCommand =
  /** Tranzaksiyaning O'Z ekrani yo'q: u kontakt TARIXINING bir qatori. */
  | { kind: 'CONTACT'; id: string }
  | { kind: 'EXPENSE_CATEGORY'; id: string; name: string }
  /**
   * Gap kassasining tafsilot ekrani OLTITA parametr talab qiladi
   * (birlik turi, o'lchov nomi, tashkilotchimi...). Ularni havolada
   * saqlash havolani yozuvning eskiradigan nusxasiga aylantirardi,
   * shuning uchun bo'limning o'zi ochiladi.
   */
  | { kind: 'GAP_LIST' }
  | null;

export const openTarget = (target: VoiceCommand['target']): OpenCommand => {
  if (!target || !target.id) return null;

  switch (target.type) {
    case 'TRANSACTION':
      return { kind: 'CONTACT', id: target.id };
    case 'EXPENSE':
      return { kind: 'EXPENSE_CATEGORY', id: target.id, name: target.label ?? '' };
    case 'GAP':
      return { kind: 'GAP_LIST' };
    default:
      return null;
  }
};
