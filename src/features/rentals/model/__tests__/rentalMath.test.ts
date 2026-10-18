import {
  accruedAmount,
  billedUnits,
  daysFromDueDate,
  dueDateFrom,
  dueFrom,
  durationOf,
  formatTimeInputValue,
  isPartiallyReturned,
  overdueUnits,
  remainingQuantity,
  rentalStage,
  rentalStatus,
  returnedQuantity,
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
  price: 50000,
  currency: 'UZS',
  startDate: '2026-10-01',
  dueDate: '2026-10-04',
  returnedDate: null,
  paidAmount: 0,
  ...over,
});

describe('billedUnits', () => {
  it("muddat kuni qaytarilsa kun soni kelishilganiga TENG (3 kunga berildi - 3 kun)", () => {
    expect(billedUnits(rental({ returnedDate: '2026-10-04' }))).toBe(3);
  });

  it('bergan kunining o\'zida qaytarilsa kamida bir kun olinadi', () => {
    expect(billedUnits(rental({ returnedDate: '2026-10-01' }))).toBe(1);
  });

  it('buyum qaytmagan bo\'lsa bugungacha hisoblanadi', () => {
    expect(billedUnits(rental(), '2026-10-07')).toBe(6);
  });

  it('muddat o\'tib ketgan bo\'lsa hisob TO\'XTAMAYDI', () => {
    // 1-oktyabrdan 12-oktyabrgacha = 11 kun, muddat (4-oktyabr) ortda qoldi.
    expect(billedUnits(rental(), '2026-10-12')).toBe(11);
  });

  it('kech qaytarilsa haqiqiy kunlar olinadi, muddat emas', () => {
    expect(billedUnits(rental({ returnedDate: '2026-10-09' }))).toBe(8);
  });

  it('noto\'g\'ri sanada ham hisob buzilmaydi — eng kami qaytadi', () => {
    expect(billedUnits(rental({ startDate: 'xato' }), '2026-10-07')).toBe(1);
  });
});

