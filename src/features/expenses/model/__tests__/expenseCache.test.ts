import { QueryClient } from '@tanstack/react-query';
import {
  buildPendingCategory,
  buildPendingExpense,
  categoriesKey,
  categorySumsKey,
  expenseListKey,
} from '../expenseCache';
import { buildPendingProduct, productsKey } from '../../../products/model/productCache';
import { dropPendingEverywhere } from '../../../../shared/lib/pendingWrites';
import { prependToCache } from '../../../../shared/lib/listCache';

/**
 * Oflaynda kiritilgan kategoriya, xarajat va mahsulot DARHOL ko'rinishi,
 * yuborilgach esa server bergan yozuvga almashishi kerak.
 */
describe('oflayn kesh kalitlari', () => {
  it('HISOB bo\'yicha ajratiladi', () => {
    // Aralashsa odam shaxsiy hisobida biznesning kategoriyasini
    // ko'rib qolardi.
    expect(categoriesKey('personal:u1', 'EXPENSE')).not.toEqual(
      categoriesKey('business:b1', 'EXPENSE'),
    );
  });

  it('kategoriya TURI bo\'yicha ajratiladi', () => {
    // Xarajat kategoriyasi narxnomada ko'rinmasligi kerak.
    expect(categoriesKey('personal:u1', 'EXPENSE')).not.toEqual(
      categoriesKey('personal:u1', 'PRODUCT'),
    );
  });

  it('summalar va xarajatlar SANA ORALIG\'I bo\'yicha ajratiladi', () => {
    expect(categorySumsKey('personal:u1', '2026-01-01', '2026-01-31')).not.toEqual(
      categorySumsKey('personal:u1', '2026-02-01', '2026-02-28'),
    );
    expect(expenseListKey('personal:u1', 'kat-1', '2026-01-01', '2026-01-31')).not.toEqual(
      expenseListKey('personal:u1', 'kat-1', '2026-02-01', '2026-02-28'),
    );
  });
});

describe('oflaynda kiritilgan yozuvlar', () => {
  it('kategoriya soat belgisi bilan ro\'yxat boshida turadi', () => {
    const qc = new QueryClient();
    const key = categoriesKey('personal:u1', 'EXPENSE');
    qc.setQueryData(key, [{ id: 'eski', name: 'Oziq-ovqat' }]);

    const row = buildPendingCategory('k1', 'Benzin', 'EXPENSE');
    prependToCache(qc, key, row);

    expect(row.pending).toBe(true);
    expect(row.name).toBe('Benzin');
    expect(qc.getQueryData<{ id: string }[]>(key)?.[0].id).toBe(row.id);
  });

  it('xarajat summasi va izohi saqlanadi', () => {
    const row = buildPendingExpense('k2', {
      amount: 25000,
      categoryId: 'kat-1',
      description: 'Taksi',
      calcNote: '5000*5',
    });

    expect(row.amount).toBe(25000);
    expect(row.description).toBe('Taksi');
    expect(row.calcNote).toBe('5000*5');
    expect(row.pending).toBe(true);
  });

  it('mahsulot narxi va birligi saqlanadi', () => {
    const row = buildPendingProduct(
      'k3',
      { name: 'Non', price: 4000, currency: 'UZS', unit: 'DONA', categoryId: 'kat-9' },
      'Nonvoyxona',
    );

    expect(row.price).toBe(4000);
    expect(row.unit).toBe('DONA');
    expect(row.categoryName).toBe('Nonvoyxona');
    expect(row.pending).toBe(true);
  });

  it('yuborilgach UCHALASI ham keshdan yo\'qoladi', () => {
    const qc = new QueryClient();
    const katKey = categoriesKey('personal:u1', 'EXPENSE');
    const xarKey = expenseListKey('personal:u1', 'kat-1', '2026-01-01', '2026-01-31');
    const mahKey = productsKey('business:b1');

    prependToCache(qc, katKey, buildPendingCategory('k1', 'Benzin', 'EXPENSE'));
    prependToCache(qc, xarKey, buildPendingExpense('k1', { amount: 1, categoryId: 'kat-1' }));
    prependToCache(
      qc,
      mahKey,
      buildPendingProduct('k1', { name: 'Non', price: 1, currency: 'UZS', unit: 'DONA' }),
    );

    dropPendingEverywhere(qc, 'k1');

    expect(qc.getQueryData(katKey)).toEqual([]);
    expect(qc.getQueryData(xarKey)).toEqual([]);
    expect(qc.getQueryData(mahKey)).toEqual([]);
  });
});
