/**
 * Mikrofon ruxsatining holati.
 *
 * NEGA OLDINDAN TEKSHIRAMIZ: ruxsat bir marta rad etilgan bo'lsa, brauzer
 * keyingi safar SO'RAMAYDI — `getUserMedia` darhol xato qaytaradi. Tashqaridan
 * bu "tugma ishlamayapti" bo'lib ko'rinadi. Holatni oldindan bilsak,
 * foydalanuvchiga nima qilish kerakligini aytib bera olamiz.
 */

export type MicPermission = 'granted' | 'denied' | 'prompt' | 'unknown';

type PermissionsLike = {
  query: (descriptor: { name: string }) => Promise<{ state: string }>;
};

/**
 * @param permissions test uchun almashtirib bo'ladigan manba; berilmasa
 *                    brauzernikidan olinadi.
 */
export async function micPermission(permissions?: PermissionsLike | null): Promise<MicPermission> {
  const api =
    permissions ??
    (typeof navigator !== 'undefined'
      ? ((navigator as unknown as { permissions?: PermissionsLike }).permissions ?? null)
      : null);

  // Permissions API hamma joyda yo'q (Safari'da mikrofon uchun qo'llab
  // -quvvatlanmaydi). Bu XATO EMAS: shunda oddiy yo'l bilan so'raymiz.
  if (!api?.query) return 'unknown';

  try {
    const result = await api.query({ name: 'microphone' });
    if (result.state === 'granted' || result.state === 'denied' || result.state === 'prompt') {
      return result.state;
    }
    return 'unknown';
  } catch {
    // Ba'zi brauzerlar noma'lum nomga istisno ko'taradi.
    return 'unknown';
  }
}
