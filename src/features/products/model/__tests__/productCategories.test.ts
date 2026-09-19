import {
  ALL_CATEGORIES,
  UNCATEGORIZED,
  categoriesFromProducts,
  matchesCategory,
} from '../productCategories';

const p = (name: string, categoryId?: string | null, categoryName?: string | null) =>
  ({ name, categoryId, categoryName });

describe('categoriesFromProducts', () => {
  it('kategoriyalarni birinchi uchrash tartibida yig\'adi', () => {
    const result = categoriesFromProducts(
      [p('Non', 'c2', 'Nonushta'), p('Choy', 'c1', 'Ichimlik'), p('Kofe', 'c1', 'Ichimlik')],
      'Boshqa',
    );
    expect(result).toEqual([
      { id: 'c2', name: 'Nonushta' },
      { id: 'c1', name: 'Ichimlik' },
    ]);
  });

  it('kategoriyasizlar uchun oxiriga alohida variant qo\'shadi', () => {
    const result = categoriesFromProducts([p('Choy', 'c1', 'Ichimlik'), p('Tuz')], 'Boshqa');
    expect(result).toEqual([
      { id: 'c1', name: 'Ichimlik' },
      { id: UNCATEGORIZED, name: 'Boshqa' },
    ]);
  });

  it('bitta guruh bo\'lsa filtr chiqmaydi', () => {
    // Hammasi bitta kategoriyada.
    expect(categoriesFromProducts([p('Choy', 'c1', 'Ichimlik'), p('Kofe', 'c1', 'Ichimlik')], 'Boshqa')).toEqual([]);
    // Hammasi kategoriyasiz.
    expect(categoriesFromProducts([p('Tuz'), p('Shakar')], 'Boshqa')).toEqual([]);
    // Bo'sh ro'yxat.
    expect(categoriesFromProducts([], 'Boshqa')).toEqual([]);
  });

  it('nomi yo\'q kategoriya "boshqa" deb hisoblanadi', () => {
    // O'chirilgan kategoriya: id qolgan, nom kelmagan.
    const result = categoriesFromProducts([p('Choy', 'c1', 'Ichimlik'), p('Eski', 'c9', '')], 'Boshqa');
    expect(result).toEqual([
      { id: 'c1', name: 'Ichimlik' },
      { id: UNCATEGORIZED, name: 'Boshqa' },
    ]);
  });
});

describe('matchesCategory', () => {
  const choy = p('Choy', 'c1', 'Ichimlik');
  const tuz = p('Tuz');

  it('"hammasi" hech narsani chetlatmaydi', () => {
    expect(matchesCategory(choy, ALL_CATEGORIES)).toBe(true);
    expect(matchesCategory(tuz, ALL_CATEGORIES)).toBe(true);
  });

  it('aniq kategoriya faqat o\'zinikini o\'tkazadi', () => {
    expect(matchesCategory(choy, 'c1')).toBe(true);
    expect(matchesCategory(choy, 'c2')).toBe(false);
    expect(matchesCategory(tuz, 'c1')).toBe(false);
  });

  it('kategoriyasiz filtri faqat kategoriyasizlarni o\'tkazadi', () => {
    expect(matchesCategory(tuz, UNCATEGORIZED)).toBe(true);
    expect(matchesCategory(choy, UNCATEGORIZED)).toBe(false);
  });

  it('bo\'shliqli id/nom kategoriyasiz deb qaraladi', () => {
    const bosh = p('X', '   ', '   ');
    expect(matchesCategory(bosh, UNCATEGORIZED)).toBe(true);
    expect(matchesCategory(bosh, 'c1')).toBe(false);
  });

  it('nomi yo\'q, id bor mahsulot ham kategoriyasiz', () => {
    const ochirilgan = p('Eski', 'c9', null);
    expect(matchesCategory(ochirilgan, UNCATEGORIZED)).toBe(true);
    expect(matchesCategory(ochirilgan, 'c9')).toBe(false);
  });
});
