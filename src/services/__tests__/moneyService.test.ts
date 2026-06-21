jest.mock('../../api/apiClient', () => {
  class ApiClientError extends Error {
    status?: number;
    constructor(message: string, status?: number) {
      super(message);
      this.name = 'ApiClientError';
      this.status = status;
    }
  }
  return {
    __esModule: true,
    default: { get: jest.fn(), post: jest.fn() },
    ApiClientError,
    setApiAuthToken: jest.fn(),
  };
});

import apiClient, { ApiClientError } from '../../api/apiClient';
import { getMoneyHistory, getTotalPriceByPartyId } from '../moneyService';

const mockedGet = apiClient.get as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getMoneyHistory', () => {
  it('amount string -> number normalizatsiya qiladi', async () => {
    mockedGet.mockResolvedValueOnce({
      data: { content: [{ id: '1', amount: '1500', description: '' }], last: true, totalPages: 1, number: 0, size: 15, totalElements: 1 },
    });
    const page = await getMoneyHistory({ id: 'x', partyType: 'PROFILE' });
    expect(page.content[0].amount).toBe(1500);
  });

  it('404 da xato tashlamay bo‘sh sahifa qaytaradi', async () => {
    mockedGet.mockRejectedValue(new ApiClientError('no relation', 404));
    const page = await getMoneyHistory({ id: 'x', partyType: 'PROFILE' });
    expect(page.content).toEqual([]);
    expect(page.last).toBe(true);
  });
});

describe('getTotalPriceByPartyId', () => {
  it('404 da nol qaytaradi (fallback hisoblashga o‘tish uchun)', async () => {
    mockedGet.mockRejectedValue(new ApiClientError('no relation', 404));
    const res = await getTotalPriceByPartyId('x', 'PROFILE');
    expect(res).toEqual({ totalDebt: 0, totalCredit: 0, balance: 0 });
  });
});
