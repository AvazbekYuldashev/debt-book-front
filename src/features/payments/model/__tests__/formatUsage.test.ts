import { formatDuration, formatSum, formatWhen } from '../formatUsage';

/**
 * To'lovlar ekranidagi raqamlar o'qiladigan bo'lishi kerak.
 *
 * Bu pul masalasi: odam "nega bu 75, bu 150" deb solishtiradi, shuning
 * uchun davomiylik ham, summa ham aniq ko'rinishi lozim.
 */
describe('formatDuration', () => {
  it('qisqa buyruq soniyalarda', () => {
    expect(formatDuration(10_000)).toBe('10 soniya');
    expect(formatDuration(30_000)).toBe('30 soniya');
  });

  /** Chaqiruv bo'lgan - demak vaqt ketgan. "0 soniya" yozilmaydi. */
  it('juda qisqasi ham nol emas', () => {
    expect(formatDuration(400)).toBe('1 soniya');
    expect(formatDuration(0)).toBe('1 soniya');
  });

  it('daqiqadan oshsa ajratiladi', () => {
    expect(formatDuration(65_000)).toBe('1 daq 05 son');
    expect(formatDuration(125_000)).toBe('2 daq 05 son');
    expect(formatDuration(60_000)).toBe('1 daq 00 son');
  });
});

describe('formatSum', () => {
  it('butun summa', () => {
    expect(formatSum(75)).toBe("75 so'm");
    expect(formatSum(450)).toBe("450 so'm");
  });

  /**
   * Tiyin TASHLANMAYDI: 7.5 so'm/soniya hisobida kasr tabiiy chiqadi va
   * uni yashirish jamini tushunarsiz qilardi.
   */
  it('kasr qism saqlanadi', () => {
    expect(formatSum(7.5)).toBe("7,50 so'm");
    expect(formatSum(112.5)).toBe("112,50 so'm");
  });

  it('minglar ajratiladi', () => {
    expect(formatSum(1250)).toBe("1 250 so'm");
    expect(formatSum(1234567)).toBe("1 234 567 so'm");
  });

  it('nol ham koʻrsatiladi', () => {
    expect(formatSum(0)).toBe("0 so'm");
  });
});

describe('formatWhen', () => {
  it('sana va vaqt', () => {
    expect(formatWhen('2026-09-28T20:45:00')).toBe('28.09.2026 20:45');
  });

  /** Buzuq sana ekranni yiqitmasligi kerak. */
  it('buzuq qiymat bosh satr', () => {
    expect(formatWhen('bu sana emas')).toBe('');
  });
});

/**
 * MANFIY summa: balans qarzda bo'lishi mumkin (to'ldirilgandan ko'p
 * sarflangan). HAQIQIY HOLAT: balans "-614 so'm" ko'rsatardi, sarf esa
 * "614,91 so'm" - bir xil pul, ikki xil raqam.
 *
 * Sabab: `Math.trunc` manfiy sonni nolga qarab kesadi va kasr qism
 * manfiy chiqadi, "noldan katta" shartidan o'tmaydi.
 */
describe('formatSum manfiy summada', () => {
  it('tiyin yoqolmaydi', () => {
    expect(formatSum(-614.91)).toBe("-614,91 so'm");
    expect(formatSum(-7.5)).toBe("-7,50 so'm");
  });

  it('butun manfiy son', () => {
    expect(formatSum(-450)).toBe("-450 so'm");
    expect(formatSum(-1250)).toBe("-1 250 so'm");
  });

  /** Musbat tomoni buzilmasligi kerak. */
  it('musbat summa oldingidek', () => {
    expect(formatSum(614.91)).toBe("614,91 so'm");
    expect(formatSum(0)).toBe("0 so'm");
  });
});
