import {
  mergeHistoryRows,
  rentalIdOfPaymentRow,
  rentalPaymentRows,
} from '../rentalPaymentRows';
import type { MappedTransaction } from '../transactionMapping';
import type { RentalResponseDTO } from '../../../rentals/types/rental';

/**
 * Ijara to'lovi TARIXDA ko'rinadi.
 *
 * To'lov ijara yozuvining ichida yashaydi (`payments[]`), Tarix esa pul
 * yozuvlaridan quriladi — oralaridagi ko'prik shu modul. Egasining
 * so'zi bilan: "pul berdim, lekin u tarixga yozilmadi-ku".
 */
const rental = (over: Partial<RentalResponseDTO> = {}): RentalResponseDTO =>
  ({
    id: 'r1',
    clientId: 'c1',
    clientName: 'Akmal',
    itemName: 'lesa',
    quantity: 1,
    price: 25_000,
    currency: 'UZS',
    startDate: '2026-10-18',
    dueDate: '2026-10-20',
    paidAmount: 100_000,
    payments: [
      { id: 'p1', amount: 100_000, paidDate: '2026-11-14', createdDate: '2026-11-14T10:30:00' },
    ],
    ...over,
  }) as unknown as RentalResponseDTO;

const money = (id: string, createdDate: string): MappedTransaction =>
  ({
    id,
    amount: 50_000,
    visible: true,
    createdDate,
    kind: 'debt',
    label: 'Qarz',
  }) as MappedTransaction;

describe('rentalPaymentRows', () => {
  it("har to'lov alohida qator bo'ladi", () => {
    const rows = rentalPaymentRows([
      rental({
        payments: [
          { id: 'p1', amount: 60_000, createdDate: '2026-11-13T09:00:00' },
          { id: 'p2', amount: 40_000, createdDate: '2026-11-14T09:00:00' },
        ],
      }),
    ]);

    expect(rows).toHaveLength(2);
    expect(rows[0].amount).toBe(60_000);
    expect(rows[1].amount).toBe(40_000);
    // Buyum nomi izohda — qator nimaga tegishli ekani ko'rinadi.
    expect(rows[0].description).toContain('lesa');
  });

  it("YO'NALISH egalikdan: egasiga pul keldi, mijozdan ketdi", () => {
    // Egasi: pul olindi — "oldim" ko'rinishi (qizil).
    expect(rentalPaymentRows([rental({ owner: true })])[0].kind).toBe('debt');
    // Mijoz: pul berildi — "berdim" ko'rinishi (yashil).
    expect(rentalPaymentRows([rental({ owner: false })])[0].kind).toBe('credit');
  });

  it('server satr yuborsa ham summa son bo\'ladi', () => {
    const rows = rentalPaymentRows([
      rental({ payments: [{ id: 'p1', amount: '50000.00' as never, paidDate: '2026-11-14' }] }),
    ]);
    expect(rows[0].amount).toBe(50_000);
  });

  it("to'lovsiz ijara qator chiqarmaydi", () => {
    expect(rentalPaymentRows([rental({ payments: [] })])).toHaveLength(0);
    expect(rentalPaymentRows([rental({ payments: undefined })])).toHaveLength(0);
  });

  it("qator id'sidan ijara topiladi — bosilganda ijara kartasi ochiladi", () => {
    const rows = rentalPaymentRows([rental()]);
    expect(rentalIdOfPaymentRow(rows[0].id)).toBe('r1');
    // Oddiy pul yozuvi ijara emas.
    expect(rentalIdOfPaymentRow('money-1')).toBeNull();
  });
});

describe('mergeHistoryRows', () => {
  it("pul yozuvlari bilan ARALASH, yangisi tepada", () => {
    const merged = mergeHistoryRows(
      [money('m1', '2026-11-13T12:00:00'), money('m2', '2026-11-10T12:00:00')],
      rentalPaymentRows([rental()]), // 2026-11-14 10:30
    );

    expect(merged.map((row) => row.id)).toEqual(['rental-pay:r1:p1', 'm1', 'm2']);
  });

  it("to'lov bo'lmasa pul ro'yxati O'ZGARMAY qaytadi", () => {
    const moneyRows = [money('m1', '2026-11-13T12:00:00')];
    expect(mergeHistoryRows(moneyRows, [])).toBe(moneyRows);
  });
});
