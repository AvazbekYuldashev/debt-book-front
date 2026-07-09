import { computeTotalsFromHistory, isEmptyTotals } from '../computeContactBalance';
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

  it('aktyor kreditor bo‘lsa -> credit (UZS default)', () => {
    const history = [tx({ amount: 100, creditorId: 'me', debtorId: 'other' })];
    const r = computeTotalsFromHistory(history, actor, 'other', 'PROFILE');
    expect(r).toEqual({ credit: { UZS: 100 }, debt: {} });
  });

  it('aktyor debitor bo‘lsa -> debt (UZS default)', () => {
    const history = [tx({ amount: 70, creditorId: 'other', debtorId: 'me' })];
    const r = computeTotalsFromHistory(history, actor, 'other', 'PROFILE');
    expect(r).toEqual({ credit: {}, debt: { UZS: 70 } });
  });

  it('turli valyutalar alohida yig‘iladi', () => {
    const history = [
      tx({ amount: 200, currency: 'UZS', creditorId: 'me', debtorId: 'other' }),
      tx({ amount: 100, currency: 'USD', creditorId: 'me', debtorId: 'other' }),
      tx({ amount: 50, currency: 'USD', creditorId: 'other', debtorId: 'me' }),
    ];
    const r = computeTotalsFromHistory(history, actor, 'other', 'PROFILE');
    expect(r.credit).toEqual({ UZS: 200, USD: 100 });
    expect(r.debt).toEqual({ USD: 50 });
  });

  it('aktyor topilmasa, counterparty bo‘yicha aniqlaydi', () => {
    const history = [tx({ amount: 90, debtorId: 'cp', creditorId: 'someoneElse' })];
    const r = computeTotalsFromHistory(history, { type: 'PROFILE', id: 'me' }, 'cp', 'PROFILE');
    expect(r.credit.UZS).toBe(90);
  });
});

describe('computeTotalsFromHistory (BUSINESS aktyor)', () => {
  it('business kreditor -> credit', () => {
    const history = [tx({ amount: 300, creditorBusinessId: 'biz', creditorType: 'BUSINESS_ACCOUNT', debtorId: 'cp' })];
    const r = computeTotalsFromHistory(history, { type: 'BUSINESS_ACCOUNT', id: 'biz' }, 'cp', 'PROFILE');
    expect(r.credit.UZS).toBe(300);
  });
});

describe('isEmptyTotals', () => {
  it('bo‘sh xaritalar -> true', () => {
    expect(isEmptyTotals({ credit: {}, debt: {} })).toBe(true);
  });
  it('qiymat bor -> false', () => {
    expect(isEmptyTotals({ credit: { USD: 5 }, debt: {} })).toBe(false);
  });
});