describe('overdueUnits', () => {
  it('muddat ichida nol', () => {
    expect(overdueUnits(rental(), '2026-10-03')).toBe(0);
  });

  it('muddat kunining o\'zida hali kechikish yo\'q', () => {
    expect(overdueUnits(rental(), '2026-10-04')).toBe(0);
  });

  it('muddatdan keyin har kun qo\'shiladi', () => {
    expect(overdueUnits(rental(), '2026-10-07')).toBe(3);
  });

  it('kech qaytarilgan yozuvda kechikish SAQLANADI', () => {
    expect(overdueUnits(rental({ returnedDate: '2026-10-06' }))).toBe(2);
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
    const item = rental({ quantity: 10, price: 5000, returnedDate: '2026-10-04' });
    expect(accruedAmount(item)).toBe(150000);
  });

  it('miqdor berilmagan eski yozuvda bitta deb olinadi', () => {
    const item = rental({ quantity: 0, returnedDate: '2026-10-04' });
    expect(accruedAmount(item)).toBe(150000);
  });

  it('server summani satr qilib yuborsa ham son chiqadi', () => {
    const item = rental({ price: '50000.00' as unknown as number, returnedDate: '2026-10-04' });
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

/**
 * QISMAN QAYTARISH.
 *
 * Bu testlar serverdagi `RentalCalculatorTest` bilan AYNAN bir xil
 * holatlarni tekshiradi: ikki tomon bir xil javob berishi shart, aks
 * holda ekrandagi summa bazadagidan farq qiladi.
 */
describe('qisman qaytarish', () => {
  // 10 stul, 1-oktyabr, muddat 4-oktyabr, kunlik 1000.
  const chairs = (over: Partial<RentalResponseDTO> = {}): RentalResponseDTO =>
    rental({ quantity: 10, price: 1000, ...over });

  it("har partiya O'Z kunigacha hisoblanadi", () => {
    // 3 tasi 3-oktyabrda qaytdi (3 × 2 kun), 7 tasi hali mijozda (7 × 11 kun).
    const item = chairs({ returns: [{ quantity: 3, returnedDate: '2026-10-03' }] });
    expect(accruedAmount(item, '2026-10-12')).toBe(83000);
  });

  it("qisman qaytarilgan ijara OCHIQ qoladi", () => {
    const item = chairs({ returns: [{ quantity: 3, returnedDate: '2026-10-03' }] });

    expect(returnedQuantity(item)).toBe(3);
    expect(remainingQuantity(item)).toBe(7);
    expect(isPartiallyReturned(item)).toBe(true);
    expect(rentalStatus(item, '2026-10-12')).toBe('OVERDUE');
  });

  it("hamma buyum qaytgach hisob TO'XTAYDI", () => {
    const item = chairs({
      returnedDate: '2026-10-06',
      returns: [
        { quantity: 3, returnedDate: '2026-10-03' },
        { quantity: 7, returnedDate: '2026-10-06' },
      ],
    });

    expect(remainingQuantity(item)).toBe(0);
    expect(rentalStatus(item, '2026-10-12')).toBe('RETURNED');
    // 3 × 2 + 7 × 5 = 41 buyum-kun. Kun o'tgani bilan summa o'zgarmaydi.
    expect(accruedAmount(item, '2026-10-12')).toBe(41000);
    expect(accruedAmount(item, '2026-12-31')).toBe(41000);
  });

  it("o'sha kuni qaytgan partiyaga ham eng kami bir kun yoziladi", () => {
    const item = rental({
      quantity: 2,
      price: 1000,
      returns: [{ quantity: 1, returnedDate: '2026-10-01' }],
    });
    // 1 × 1 kun (eng kami) + 1 × 11 kun = 12 buyum-kun.
    expect(accruedAmount(item, '2026-10-12')).toBe(12000);
  });

  it('partiyasiz yopilgan eski yozuv avvalgidek hisoblanadi', () => {
    const item = rental({ returnedDate: '2026-10-04' });
    expect(accruedAmount(item, '2026-10-12')).toBe(150000);
    expect(rentalStatus(item, '2026-10-12')).toBe('RETURNED');
    expect(remainingQuantity(item)).toBe(0);
  });

  it('server satr yuborsa ham miqdor son bo\'lib hisoblanadi', () => {
    const item = chairs({
      returns: [{ quantity: '3' as unknown as number, returnedDate: '2026-10-03' }],
    });
    expect(returnedQuantity(item)).toBe(3);
    expect(accruedAmount(item, '2026-10-12')).toBe(83000);
  });
});

/**
 * SOATLIK IJARA.
 *
 * Boshlangan soat to'liq hisoblanadi, eng kami bir soat. Kunlik
 * ijaradagi kabi bu qoida ham serverdagi kalkulyator bilan bir xil.
 */
describe('soatlik ijara', () => {
  // Beton aralashtirgich: 13-oktyabr 14:00 da 3 soatga, soatiga 20 000.
  const mixer = (over: Partial<RentalResponseDTO> = {}): RentalResponseDTO =>
    rental({
      itemName: 'Beton aralashtirgich',
      period: 'HOUR',
      price: 20000,
      startDate: '2026-10-13',
      startTime: '14:00',
      dueDate: '2026-10-13',
      dueTime: '17:00',
      ...over,
    });

  it('muddatida qaytsa kelishilgan soat olinadi', () => {
    const item = mixer({ returnedDate: '2026-10-13', returnedTime: '17:00' });
    expect(billedUnits(item)).toBe(3);
    expect(accruedAmount(item)).toBe(60000);
  });

  it("boshlangan soat TO'LIQ hisoblanadi (3 soat 10 daqiqa = 4 soat)", () => {
    const item = mixer({ returnedDate: '2026-10-13', returnedTime: '17:10' });
    expect(billedUnits(item)).toBe(4);
    expect(overdueUnits(item)).toBe(1);
  });

  it('darhol qaytsa ham kamida bir soat', () => {
    const item = mixer({ returnedDate: '2026-10-13', returnedTime: '14:05' });
    expect(billedUnits(item)).toBe(1);
  });

  it('qaytmagan buyum hozirgacha hisoblanadi va yarim tundan o\'tadi', () => {
    // 14:00 dan ertasi 09:30 gacha = 19.5 soat -> 20 soat.
    expect(billedUnits(mixer(), '2026-10-14T09:30')).toBe(20);
    expect(rentalStatus(mixer(), '2026-10-14T09:30')).toBe('OVERDUE');
  });

  it("muddat soatining o'zida hali kechikish yo'q", () => {
    expect(overdueUnits(mixer(), '2026-10-13T17:00')).toBe(0);
    expect(rentalStatus(mixer(), '2026-10-13T16:59')).toBe('ACTIVE');
  });

  it('partiyalar ham o\'z soatigacha hisoblanadi', () => {
    // 2 ta: biri 15:30 da (2 soat), ikkinchisi 18:00 da (4 soat) qaytdi.
    const item = mixer({
      quantity: 2,
      returnedDate: '2026-10-13',
      returnedTime: '18:00',
      returns: [
        { quantity: 1, returnedDate: '2026-10-13', returnedTime: '15:30' },
        { quantity: 1, returnedDate: '2026-10-13', returnedTime: '18:00' },
      ],
    });
    expect(accruedAmount(item)).toBe(120000);
  });

  it('kunlik ijarada soat hisobga kirmaydi', () => {
    // Kechqurun berib ertalab qaytarilsa — 1 kun, 0.5 emas.
    const item = rental({
      startDate: '2026-10-01',
      startTime: '21:00',
      returnedDate: '2026-10-02',
      returnedTime: '08:00',
    });
    expect(billedUnits(item)).toBe(1);
  });
});

describe('dueFrom / durationOf', () => {
  it('kunlikda faqat sana', () => {
    expect(dueFrom('DAY', '2026-10-01', null, 3)).toEqual({ date: '2026-10-04', time: null });
  });

  it('soatlikda sana va soat', () => {
    expect(dueFrom('HOUR', '2026-10-13', '14:00', 3)).toEqual({ date: '2026-10-13', time: '17:00' });
  });

  it('soatlik muddat yarim tundan o\'tsa sana suriladi', () => {
    expect(dueFrom('HOUR', '2026-12-31', '22:30', 5)).toEqual({ date: '2027-01-01', time: '03:30' });
  });

  it('soat yoki muddat xato bo\'lsa null', () => {
    expect(dueFrom('HOUR', '2026-10-13', '25:00', 3)).toBeNull();
    expect(dueFrom('HOUR', '2026-10-13', '14:00', 0)).toBeNull();
  });

  it('tahrirlash uchun muddat qaytadan chiqariladi', () => {
    expect(durationOf(rental())).toBe(3);
    expect(
      durationOf(
        rental({
          period: 'HOUR',
          startDate: '2026-10-13',
          startTime: '22:00',
          dueDate: '2026-10-14',
          dueTime: '02:00',
        }),
      ),
    ).toBe(4);
  });

  it('soat maydoni raqamlardan HH:mm ga keladi', () => {
    expect(formatTimeInputValue('1')).toBe('1');
    expect(formatTimeInputValue('143')).toBe('14:3');
    expect(formatTimeInputValue('14:30')).toBe('14:30');
    expect(formatTimeInputValue('143099')).toBe('14:30');
  });
});

/**
 * HISOB BOSQICHI — buyum QAYERDA: mijozda / kechikkan / qaytgan.
 *
 * Pul bosqichga ta'sir qilmaydi. Ilgari "qaytgan, puli olinmagan"
 * alohida NASIYA bosqichi edi, lekin u `paidAmount` ga tayanardi va
 * ilovada ijara to'lovini yozadigan yo'l qolmagach, har qaytgan ijara
 * nasiya bo'lib yopishib olardi. Pul endi faqat Qarzlar daftarida.
 */
describe('rentalStage', () => {
  it('buyum mijozda bo\'lsa holat o\'zi', () => {
    expect(rentalStage(rental(), '2026-10-02')).toBe('ACTIVE');
    expect(rentalStage(rental(), '2026-10-10')).toBe('OVERDUE');
  });

  it('qaytgan bo\'lsa — yopilgan, puli qancha bo\'lishidan qat\'i nazar', () => {
    // To'liq to'lanmagan, to'lanmagan va ortiqcha to'langan — uchalasi ham
    // bitta bosqich: buyum omborga qaytdi.
    for (const paidAmount of [0, 100000, 150000, 200000]) {
      const item = rental({ returnedDate: '2026-10-04', paidAmount });
      expect(rentalStage(item, '2026-10-12')).toBe('CLOSED');
    }
  });

  it('kasr narxda yaxlitlash xatosi nasiya bo\'lib chiqmaydi', () => {
    // 0.1 × 3 = 0.30000000000000004 — to'langan 0.3 bilan teng bo'lishi kerak.
    const item = rental({ price: 0.1, returnedDate: '2026-10-04', paidAmount: 0.3, currency: 'USD' });
    expect(unpaidAmount(item)).toBe(0);
    expect(rentalStage(item, '2026-10-12')).toBe('CLOSED');
  });
});
