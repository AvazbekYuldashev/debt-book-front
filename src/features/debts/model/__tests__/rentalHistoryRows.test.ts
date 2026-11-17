import { mergeHistoryRows, rentalHistoryRows, rentalIdOfRow } from '../rentalHistoryRows';
import { rentalTotalsByContact } from '../../../rentals/model/rentalBalance';
import type { MappedTransaction } from '../transactionMapping';
import type { RentalResponseDTO } from '../../../rentals/types/rental';

/**
 * TARIX BALANSNI TUSHUNTIRADI.
 *
 * Egasining so'zi bilan: "tarixdagi yozuvlar bilan umumiy bir xil
 * emas-ku, demak nimadir tarixga yozilmayapti". Yozilmayotgani ijara
 * HAQI edi: balans uni hisoblar, tarix esa faqat to'lovni ko'rsatardi.
 */
const NOW = '2026-11-20T12:00';

const rental = (over: Partial<RentalResponseDTO> = {}): RentalResponseDTO =>
  ({
    id: 'r1',
    clientId: 'c1',
    clientName: 'Akmal',
    itemName: 'lesa',
    quantity: 1,
    price: 25_000,
    currency: 'UZS',
    // 2026-11-18 → 2026-11-20 = 2 kun × 25 000 = 50 000.
    startDate: '2026-11-18',
    dueDate: '2026-11-20',
    createdDate: '2026-11-18T09:00:00',
    paidAmount: 0,
    owner: false,
    payments: [],
    ...over,
  }) as unknown as RentalResponseDTO;

const money = (id: string, createdDate: string): MappedTransaction =>
  ({ id, amount: 50_000, visible: true, createdDate, kind: 'debt', label: 'Qarz' }) as MappedTransaction;

