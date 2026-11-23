import { QueryClient } from '@tanstack/react-query';
import {
  addPendingToCache,
  applyPendingToTotals,
  buildPendingMoney,
  dropPendingFromCache,
  moneyDetailKey,
  pendingMoneyId,
  type MoneyDetailCache,
  type PendingMoneyInput,
} from '../moneyDetailCache';
import { mapTransaction } from '../transactionMapping';

/**
 * Oflaynda kiritilgan qarz DARHOL ko'rinishi kerak: ekranda hech narsa
 * o'zgarmasa odam "yozilmadi shekilli" deb qayta kiritar va internet
 * qaytganda ikkita yozuv paydo bo'lardi.
 */
const input = (over: Partial<PendingMoneyInput> = {}): PendingMoneyInput => ({
  partyType: 'PROFILE',
  partyId: 'kontakt-1',
  accountType: 'personal',
  isGive: true,
  amount: 5000,
  currency: 'UZS',
  key: 'kalit-1',
  ...over,
});

describe('oflayn pul yozuvi', () => {
  it('"men berdim" HAQ bo\'lib ko\'rinadi', () => {
    const record = buildPendingMoney(input({ isGive: true }));
    const mapped = mapTransaction(record, { partyType: 'PROFILE', partyId: 'men' }, {
      id: 'kontakt-1',
      partyType: 'PROFILE',
    });
    expect(mapped.kind).toBe('credit');
  });

  it('"men oldim" QARZ bo\'lib ko\'rinadi', () => {
    const record = buildPendingMoney(input({ isGive: false }));
    const mapped = mapTransaction(record, { partyType: 'PROFILE', partyId: 'men' }, {
      id: 'kontakt-1',
      partyType: 'PROFILE',
    });
    expect(mapped.kind).toBe('debt');
  });

  it('yozuv "yuborilmagan" deb belgilanadi', () => {
    expect(buildPendingMoney(input()).pending).toBe(true);
  });

  it('summalar ham darhol o\'zgaradi', () => {
    const berdim = applyPendingToTotals({ creditByCurrency: { UZS: 1000 } }, input({ isGive: true }));
    expect(berdim.creditByCurrency?.UZS).toBe(6000);

    const oldim = applyPendingToTotals(null, input({ isGive: false, amount: 700 }));
    expect(oldim.debtByCurrency?.UZS).toBe(700);
  });

  it('keshga tepaga qo\'shiladi — ro\'yxatda birinchi turadi', () => {
    const qc = new QueryClient();
    const key = moneyDetailKey('PROFILE', 'kontakt-1', 'personal');
    qc.setQueryData<MoneyDetailCache>(key, {
      content: [{ id: 'eski', amount: 1, visible: true, createdDate: '2026-01-01', description: '' }],
      totals: null,
    });

    addPendingToCache(qc, input());

    const data = qc.getQueryData<MoneyDetailCache>(key)!;
    expect(data.content[0].id).toBe(pendingMoneyId('kalit-1'));
    expect(data.content[1].id).toBe('eski');
  });

  it('yuborilgach vaqtinchalik yozuv keshdan OLIB TASHLANADI', () => {
    const qc = new QueryClient();
    addPendingToCache(qc, input());
    expect(qc.getQueryData<MoneyDetailCache>(
      moneyDetailKey('PROFILE', 'kontakt-1', 'personal'),
    )!.content).toHaveLength(1);

    dropPendingFromCache(qc, 'kalit-1');

    // Aks holda server bergan haqiqiy yozuv yonida turib qolar va odam
    // bitta qarzni ikkita bo'lib ko'rardi.
    expect(qc.getQueryData<MoneyDetailCache>(
      moneyDetailKey('PROFILE', 'kontakt-1', 'personal'),
    )!.content).toHaveLength(0);
  });

  it('boshqa amalning kaliti bilan hech narsa o\'chmaydi', () => {
    const qc = new QueryClient();
    addPendingToCache(qc, input());

    dropPendingFromCache(qc, 'boshqa-kalit');

    expect(qc.getQueryData<MoneyDetailCache>(
      moneyDetailKey('PROFILE', 'kontakt-1', 'personal'),
    )!.content).toHaveLength(1);
  });
});
