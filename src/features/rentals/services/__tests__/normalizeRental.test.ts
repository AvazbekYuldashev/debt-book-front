import { normalizeRental } from '../rentalService';
import type { RentalResponseDTO } from '../../types/rental';

/**
 * Javob CHEGARASI: server BigDecimal'ni satr qilib yuborishi mumkin
 * ("50000.00"), ilovadagi hisob esa son kutadi. Normallashtirish shu
 * yerda bir marta bo'ladi — ekranlarda emas.
 */
const raw = (over: Record<string, unknown> = {}): RentalResponseDTO =>
  ({
    id: 'r1',
    clientId: 'c1',
    clientName: 'Akmal',
    itemName: 'Lesa',
    quantity: 10,
    price: 5000,
    paidAmount: 0,
    startDate: '2026-10-01',
    dueDate: '2026-10-04',
    ...over,
  }) as unknown as RentalResponseDTO;

describe('normalizeRental', () => {
  it('satr narx va summalarni songa aylantiradi', () => {
    const item = normalizeRental(raw({ price: '5000.00', paidAmount: '1200.50', quantity: '10.000' }));
    expect(item.price).toBe(5000);
    expect(item.paidAmount).toBe(1200.5);
    expect(item.quantity).toBe(10);
  });

  it('eski server faqat `dailyPrice` yuborsa ham narx chiqadi', () => {
    const item = normalizeRental(raw({ price: undefined, dailyPrice: '7000.00' }));
    expect(item.price).toBe(7000);
  });

  /*
   * Bu maydon `...raw` dan KEYIN turishi shart. Ilgari u tepada edi va
   * yoyilma normallashtirishni ustidan yozib ketardi: satr qiymat
   * joyida qolar, `formatCurrency` esa uni son emas deb "0 so'm"
   * chizardi.
   */
  it("kutayotgan to'lov satr bo'lib kelsa ham SON bo'ladi", () => {
    const item = normalizeRental(raw({ pendingPayment: '50000.00' }));
    expect(item.pendingPayment).toBe(50_000);
  });

  /*
   * BigDecimal nol "0.00" bo'lib keladi va SATR sifatida u rost
   * qiymat: kartadagi shart (`rental.pendingPayment ? ...`) o'tib,
   * bo'lmagan "to'lov tasdiq kutyapti" bloki chiqardi.
   */
  it("nol kutayotgan to'lov YOLG'ON qiymat bo'ladi — karta blok chizmaydi", () => {
    const item = normalizeRental(raw({ pendingPayment: '0.00' }));
    expect(item.pendingPayment).toBe(0);
    expect(Boolean(item.pendingPayment)).toBe(false);
  });

  it("to'lov so'rovi yo'q bo'lsa null qoladi", () => {
    expect(normalizeRental(raw()).pendingPayment).toBeNull();
    expect(normalizeRental(raw({ pendingPayment: null })).pendingPayment).toBeNull();
  });

  it("soat HH:mm ga qisqaradi va qaytarish partiyalari songa keladi", () => {
    const item = normalizeRental(
      raw({
        period: 'HOUR',
        startTime: '14:00:00',
        dueTime: '17:00:00',
        returns: [{ id: 'b1', quantity: '3.000', returnedDate: '2026-10-03', returnedTime: '18:30:00' }],
      }),
    );
    expect(item.startTime).toBe('14:00');
    expect(item.dueTime).toBe('17:00');
    expect(item.returns?.[0].quantity).toBe(3);
    expect(item.returns?.[0].returnedTime).toBe('18:30');
  });
});
