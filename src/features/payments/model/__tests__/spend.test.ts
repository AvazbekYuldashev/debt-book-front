import { modelShare, perVoice } from '../spend';

/**
 * Bitta ovoz IKKI marta pul yeydi: audioni tanish (daqiqaga to'lanadi) va
 * gapni tushunish (tokenga). Ikkalasi ham bitta ustunda, SO'MDA saqlanadi,
 * shuning uchun serverdan kelgan summa ALLAQACHON to'liq - bu yerda
 * qo'shish yo'q, faqat ulushni ajratish.
 */
describe('modelShare', () => {
  it('ulush foizini beradi', () => {
    expect(modelShare(1000, 250)).toBe(0.25);
  });

  /** Jami nol bo'lsa "0%" yolg'on - hech narsa ko'rsatilmaydi. */
  it('jami nol bolsa null', () => {
    expect(modelShare(0, 0)).toBeNull();
  });

  /** Eski yozuvlarda tushunish narxi yozilmagan - ulush nol, lekin mavjud. */
  it('tushunish nol bolsa nol ulush', () => {
    expect(modelShare(1000, 0)).toBe(0);
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
