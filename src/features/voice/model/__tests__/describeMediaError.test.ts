import { describeMediaError } from '../describeMediaError';

/**
 * `getUserMedia` yiqilishining sababi.
 *
 * Uchala holat ham tashqaridan BIR XIL ko'rinadi — "brauzer ruxsat
 * so'ramayapti" — lekin yechimi boshqa. Mikrofonsiz kompyuterda "sozlamadan
 * ruxsat bering" deb aytish odamni bekorga sarson qiladi: u yerda hech
 * qanday ruxsat sozlamasi yo'q.
 */
describe('describeMediaError', () => {
  it('mikrofon yo\'q qurilmani alohida ajratadi', () => {
    // Bu holatda brauzer ruxsat SO'RAMAYDI — ruxsat haqida gapirish xato.
    expect(describeMediaError('NotFoundError', 'prompt')).toBe('voice.noMicrophone');
    expect(describeMediaError('DevicesNotFoundError', 'unknown')).toBe('voice.noMicrophone');
  });

  /** Qurilma yo'qligi ruxsat holatidan USTUN: "denied" bo'lsa ham. */
  it('qurilma yo\'qligi ruxsat holatidan ustun', () => {
    expect(describeMediaError('NotFoundError', 'denied')).toBe('voice.noMicrophone');
  });

  it('band mikrofon uchun boshqa maslahat', () => {
    expect(describeMediaError('NotReadableError', 'granted')).toBe('voice.micBusy');
    expect(describeMediaError('TrackStartError', 'granted')).toBe('voice.micBusy');
  });

  /** Bloklangan bo'lsa brauzer qayta so'ramaydi — sozlamadan ochish kerak. */
  it('bloklangan ruxsatni ajratadi', () => {
    expect(describeMediaError('NotAllowedError', 'denied')).toBe('voice.permissionBlocked');
  });

  it('hozir rad etilgan ruxsat — qayta urinib ko\'rish mumkin', () => {
    expect(describeMediaError('NotAllowedError', 'prompt')).toBe('voice.permissionDenied');
    expect(describeMediaError('PermissionDeniedError', 'unknown')).toBe('voice.permissionDenied');
    expect(describeMediaError('SecurityError', 'prompt')).toBe('voice.permissionDenied');
  });

  it('noma\'lum xato umumiy xabarga tushadi', () => {
    expect(describeMediaError('AbortError', 'granted')).toBe('voice.failed');
    expect(describeMediaError('', 'unknown')).toBe('voice.failed');
  });
});
