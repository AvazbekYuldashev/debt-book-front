import { buildProductPayload } from '../productPayload';
import type { ProductFormValues } from '../../components/ProductFormModal';

const values = (over: Partial<ProductFormValues> = {}): ProductFormValues => ({
  name: 'Fanta',
  code: '',
  price: 7000,
  currency: 'UZS',
  unit: 'LITR',
  amount: 1,
  description: '',
  categoryId: '',
  ...over,
});

describe('buildProductPayload', () => {
  /**
   * REGRESSIYA: miqdor payload'ga kirmay qolgan edi va hamma mahsulot 1
   * bo'lib saqlanardi. Nuqson UI'da ko'rinmasdi — faqat bazada.
   */
  it('miqdorni HAR DOIM yuboradi', () => {
    expect(buildProductPayload(values({ amount: 0.5 })).amount).toBe(0.5);
    expect(buildProductPayload(values({ amount: 1 })).amount).toBe(1);
    expect(buildProductPayload(values({ amount: 1.5 })).amount).toBe(1.5);
  });

  it("noto'g'ri miqdor 1 ga keltiriladi", () => {
    expect(buildProductPayload(values({ amount: 0 })).amount).toBe(1);
    expect(buildProductPayload(values({ amount: -3 })).amount).toBe(1);
  });

  it('asosiy maydonlar joyida', () => {
    const payload = buildProductPayload(values({ amount: 0.5 }));
    expect(payload).toEqual({
      name: 'Fanta',
      price: 7000,
      currency: 'UZS',
      unit: 'LITR',
      amount: 0.5,
    });
  });

  it("bo'sh artikul, izoh va kategoriya YUBORILMAYDI", () => {
    const payload = buildProductPayload(values({ code: '   ', description: '  ', categoryId: '' }));
    expect(payload).not.toHaveProperty('code');
    expect(payload).not.toHaveProperty('description');
    expect(payload).not.toHaveProperty('categoryId');
  });

  it("to'ldirilgan qo'shimcha maydonlar yuboriladi", () => {
    const payload = buildProductPayload(
      values({ code: 'FN-1', description: 'Shirin', categoryId: 'c1' }),
    );
    expect(payload.code).toBe('FN-1');
    expect(payload.description).toBe('Shirin');
    expect(payload.categoryId).toBe('c1');
  });

  it("atrofdagi bo'shliqlar olib tashlanadi", () => {
    const payload = buildProductPayload(
      values({ name: '  Fanta  ', code: ' FN-1 ', description: ' Shirin ', categoryId: ' c1 ' }),
    );
    expect(payload.name).toBe('Fanta');
    expect(payload.code).toBe('FN-1');
    expect(payload.description).toBe('Shirin');
    expect(payload.categoryId).toBe('c1');
  });

  it('narx nol bo\'lishi mumkin (aksiya, bepul)', () => {
    expect(buildProductPayload(values({ price: 0 })).price).toBe(0);
  });
});
