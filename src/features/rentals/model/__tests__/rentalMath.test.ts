import {
  accruedAmount,
  billedDays,
  daysFromDueDate,
  dueDateFrom,
  overdueDays,
  rentalStatus,
  unpaidAmount,
} from '../rentalMath';
import type { RentalResponseDTO } from '../../types/rental';

/**
 * Bu testlar KUN QOIDASINI qulflaydi: "3 kunga berdim" degan odam
 * muddat kuni kelganda ekranda 3 kun ko'rishi kerak, 4 kun emas.
 * Qoida o'zgarsa server bilan telefon bir-biriga mos kelmay qoladi,
 * shuning uchun har bir chegara alohida tekshiriladi.
 */
const rental = (over: Partial<RentalResponseDTO> = {}): RentalResponseDTO => ({
  id: 'r1',
  clientId: 'c1',
  clientName: 'Akmal',
  itemName: 'Perforator',
  quantity: 1,
  dailyPrice: 50000,
  currency: 'UZS',
  startDate: '2026-10-01',
  dueDate: '2026-10-04',
  returnedDate: null,
  paidAmount: 0,
  ...over,
});

describe('billedDays', () => {
  it("muddat kuni qaytarilsa kun soni kelishilganiga TENG (3 kunga berildi - 3 kun)", () => {
    expect(billedDays(rental({ returnedDate: '2026-10-04' }))).toBe(3);
  });

  it('bergan kunining o\'zida qaytarilsa kamida bir kun olinadi', () => {
    expect(billedDays(rental({ returnedDate: '2026-10-01' }))).toBe(1);
  });

  it('buyum qaytmagan bo\'lsa bugungacha hisoblanadi', () => {
    expect(billedDays(rental(), '2026-10-07')).toBe(6);
  });

  it('muddat o\'tib ketgan bo\'lsa hisob TO\'XTAMAYDI', () => {
    // 1-oktyabrdan 12-oktyabrgacha = 11 kun, muddat (4-oktyabr) ortda qoldi.
    expect(billedDays(rental(), '2026-10-12')).toBe(11);
  });

  it('kech qaytarilsa haqiqiy kunlar olinadi, muddat emas', () => {
    expect(billedDays(rental({ returnedDate: '2026-10-09' }))).toBe(8);
  });

  it('noto\'g\'ri sanada ham hisob buzilmaydi — eng kami qaytadi', () => {
    expect(billedDays(rental({ startDate: 'xato' }), '2026-10-07')).toBe(1);
  });
});

describe('overdueDays', () => {
  it('muddat ichida nol', () => {
    expect(overdueDays(rental(), '2026-10-03')).toBe(0);
  });

  it('muddat kunining o\'zida hali kechikish yo\'q', () => {
    expect(overdueDays(rental(), '2026-10-04')).toBe(0);
  });

  it('muddatdan keyin har kun qo\'shiladi', () => {
    expect(overdueDays(rental(), '2026-10-07')).toBe(3);
  });

  it('kech qaytarilgan yozuvda kechikish SAQLANADI', () => {
    expect(overdueDays(rental({ returnedDate: '2026-10-06' }))).toBe(2);
  });
});

describe('rentalStatus', () => {
  it('muddat ichida — ACTIVE', () => {
    expect(rentalStatus(rental(), '2026-10-02')).toBe('ACTIVE');
  });

  it('muddat o\'tdi, buyum qaytmadi — OVERDUE', () => {
    expect(rentalStatus(rental(), '2026-10-10')).toBe('OVERDUE');
  });

  it('kech bo\'lsa ham qaytgan buyum RETURNED — ro\'yxatda qizil qolmaydi', () => {
    expect(rentalStatus(rental({ returnedDate: '2026-10-09' }), '2026-10-12')).toBe('RETURNED');
  });
});

describe('accruedAmount', () => {
  it('kunlik narx × kun', () => {
    expect(accruedAmount(rental({ returnedDate: '2026-10-04' }))).toBe(150000);
  });

  it('nechta buyum berilgani ham ko\'paytiriladi (10 stol × 3 kun)', () => {
    const item = rental({ quantity: 10, dailyPrice: 5000, returnedDate: '2026-10-04' });
    expect(accruedAmount(item)).toBe(150000);
  });

  it('miqdor berilmagan eski yozuvda bitta deb olinadi', () => {
    const item = rental({ quantity: 0, returnedDate: '2026-10-04' });
    expect(accruedAmount(item)).toBe(150000);
  });

  it('server summani satr qilib yuborsa ham son chiqadi', () => {
    const item = rental({ dailyPrice: '50000.00' as unknown as number, returnedDate: '2026-10-04' });
    expect(accruedAmount(item)).toBe(150000);
  });
});

describe('unpaidAmount', () => {
  it('to\'lanmagan qoldiq = yig\'ilgan − to\'langan', () => {
    const item = rental({ returnedDate: '2026-10-04', paidAmount: 100000 });
    expect(unpaidAmount(item)).toBe(50000);
  });

  it('ortiqcha to\'lov manfiy qoldiq bo\'lib ko\'rinadi (kesilmaydi)', () => {
    const item = rental({ returnedDate: '2026-10-04', paidAmount: 200000 });
    expect(unpaidAmount(item)).toBe(-50000);
  });
});

describe('dueDateFrom / daysFromDueDate', () => {
  it('boshlanish + kun soni = muddat', () => {
    expect(dueDateFrom('2026-10-01', 3)).toBe('2026-10-04');
  });

  it('oy chegarasidan o\'tadi', () => {
    expect(dueDateFrom('2026-10-30', 5)).toBe('2026-11-04');
  });

  it('yil chegarasidan o\'tadi', () => {
    expect(dueDateFrom('2026-12-30', 3)).toBe('2027-01-02');
  });

  it('kabisa yilining 29-fevralini to\'g\'ri o\'tadi', () => {
    expect(dueDateFrom('2028-02-27', 3)).toBe('2028-03-01');
  });

  it('kun soni yoki sana xato bo\'lsa null', () => {
    expect(dueDateFrom('2026-10-01', 0)).toBeNull();
    expect(dueDateFrom('xato', 3)).toBeNull();
  });

  it('teskari amal kun sonini qaytaradi', () => {
    expect(daysFromDueDate('2026-10-01', '2026-10-04')).toBe(3);
  });

  it('muddat boshlanishdan oldin bo\'lsa null', () => {
    expect(daysFromDueDate('2026-10-04', '2026-10-01')).toBeNull();
  });
});