describe('rentalHistoryRows', () => {
  it('ijara HAQI tarixda qator bo\'lib chiqadi', () => {
    const rows = rentalHistoryRows([rental()], NOW);

    expect(rows).toHaveLength(1);
    expect(rows[0].amount).toBe(50_000);
    // Mijoz tomonida haq — QARZ (qizil), ombor egasida esa haq.
    expect(rows[0].kind).toBe('debt');
    expect(rows[0].description).toContain('lesa');
    // Qator ijara kartasiga olib boradi.
    expect(rentalIdOfRow(rows[0].id)).toBe('r1');
  });

  it("YO'NALISH egalikdan: egasida haq credit, to'lov debt", () => {
    const rows = rentalHistoryRows(
      [rental({
        owner: true,
        paidAmount: 20_000,
        payments: [{ id: 'p1', amount: 20_000, paidDate: '2026-11-19' }],
      })],
      NOW,
    );

    expect(rows[0].kind).toBe('credit'); // haq menga tegishli
    expect(rows[1].kind).toBe('debt'); // pul menga keldi
  });

  /**
   * ENG MUHIM TEKSHIRUV: qatorlar yig'indisi balansga TENG.
   *
   * Sarlavha ijara qoldig'ini qo'shadi, tarix esa haq va to'lovni
   * alohida ko'rsatadi — ikkisining farqi aynan o'sha qoldiq bo'lishi
   * kerak, aks holda odam qatorlarni qo'shib boshqa raqam oladi.
   */
  it('qatorlar yig\'indisi balansdagi qoldiqqa TENG', () => {
    // `paidAmount` va `payments` yig'indisi BIR XIL: server ikkalasini
    // bitta tranzaksiyada yozadi va tenglik aynan shunga tayanadi.
    const items = [
      rental({
        paidAmount: 20_000,
        payments: [{ id: 'p1', amount: 20_000, paidDate: '2026-11-19' }],
      }),
      rental({ id: 'r2', itemName: 'opalubka', price: 10_000 }),
    ];

    const rows = rentalHistoryRows(items, NOW);
    const fromRows = rows.reduce(
      (sum, row) => sum + (row.kind === 'debt' ? row.amount : -row.amount),
      0,
    );

    const totals = rentalTotalsByContact(items, NOW).c1;
    const fromBalance = (totals.debt.UZS ?? 0) - (totals.credit.UZS ?? 0);

    expect(fromRows).toBe(fromBalance);
  });

  /**
   * QAYTARILGAN, lekin puli to'lanmagan ijara balansda qoladi, Ijara
   * sahifasidan esa tushib ketadi ("hozir nima turibdi" degan savolga
   * javob emas). Tarixsiz u ko'rinmas qarzga aylanardi — aynan shu
   * sabab sarlavha bilan qatorlar farq qilgan edi.
   */
  it("qaytarilgan-u to'lanmagan ijara ham tarixda turadi", () => {
    const returned = rental({
      returnedDate: '2026-11-19',
      returns: [{ id: 'b1', quantity: 1, returnedDate: '2026-11-19' }],
    });

    const rows = rentalHistoryRows([returned], NOW);
    expect(rows).toHaveLength(1);
    // 2026-11-18 → 19 = 1 kun × 25 000.
    expect(rows[0].amount).toBe(25_000);
  });

  /**
   * SANASI YOZILMAGAN eski to'lovlar ham qator beradi.
   *
   * To'lov tarixi keyinroq joriy qilindi; undan oldingi pul faqat
   * `paidAmount` yig'indisida qolgan. Qatorsiz qolsa ro'yxat
   * sarlavhadan KATTA chiqadi — egasining ekranida aynan shunday
   * bo'ldi: 1 350 000 so'm qatorsiz edi.
   */
  it("eski to'lov (sanasiz) ham qator bo'lib chiqadi", () => {
    const legacy = rental({ paidAmount: 30_000, payments: [] });

    const rows = rentalHistoryRows([legacy], NOW);
    expect(rows).toHaveLength(2);
    expect(rows[1].amount).toBe(30_000);
    expect(rows[1].kind).toBe('credit'); // mijoz bergan pul
    expect(rentalIdOfRow(rows[1].id)).toBe('r1');
  });

  it("itemlangan to'lovdan ortig'igina 'oldingi' bo'lib chiqadi", () => {
    const mixed = rental({
      paidAmount: 50_000,
      payments: [{ id: 'p1', amount: 20_000, paidDate: '2026-11-19' }],
    });

    const amounts = rentalHistoryRows([mixed], NOW).map((row) => row.amount);
    // Haq 50 000, itemlangan 20 000, qolgan eski 30 000.
    expect(amounts).toEqual([50_000, 20_000, 30_000]);
  });

  it("to'liq itemlangan ijarada ortiqcha qator chiqmaydi", () => {
    const clean = rental({
      paidAmount: 20_000,
      payments: [{ id: 'p1', amount: 20_000, paidDate: '2026-11-19' }],
    });
    expect(rentalHistoryRows([clean], NOW)).toHaveLength(2);
  });

  /**
   * EGASINING EKRANI: uchta ochiq va ikkita yopilgan ijara, eski
   * to'lovlar bilan. Qatorlar yig'indisi sarlavhadagi raqamni AYNAN
   * berishi kerak — shu hisob buzilgani uchun shikoyat bo'lgan edi.
   */
  it("haqiqiy aralash holat: qatorlar sarlavhani AYNAN beradi", () => {
    const items = [
      // Ochiq: 30 kun × 25 000, ko'pi to'langan.
      rental({ id: 'a', startDate: '2026-10-21', dueDate: '2026-11-20', paidAmount: 675_000 }),
      rental({ id: 'b', startDate: '2026-10-21', dueDate: '2026-11-20', paidAmount: 675_000 }),
      // Yopilgan, puli to'lanmagan — Ijara sahifasida ko'rinmaydi.
      rental({
        id: 'c',
        startDate: '2026-11-18',
        returnedDate: '2026-11-20',
        returns: [{ id: 'r', quantity: 1, returnedDate: '2026-11-20' }],
      }),
    ];

    const rows = rentalHistoryRows(items, NOW);
    const fromRows = rows.reduce(
      (sum, row) => sum + (row.kind === 'debt' ? row.amount : -row.amount),
      0,
    );
    const totals = rentalTotalsByContact(items, NOW).c1;
    const fromBalance = (totals.debt.UZS ?? 0) - (totals.credit.UZS ?? 0);

    expect(fromRows).toBe(fromBalance);
  });

  it('balansga kirmaydigan ijara tarixda ham chiqmaydi', () => {
    // Muddatsiz va hali boshlanmagan — majburiyat emas.
    const future = rental({ openEnded: true, startDate: '2026-12-01', inBalance: false });
    expect(rentalHistoryRows([future], NOW)).toHaveLength(0);
  });

  it('bir yozuv ikki ro\'yxatdan kelsa bir marta sanaladi', () => {
    expect(rentalHistoryRows([rental(), rental()], NOW)).toHaveLength(1);
  });
});

describe('mergeHistoryRows', () => {
  it('pul yozuvlari bilan ARALASH, yangisi tepada', () => {
    const merged = mergeHistoryRows(
      [money('m1', '2026-11-19T12:00:00'), money('m2', '2026-11-10T12:00:00')],
      rentalHistoryRows([rental()], NOW), // createdDate 2026-11-18 09:00
    );

    expect(merged.map((row) => row.id)).toEqual(['m1', 'rental:r1', 'm2']);
  });

  it("ijara bo'lmasa pul ro'yxati O'ZGARMAY qaytadi", () => {
    const moneyRows = [money('m1', '2026-11-13T12:00:00')];
    expect(mergeHistoryRows(moneyRows, [])).toBe(moneyRows);
  });

  it('oddiy pul yozuvi ijara emas', () => {
    expect(rentalIdOfRow('money-1')).toBeNull();
  });
});
