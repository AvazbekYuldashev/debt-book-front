// ============================================================
//  Telefon raqamni yagona kanonik formatga keltiradi: 998XXXXXXXXX
//  Backenddagi SmsUtil.normalize(...) bilan AYNAN bir xil mantiq.
//  Hamma joyda (login, register, contact, member, money) shu ishlatilsin.
// ============================================================
export const normalizePhone = (value: string): string => {
  const digits = (value || '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('998')) return digits;
  if (digits.length === 10 && digits.startsWith('0')) return `998${digits.slice(1)}`;
  if (digits.length === 9) return `998${digits}`;
  return digits || (value || '').trim();
};

// Telefon raqam qoidasi (9 yoki 12 xona, 12 xona 998 bilan) BITTA joyda.
// Har bir chaqiruvchi qaytgan kodni o'zining xabari (i18n yoki matn)ga bog'laydi.
export type PhoneValidationError = 'empty' | 'length' | 'prefix' | null;

export const getPhoneValidationError = (value: string): PhoneValidationError => {
  const digits = (value || '').replace(/\D/g, '');
  if (!digits) return 'empty';
  if (digits.length !== 9 && digits.length !== 12) return 'length';
  if (digits.length === 12 && !digits.startsWith('998')) return 'prefix';
  return null;
};

/** Mahalliy (998siz) 9 xonali ko'rinishga keltiradi: input filterlash uchun. */
export const LOCAL_PHONE_DIGITS = 9;
export const sanitizeLocalPhone = (value: string): string => {
  let digits = (value || '').replace(/\D/g, '');
  if (digits.startsWith('998')) digits = digits.slice(3);
  return digits.slice(0, LOCAL_PHONE_DIGITS);
};

/**
 * Ko'rsatish uchun formatlaydi: 998XXXXXXXXX -> +998XXXXXXXXX.
 * Bo'sh bo'lsa emptyFallback qaytaradi (masalan '--' yoki '').
 */
export const formatPhoneDisplay = (value?: string, emptyFallback = ''): string => {
  if (!value) return emptyFallback;
  const digits = value.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('998')) return `+${digits}`;
  return value;
};
