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
