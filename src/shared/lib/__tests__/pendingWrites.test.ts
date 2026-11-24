import { QueryClient } from '@tanstack/react-query';
import { dropPendingEverywhere, pendingId } from '../pendingWrites';
import { prependToCache, removeFromCache } from '../listCache';

/**
 * Oflayn amal yuborilgach vaqtinchalik yozuv keshdan OLIB TASHLANISHI
 * kerak. Aks holda server bergan haqiqiy yozuv uning yonida turib
 * qolar va odam bitta amalni ikkita bo'lib ko'rardi.
 */
describe('vaqtinchalik yozuvlar', () => {
  const satr = (id: string) => ({ id, name: `qator ${id}` });

  it('oddiy ro\'yxatdan olib tashlaydi', () => {
    const qc = new QueryClient();
    qc.setQueryData(['categories', 'shaxsiy'], [satr(pendingId('k1')), satr('eski')]);

    dropPendingEverywhere(qc, 'k1');

    expect(qc.getQueryData(['categories', 'shaxsiy'])).toEqual([satr('eski')]);
  });

  it('sahifa ko\'rinishidagi ro\'yxatdan ham olib tashlaydi', () => {
    const qc = new QueryClient();
    qc.setQueryData(['money-detail', 'a'], {
      content: [satr(pendingId('k1')), satr('eski')],
      totals: { totalDebt: 500 },
    });

    dropPendingEverywhere(qc, 'k1');

    expect(qc.getQueryData(['money-detail', 'a'])).toEqual({
      content: [satr('eski')],
      totals: { totalDebt: 500 },
    });
  });

  it('BIR NECHTA ro\'yxatdan bir yo\'la olib tashlaydi', () => {
    const qc = new QueryClient();
    qc.setQueryData(['categories', 'shaxsiy'], [satr(pendingId('k1'))]);
    qc.setQueryData(['products', 'biznes'], [satr(pendingId('k1'))]);

    dropPendingEverywhere(qc, 'k1');

    expect(qc.getQueryData(['categories', 'shaxsiy'])).toEqual([]);
    expect(qc.getQueryData(['products', 'biznes'])).toEqual([]);
  });

  it('boshqa amalning kaliti bilan hech narsa o\'chmaydi', () => {
    const qc = new QueryClient();
    qc.setQueryData(['categories', 'shaxsiy'], [satr(pendingId('k1'))]);

    dropPendingEverywhere(qc, 'boshqa');

    expect(qc.getQueryData(['categories', 'shaxsiy'])).toEqual([satr(pendingId('k1'))]);
  });
});

describe('ro\'yxat keshini qo\'lda o\'zgartirish', () => {
  it('yangi yozuv TEPAGA qo\'shiladi', () => {
    const qc = new QueryClient();
    qc.setQueryData(['products', 'biznes'], [{ id: 'eski' }]);

    prependToCache(qc, ['products', 'biznes'], { id: 'yangi' });

    expect(qc.getQueryData(['products', 'biznes'])).toEqual([{ id: 'yangi' }, { id: 'eski' }]);
  });

  it('kesh bo\'sh bo\'lsa o\'chirish BO\'SH RO\'YXAT yasamaydi', () => {
    const qc = new QueryClient();

    removeFromCache(qc, ['products', 'biznes'], 'yo\'q');

    /*
     * Aks holda bu yerda bo'sh ro'yxat paydo bo'lar va ekran
     * "mahsulot yo'q" deb ko'rsatardi — holbuki ma'lumot shunchaki
     * hali yuklanmagan.
     */
    expect(qc.getQueryData(['products', 'biznes'])).toBeUndefined();
  });
});
