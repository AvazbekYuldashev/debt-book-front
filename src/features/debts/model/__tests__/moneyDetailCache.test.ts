import { QueryClient } from '@tanstack/react-query';
import { moneyDetailKey, prefetchMoneyDetails } from '../moneyDetailCache';
import { getMoneyHistory, getTotalPriceByPartyId } from '../../services/moneyService';

jest.mock('../../services/moneyService', () => ({
  getMoneyHistory: jest.fn(),
  getTotalPriceByPartyId: jest.fn(),
}));

const history = getMoneyHistory as jest.Mock;
const totals = getTotalPriceByPartyId as jest.Mock;

/**
 * Oflaynda odam FAQAT o'zi kirib ko'rgan kontaktni emas, HAMMASINI
 * ocha olishi kerak. Shuning uchun ro'yxat kelgach tafsilotlar fonda
 * oldindan yuklanadi.
 */
describe('kontakt tafsilotlarini oldindan yuklash', () => {
  const kontakt = (id: string) => ({ id, partyType: 'PROFILE' as const });

  beforeEach(() => {
    jest.clearAllMocks();
    history.mockResolvedValue({ content: [{ id: 'm1', createdDate: '2026-01-01' }] });
    totals.mockResolvedValue({ totalDebt: 1000 });
  });

  it('har kontakt uchun keshga yozadi', async () => {
    const qc = new QueryClient();
    await prefetchMoneyDetails(qc, [kontakt('a'), kontakt('b')], 'token', 'personal');

    expect(qc.getQueryData(moneyDetailKey('PROFILE', 'a', 'personal'))).toBeTruthy();
    expect(qc.getQueryData(moneyDetailKey('PROFILE', 'b', 'personal'))).toBeTruthy();
  });

  it('keshda bor kontaktni QAYTA yuklamaydi', async () => {
    const qc = new QueryClient();
    qc.setQueryData(moneyDetailKey('PROFILE', 'a', 'personal'), { content: [], totals: null });

    await prefetchMoneyDetails(qc, [kontakt('a'), kontakt('b')], 'token', 'personal');

    // Faqat 'b' so'ralishi kerak: maqsad oflaynda ochish imkoni, eng
    // yangi raqam emas.
    expect(totals).toHaveBeenCalledTimes(1);
  });

  it('tarmoq yo\'q bo\'lsa halqa BEHUDA aylanmaydi', async () => {
    const qc = new QueryClient();
    totals.mockRejectedValue(new Error('tarmoq yo\'q'));
    history.mockRejectedValue(new Error('tarmoq yo\'q'));

    await prefetchMoneyDetails(qc, [kontakt('a'), kontakt('b'), kontakt('c')], 'token', 'personal');

    // Birinchi yiqilishda to'xtaydi — qolganiga urinmaydi.
    expect(history).toHaveBeenCalledTimes(1);
  });

  it('juda uzun ro\'yxatda chegara bor', async () => {
    const qc = new QueryClient();
    const kopKontakt = Array.from({ length: 200 }, (_, i) => kontakt(`k${i}`));

    await prefetchMoneyDetails(qc, kopKontakt, 'token', 'personal', 5);

    expect(totals).toHaveBeenCalledTimes(5);
  });
});
