import { isPartial, periodSpend, perVoice } from '../spend';

/**
 * Bitta ovoz IKKI marta pul yeydi: audioni tanish (daqiqaga) va gapni
 * tushunish (tokenga). Ekranda ular qo'shiladi - foydalanuvchi uchun bu
 * bitta amal.
 */
describe('periodSpend', () => {
  it('tanish va tushunish qoshiladi', () => {
    expect(periodSpend(100, 20)).toBe(120);
  });

  /**
   * Tushunish narxi NULL bo'lishi mumkin: tarif sozlanmagan yoki Markaziy
   * bank kursi kelmagan. Unda butun karta nolga tushib ketmasligi kerak -
   * tanish narxi o'zi baribir ma'lum.
   */
  it('tushunish narxi yoq bolsa tanish qoladi', () => {
    expect(periodSpend(100, null)).toBe(100);
    expect(periodSpend(100, undefined)).toBe(100);
  });

  /** Nol "bepul" degani va u haqiqiy qiymat - yo'qlik bilan adashmasin. */
  it('nol tushunish narxi yoqlik emas', () => {
    expect(periodSpend(100, 0)).toBe(100);
    expect(isPartial(0)).toBe(false);
    expect(isPartial(null)).toBe(true);
    expect(isPartial(undefined)).toBe(true);
  });
});

/**
 * Bitta ovozning o'rtacha narxi: "bugun 1 ta ovoz uchun 120 so'm" degan
 * xulosa shundan chiqadi.
 */
describe('perVoice', () => {
  it('ortachani beradi', () => {
    expect(perVoice(360, 3)).toBe(120);
  });

  /** Hali gapirilmagan bo'lsa "0 so'm" yolg'on - hech narsa ko'rsatilmaydi. */
  it('ovoz yoq bolsa null', () => {
    expect(perVoice(0, 0)).toBeNull();
    expect(perVoice(100, 0)).toBeNull();
  });
});
