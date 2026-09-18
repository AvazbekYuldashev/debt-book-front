import { groupByCategory } from '../groupByCategory';

const p = (name: string, categoryId?: string | null, categoryName?: string | null) =>
  ({ name, categoryId, categoryName });

const shape = (sections: ReturnType<typeof groupByCategory>) =>
  sections.map((s) => [s.title, s.data.map((d: any) => d.name)]);

describe('groupByCategory', () => {
  it('kategoriyalar bo\'yicha ajratadi', () => {
    const result = groupByCategory(
      [
        p('Choy', 'c1', 'Ichimlik'),
        p('Non', 'c2', 'Nonushta'),
        p('Kofe', 'c1', 'Ichimlik'),
      ],
      'Boshqa',
    );

    expect(shape(result)).toEqual([
      ['Ichimlik', ['Choy', 'Kofe']],
      ['Nonushta', ['Non']],
    ]);
  });

  it('guruh ichidagi tartibga TEGMAYDI (server tartibi saqlanadi)', () => {
    const result = groupByCategory(
      [p('Zira', 'c1', 'Ziravor'), p('Anis', 'c1', 'Ziravor')],
      'Boshqa',
    );
    // Alifbo bo'yicha saralanmaydi — "ko'p olingan tepada" tartibi muhim.
    expect(result[0].data.map((d: any) => d.name)).toEqual(['Zira', 'Anis']);
  });

  it('guruhlar birinchi uchrash tartibida keladi', () => {
    const result = groupByCategory(
      [p('Non', 'c2', 'Nonushta'), p('Choy', 'c1', 'Ichimlik')],
      'Boshqa',
    );
    expect(result.map((s) => s.title)).toEqual(['Nonushta', 'Ichimlik']);
  });

  it('kategoriyasizlar oxirgi guruhda, yo\'qolmaydi', () => {
    const result = groupByCategory(
      [p('Tuz'), p('Choy', 'c1', 'Ichimlik'), p('Shakar', null, null)],
      'Boshqa',
    );

    expect(shape(result)).toEqual([
      ['Ichimlik', ['Choy']],
      ['Boshqa', ['Tuz', 'Shakar']],
    ]);
  });

  it('nomi yo\'q kategoriya "boshqa"ga tushadi', () => {
    // O'chirilgan kategoriya: id qolgan, nom kelmagan.
    const result = groupByCategory([p('Choy', 'c1', '')], 'Boshqa');
    expect(shape(result)).toEqual([['Boshqa', ['Choy']]]);
  });

  it('bo\'shliqli id/nom ham "boshqa"ga tushadi', () => {
    const result = groupByCategory([p('Choy', '   ', '   ')], 'Boshqa');
    expect(shape(result)).toEqual([['Boshqa', ['Choy']]]);
  });

  it('hamma kategoriyali bo\'lsa "boshqa" guruhi umuman chiqmaydi', () => {
    const result = groupByCategory([p('Choy', 'c1', 'Ichimlik')], 'Boshqa');
    expect(result).toHaveLength(1);
  });

  it('bo\'sh ro\'yxat bo\'sh natija beradi', () => {
    expect(groupByCategory([], 'Boshqa')).toEqual([]);
  });

  it('birorta mahsulot yo\'qolmaydi', () => {
    const items = [p('a', 'c1', 'A'), p('b'), p('c', 'c2', 'B'), p('d', 'c1', 'A')];
    const result = groupByCategory(items, 'Boshqa');
    const total = result.reduce((sum, s) => sum + s.data.length, 0);
    expect(total).toBe(items.length);
  });
});
