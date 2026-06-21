import { computeTotalsFromHistory } from '../computeContactBalance';
import { MoneyResponseDTO } from '../../../types/money';

const tx = (over: Partial<MoneyResponseDTO>): MoneyResponseDTO => ({
  id: Math.random().toString(),
  amount: 0,
  visible: true,
  createdDate: '2026-01-01',
  description: '',
  ...over,
});

describe('computeTotalsFromHistory (PROFILE aktyor)', () => {
  const actor = { type: 'PROFILE' as const, id: 'me' };

  it('aktyor kreditor bo‘lsa -> totalCredit', () => {
    const history = [tx({ amount: 100, creditorId: 'me', debtorId: 'other' })];
    const r = computeTotalsFromHistory(history, actor, 'other', 'PROFILE');
    expect(r).toEqual({ totalDebt: 0, totalCredit: 100, balance: 100 });
  });

  it('aktyor debitor bo‘lsa -> totalDebt', () => {
    const history = [tx({ amount: 70, creditorId: 'other', debtorId: 'me' })];
    const r = computeTotalsFromHistory(history, actor, 'other', 'PROFILE');
    expect(r).toEqual({ totalDebt: 70, totalCredit: 0, balance: -70 });
  });

  it('aralash tarix -> to‘g‘ri balans', () => {
    const history = [
      tx({ amount: 200, creditorId: 'me', debtorId: 'other' }),
      tx({ amount: 50, creditorId: 'other', debtorId: 'me' }),
    ];
    const r = computeTotalsFromHistory(history, actor, 'other', 'PROFILE');
    expect(r.balance).toBe(150);
  });

  it('aktyor topilmasa, counterparty bo‘yicha aniqlaydi', () => {
    // aktyor 'me' yo'q; counterparty 'cp' debitor -> aktyor kreditor deb sanaladi
    const history = [tx({ amount: 90, debtorId: 'cp', creditorId: 'someoneElse' })];
    const r = computeTotalsFromHistory(history, { type: 'PROFILE', id: 'me' }, 'cp', 'PROFILE');
    expect(r.totalCredit).toBe(90);
  });
});

describe('computeTotalsFromHistory (BUSINESS aktyor)', () => {
  it('business kreditor -> totalCredit', () => {
    const history = [tx({ amount: 300, creditorBusinessId: 'biz', creditorType: 'BUSINESS_ACCOUNT', debtorId: 'cp' })];
    const r = computeTotalsFromHistory(history, { type: 'BUSINESS_ACCOUNT', id: 'biz' }, 'cp', 'PROFILE');
    expect(r.totalCredit).toBe(300);
  });
});
