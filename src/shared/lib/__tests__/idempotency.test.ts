import { IDEMPOTENCY_HEADER, newIdempotencyKey, withIdempotencyKey } from '../idempotency';

/**
 * "Bir amal — bitta yozuv" kalitining ikki sharti:
 *   1. har amalga YANGI kalit (ikki xarajat bitta deb hisoblanmasin);
 *   2. bitta amalning barcha urinishlarida AYNI kalit (javob yo'qolib
 *      so'rov qaytarilsa, pul ikki marta yozilmasin).
 */
describe('idempotency kaliti', () => {
  it('har chaqiruvda boshqa kalit beradi', () => {
    const kalitlar = new Set(Array.from({ length: 50 }, () => newIdempotencyKey()));
    expect(kalitlar.size).toBe(50);
  });

  it('kalit sarlavhaga qo\'shiladi', () => {
    const config = withIdempotencyKey(undefined, 'k-1');
    expect(config?.headers?.[IDEMPOTENCY_HEADER]).toBe('k-1');
  });

  it('mavjud sozlamani buzmaydi', () => {
    const config = withIdempotencyKey({ params: { a: 1 }, headers: { 'X-Test': 'bor' } }, 'k-2');
    expect(config?.params).toEqual({ a: 1 });
    expect(config?.headers?.['X-Test']).toBe('bor');
    expect(config?.headers?.[IDEMPOTENCY_HEADER]).toBe('k-2');
  });

  it('kalit bo\'lmasa sozlama o\'zgarmaydi', () => {
    const asl = { params: { a: 1 } };
    expect(withIdempotencyKey(asl, undefined)).toBe(asl);
    expect(withIdempotencyKey(undefined, undefined)).toBeUndefined();
  });
});
