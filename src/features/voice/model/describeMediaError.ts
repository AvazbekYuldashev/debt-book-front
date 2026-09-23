import type { MicPermission } from './micPermission';

/**
 * `getUserMedia` yiqilganda SABABINI aniqlaydi.
 *
 * Uch xil sabab uchun uch xil yo'l bor va ularni bitta xabarga yig'ish
 * foydalanuvchini noto'g'ri yo'ldan olib ketadi:
 *
 *  - mikrofon YO'Q (masalan mikrofonsiz kompyuter) — brauzer ruxsat ham
 *    so'ramaydi, shuning uchun "ruxsat bering" deyish ma'nosiz;
 *  - ruxsat BLOKLANGAN — brauzer qayta so'ramaydi, sozlamadan ochish kerak;
 *  - ruxsat hozir rad etildi — qayta bosib "Ruxsat berish" ni tanlash yetarli.
 *
 * Sof funksiya: `DOMException` nomi va ruxsat holati kiradi, tarjima kaliti
 * chiqadi.
 */
export function describeMediaError(errorName: string, permission: MicPermission): string {
  // Qurilma yo'q: eng chalkashtiradigan holat, chunki tashqaridan u
  // "brauzer so'ramayapti" bo'lib ko'rinadi.
  if (errorName === 'NotFoundError' || errorName === 'DevicesNotFoundError') {
    return 'voice.noMicrophone';
  }

  // Mikrofon band (boshqa dastur egallagan) yoki tizim darajasida ishlamayapti.
  if (errorName === 'NotReadableError' || errorName === 'TrackStartError') {
    return 'voice.micBusy';
  }

  if (permission === 'denied') return 'voice.permissionBlocked';

  if (
    errorName === 'NotAllowedError' ||
    errorName === 'PermissionDeniedError' ||
    errorName === 'SecurityError'
  ) {
    return 'voice.permissionDenied';
  }

  return 'voice.failed';
}
