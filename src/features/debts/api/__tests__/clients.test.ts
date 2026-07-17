// apiClient'ni mock qilamiz — tarmoqqa chiqmasdan client.ts mantig'ini sinaymiz.
jest.mock('../../../../shared/api/apiClient', () => {
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
    default: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
    ApiClientError,
  };
});

import apiClient, { ApiClientError } from '../../../../shared/api/apiClient';
import { getMyClients, createClient } from '../clients';

const mockedGet = apiClient.get as jest.Mock;
const mockedPost = apiClient.post as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getMyClients', () => {
  it('paginatsiyalangan {content} javobini massivga aylantiradi', async () => {
    mockedGet.mockResolvedValueOnce({
      data: { content: [{ id: '1', name: 'A' }], last: true, totalPages: 1, number: 0 },
    });
    const result = await getMyClients('jwt');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('to‘g‘ridan-to‘g‘ri massiv javobini ham qabul qiladi', async () => {
    mockedGet.mockResolvedValueOnce({ data: [{ id: '2', name: 'B' }] });
    const result = await getMyClients('jwt');
    expect(result[0].id).toBe('2');
  });

  it('Authorization header tokenni biriktiradi', async () => {
    mockedGet.mockResolvedValueOnce({ data: { content: [], last: true, totalPages: 1 } });
    await getMyClients('my-token');
    expect(mockedGet).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ headers: { Authorization: 'Bearer my-token' } })
    );
  });

  it('404 (recoverable) da keyingi yo‘lga o‘tadi (fallback)', async () => {
    mockedGet
      .mockRejectedValueOnce(new ApiClientError('not found', 404))
      .mockResolvedValueOnce({ data: { content: [{ id: '3', name: 'C' }], last: true, totalPages: 1 } });
    const result = await getMyClients('jwt');
    expect(result[0].id).toBe('3');
    expect(mockedGet).toHaveBeenCalledTimes(2);
  });
});

describe('createClient', () => {
  it('{ data: {...} } wrapper ichidagi obyektni ochib qaytaradi', async () => {
    mockedPost.mockResolvedValueOnce({ data: { data: { id: '10', name: 'New' } } });
    const created = await createClient('jwt', { name: 'New', phoneNumber: '998901234567' });
    expect(created.id).toBe('10');
  });

  it('wrappersiz to‘g‘ridan-to‘g‘ri obyektni qaytaradi', async () => {
    mockedPost.mockResolvedValueOnce({ data: { id: '11', name: 'Raw' } });
    const created = await createClient('jwt', { name: 'Raw', phoneNumber: '998901234567' });
    expect(created.id).toBe('11');
  });
});
