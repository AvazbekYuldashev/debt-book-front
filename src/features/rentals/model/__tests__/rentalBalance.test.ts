import { countsInBalance, isOpenEnded } from '../rentalMath';
import { mergeRentalTotals, rentalTotalsByContact } from '../rentalBalance';
import type { RentalResponseDTO } from '../../types/rental';

/**
 * IJARA -> QARZ BALANSI qoidasini qulflaydigan testlar.
 *
 * Qoida (egasi bilan kelishilgan, serverdagi `countsInBalance` bilan
 * aynan bir xil):
 *
 *   muddat kelmagan + yakuniy sana kelishilmagan -> balansga qo'shilmaydi
 *   muddat kelgan (yoki o'tgan)                  -> qo'shiladi
 *   muddat kelmagan, yakuniy sana kelishilgan    -> qo'shiladi
 */
const NOW = '2026-10-14T12:00';
const TODAY = '2026-10-14';

const rental = (over: Partial<RentalResponseDTO> = {}): RentalResponseDTO =>
  ({
    id: 'r1',
    clientId: 'c1',
    itemName: 'Lesa',
    quantity: 1,
    period: 'DAY',
    price: 50_000,
    currency: 'UZS',
    startDate: '2026-10-10',
    dueDate: '2026-10-13',
    paidAmount: 0,
    returns: [],
    ...over,
  }) as unknown as RentalResponseDTO;

describe('countsInBalance', () => {
  it("kelishilgan muddatli ijara boshlanmasa ham balansga qo'shiladi", () => {
    // Summa hozirdan ma'lum — bu haqiqiy majburiyat.
    const future = rental({ startDate: '2026-10-20', dueDate: '2026-10-23' });

    expect(countsInBalance(future, TODAY)).toBe(true);
  });

  it("boshlanmagan muddatsiz ijara balansga qo'shilmaydi", () => {
    // Yakuniy summa noma'lum: uni balansga yozish o'ylab topilgan raqam bo'lardi.
    const future = rental({ startDate: '2026-10-20', dueDate: '2026-10-20', openEnded: true });

    expect(isOpenEnded(future)).toBe(true);
    expect(countsInBalance(future, TODAY)).toBe(false);
  });

  it("muddatsiz ijara BOSHLANGAN kundan balansga qo'shiladi", () => {
    const started = rental({ startDate: TODAY, dueDate: TODAY, openEnded: true });

    expect(countsInBalance(started, TODAY)).toBe(true);
  });

  it('server aytgan `inBalance` ustun turadi', () => {
    // Ikki joyda ikki xil javob chiqmasligi uchun server so'zi oxirgi.
    const started = rental({ startDate: TODAY, openEnded: true, inBalance: false });

    expect(countsInBalance(started, TODAY)).toBe(false);
  });
});

describe('rentalTotalsByContact', () => {
  it("ombor egasiga: mijozning qarzi `credit` tomonga tushadi", () => {
    // 10-dan 14-gacha 4 kun × 50 000 = 200 000.
    const totals = rentalTotalsByContact([rental()], NOW);

    expect(totals.c1.credit.UZS).toBe(200_000);
    expect(totals.c1.debt.UZS).toBeUndefined();
  });

  it("mijoz tomonida xuddi shu summa `debt` bo'ladi", () => {
    const totals = rentalTotalsByContact([rental({ owner: false })], NOW);

    expect(totals.c1.debt.UZS).toBe(200_000);
    expect(totals.c1.credit.UZS).toBeUndefined();
  });

  it("muddati o'tgan kunlar qarzni o'stirib boradi", () => {
    // Muddat 13-oktyabr edi, bugun 14-i: hisob to'xtamaydi.
    const onDue = rentalTotalsByContact([rental()], '2026-10-13T12:00');
    const later = rentalTotalsByContact([rental()], NOW);

    expect(onDue.c1.credit.UZS).toBe(150_000);
    expect(later.c1.credit.UZS).toBe(200_000);
  });

  it("to'langan pul chiqarib tashlanadi", () => {
    const totals = rentalTotalsByContact([rental({ paidAmount: 120_000 })], NOW);

    expect(totals.c1.credit.UZS).toBe(80_000);
  });

  it("to'liq to'langan ijara balansda ko'rinmaydi", () => {
    const totals = rentalTotalsByContact([rental({ paidAmount: 200_000 })], NOW);

    expect(totals.c1).toBeUndefined();
  });

  it('tasdiq kutayotgan yozuv hisobga kirmaydi', () => {
    // Mijozning so'rovi hali kelishuv emas — do'kon tasdiqlashi kerak.
    const totals = rentalTotalsByContact([rental({ approval: 'WAITING' })], NOW);

    expect(totals.c1).toBeUndefined();
  });

  it("bitta mijozning bir nechta ijarasi qo'shilib boradi", () => {
    const totals = rentalTotalsByContact(
      [rental(), rental({ id: 'r2', quantity: 2 })],
      NOW,
    );

    expect(totals.c1.credit.UZS).toBe(200_000 + 400_000);
  });

  it("bir yozuv ikki yo'nalishdan kelsa bir marta hisoblanadi", () => {
    // Ro'yxat "men berganlar" va "men olganlar" dan yig'iladi; bir
    // yozuv ikkisida ham uchrasa qarz ikki baravar ko'rinib ketardi.
    const totals = rentalTotalsByContact([rental(), rental()], NOW);

    expect(totals.c1.credit.UZS).toBe(200_000);
  });

  it("ortiqcha to'lov teskari tomonga yoziladi", () => {
    // Oldindan ko'proq to'lab qo'ygan mijozga endi DO'KON qarzdor.
    const totals = rentalTotalsByContact([rental({ paidAmount: 250_000 })], NOW);

    expect(totals.c1.debt.UZS).toBe(50_000);
    expect(totals.c1.credit.UZS).toBeUndefined();
  });
});

describe('mergeRentalTotals', () => {
  it("pul balansi ustiga ijara qoldig'ini qo'shadi", () => {
    const money = { c1: { credit: { UZS: 1_000_000 }, debt: {} } };
    const rentals = { c1: { credit: { UZS: 200_000 }, debt: {} } };

    expect(mergeRentalTotals(money, rentals).c1.credit.UZS).toBe(1_200_000);
  });

  it('faqat ijarasi bor kontakt ham ro\'yxatga tushadi', () => {
    const merged = mergeRentalTotals({}, { c2: { credit: { UZS: 50_000 }, debt: {} } });

    expect(merged.c2.credit.UZS).toBe(50_000);
  });

  it('kirish obyektlari o\'zgarmaydi — React Query keshi buzilmasin', () => {
    const money = { c1: { credit: { UZS: 1_000 }, debt: {} } };
    mergeRentalTotals(money, { c1: { credit: { UZS: 500 }, debt: {} } });

    expect(money.c1.credit.UZS).toBe(1_000);
  });

  it("ijara bo'lmasa o'sha havolaning o'zi qaytadi", () => {
    const money = { c1: { credit: { UZS: 1_000 }, debt: {} } };

    expect(mergeRentalTotals(money, {})).toBe(money);
  });
});
