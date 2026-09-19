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

/**
 * REGRESSIYA: 400 boshqa manzilga o'tishga sabab bo'lmasligi kerak.
 *
 * Production'da odam o'z raqamini kontakt qilib qo'shmoqchi bo'ldi. Server
 * to'g'ri javob berdi: 400 "Foydalanuvchi o'zini qo'sha olmaydi". Lekin
 * 400 ham "qayta urinsa bo'ladi" deb qaralgani uchun kod /core/client ga
 * o'tdi, u yerdan 404 keldi va ekranda "No static resource
 * api/v1/core/client" chiqdi — asl sabab butunlay yo'qoldi.
 */
describe('xato holatlari — qaysi biri zaxira manzilni ishga tushiradi', () => {
  it("400 DARHOL qaytariladi, ikkinchi manzil sinalmaydi", async () => {
    mockedPost.mockRejectedValueOnce(new ApiClientError("Foydalanuvchi o'zini qo'sha olmaydi.", 400));

    await expect(createClient('jwt', { name: 'A', phoneNumber: '998901112233' } as any)).rejects.toThrow(
      "Foydalanuvchi o'zini qo'sha olmaydi.",
    );
    // Aynan bitta urinish: /core/client ga o'tilmagan.
    expect(mockedPost).toHaveBeenCalledTimes(1);
  });

  it("404 bo'lsa zaxira manzil sinaladi", async () => {
    mockedPost
      .mockRejectedValueOnce(new ApiClientError('No static resource', 404))
      .mockResolvedValueOnce({ data: { id: '9', name: 'A' } });

    const created = await createClient('jwt', { name: 'A', phoneNumber: '998901112233' } as any);
    expect(created.id).toBe('9');
    expect(mockedPost).toHaveBeenCalledTimes(2);
  });

  it('409 kabi boshqa xatolar ham darhol qaytariladi', async () => {
    mockedPost.mockRejectedValueOnce(new ApiClientError('Allaqachon mavjud', 409));

    await expect(createClient('jwt', { name: 'A', phoneNumber: '998901112233' } as any)).rejects.toThrow(
      'Allaqachon mavjud',
    );
    expect(mockedPost).toHaveBeenCalledTimes(1);
  });

  it("ro'yxat olishda ham 400 zaxira manzilga o'tmaydi", async () => {
    mockedGet.mockRejectedValueOnce(new ApiClientError("Noto'g'ri so'rov", 400));

    await expect(getMyClients('jwt')).rejects.toThrow("Noto'g'ri so'rov");
    expect(mockedGet).toHaveBeenCalledTimes(1);
  });
});
