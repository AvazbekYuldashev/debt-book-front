import { renderHook } from '@testing-library/react-native';
import { useContactRentalTotals } from '../useContactRentalTotals';
import { mergeAmounts, netByCurrency } from '../../../../shared/lib/currency';
import type { RentalResponseDTO } from '../../types/rental';

jest.mock('../useRentals');

import { useMyRentals, useRentalsWithBusiness } from '../useRentals';

const SHOP = 'biz-1';

const rental = (over: Partial<RentalResponseDTO> = {}): RentalResponseDTO =>
  ({
    id: 'r1',
    clientId: 'c1',
    itemName: 'Lesa',
    quantity: 1,
    period: 'DAY',
    price: 23_333,
    currency: 'UZS',
    startDate: '2020-01-01',
    dueDate: '2020-01-02',
    paidAmount: 0,
    returns: [],
    approval: 'CONFIRMED',
    owner: false,
    ...over,
  }) as unknown as RentalResponseDTO;

const idle = { data: undefined };

beforeEach(() => {
  (useMyRentals as jest.Mock).mockReturnValue(idle);
  (useRentalsWithBusiness as jest.Mock).mockReturnValue(idle);
});

/**
 * Kontakt kartasidagi balans sarlavhasi IJARANI ham ko'radi.
 *
 * Ilgari u faqat pul tarixidan chiqardi: odam darhol ostida "Qarz
 * 23 333" deb turgan qatorni ko'rar, tepada esa o'sha pul yo'q edi.
 */
describe('kontaktning ijara qoldig\'i', () => {
  it("mijoz tomonida qoldiq QARZ bo'lib keladi", () => {
    (useRentalsWithBusiness as jest.Mock).mockReturnValue({ data: [rental()] });

    const { result } = renderHook(() => useContactRentalTotals('c1', SHOP));

    expect(result.current.totals.debt.UZS).toBeGreaterThan(0);
    expect(result.current.totals.credit.UZS).toBeUndefined();
  });

  it('ombor egasi tomonida xuddi shu pul HAQ bo\'ladi', () => {
    (useMyRentals as jest.Mock).mockReturnValue({
      content: undefined,
      data: { content: [rental({ owner: true })] },
    });

    const { result } = renderHook(() => useContactRentalTotals('c1', null));

    expect(result.current.totals.credit.UZS).toBeGreaterThan(0);
    expect(result.current.totals.debt.UZS).toBeUndefined();
  });

  it('boshqa kontaktning ijarasi bu kontaktga qo\'shilmaydi', () => {
    (useRentalsWithBusiness as jest.Mock).mockReturnValue({
      data: [rental({ clientId: 'boshqa' })],
    });

    const { result } = renderHook(() => useContactRentalTotals('c1', SHOP));

    expect(result.current.totals.debt.UZS).toBeUndefined();
  });

  it("qaytarilmagan yozuvlar SONI ham qaytadi", () => {
    // Qarz oynasidagi qator shu sonni ko'rsatadi — odam oynani ochmasdan
    // "menda nimadir bormi" degan savolga javob oladi.
    (useRentalsWithBusiness as jest.Mock).mockReturnValue({
      data: [rental(), rental({ id: 'r2' }), rental({ id: 'r3', returnedDate: '2026-01-05' })],
    });

    const { result } = renderHook(() => useContactRentalTotals('c1', SHOP));

    // Qaytarilgani sanalmaydi: savol "nechta narsa mendan ketgan".
    expect(result.current.openCount).toBe(2);
  });

  it("ijara pul balansining USTIGA qo'shiladi", () => {
    (useRentalsWithBusiness as jest.Mock).mockReturnValue({ data: [rental()] });

    const { result } = renderHook(() => useContactRentalTotals('c1', SHOP));
    // Sarlavha aynan shu amalni bajaradi: pul + ijara -> sof balans.
    const money = { credit: { UZS: 20_123 }, debt: {} };
    const net = netByCurrency(
      mergeAmounts(money.credit, result.current.totals.credit),
      mergeAmounts(money.debt, result.current.totals.debt),
    );

    // Ijara qarzi haqdan ayriladi — ilgari u umuman hisobga kirmasdi.
    expect(net[0].amount).toBeLessThan(20_123);
  });
});
