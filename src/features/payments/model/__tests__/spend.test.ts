import { modelShare, perVoice , tokenRatePerThousand } from '../spend';

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

/**
 * E'lon qilinadigan TOKEN tarifi.
 *
 * Ekranda "1000 token - 118 so'm" turadi, serverdan esa tarif dollarda
 * va 1 million token uchun keladi. Foydalanuvchi aynan shu raqamni
 * qo'lda tekshiradi (ilgari ovoz tarifida shunday bo'lgan), shuning
 * uchun aylantirish sinaladi.
 */
describe('tokenRatePerThousand', () => {
  /** $5/1M va 1 $ = 11 809,19 so'm -> 1000 token 59,05 so'm. */
  it('tarifni 1000 token narxiga aylantiradi', () => {
    expect(tokenRatePerThousand(5, 11_809.19)).toBeCloseTo(59.05, 2);
  });

  /** Ustama QO'SHILGAN tarif ham shu funksiyadan o'tadi: 2x -> narx 2x. */
  it('ustama tarifda narx ham ikki barobar', () => {
    const base = tokenRatePerThousand(5, 11_809.19);
    expect(tokenRatePerThousand(10, 11_809.19)).toBeCloseTo(base * 2, 2);
  });

  /** Chiqish tokeni besh baravar qimmat - o'rtachaga qo'shib yuborilmaydi. */
  it('chiqish tarifi alohida hisoblanadi', () => {
    expect(tokenRatePerThousand(25, 11_809.19)).toBeCloseTo(295.23, 2);
  });

  /** Kurs kelmasa nol: ekran bu qatorni umuman ko'rsatmaydi. */
  it('kurs nol bolsa nol', () => {
    expect(tokenRatePerThousand(5, 0)).toBe(0);
  });
});
