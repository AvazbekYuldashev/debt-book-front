import { OfflineQueuedError, ApiClientError } from '../../api/apiClient';
import { offlineTolerant } from '../offlineTolerant';

/**
 * Navbatga tushgan amal XATO EMAS.
 *
 * Aks holda modal yopilmas, ekranda qizil xabar chiqar va odam amalni
 * qayta kiritardi — internet qaytganda ikkita yozuv paydo bo'lardi.
 */
describe('offlineTolerant', () => {
  it('odatdagi natijani o\'zgarishsiz qaytaradi', async () => {
    const fn = offlineTolerant(async (n: number) => n * 2);
    await expect(fn(21)).resolves.toBe(42);
  });

  it('navbatga tushgan amalni MUVAFFAQIYAT deb qaytaradi', async () => {
    const fn = offlineTolerant(async () => {
      throw new OfflineQueuedError('saqlandi', 'kalit-1');
    });
    await expect(fn(undefined)).resolves.toBeUndefined();
  });

  it('haqiqiy xatoni YASHIRMAYDI', async () => {
    const fn = offlineTolerant(async () => {
      throw new ApiClientError('summa noto\'g\'ri', 400);
    });
    await expect(fn(undefined)).rejects.toThrow('summa noto\'g\'ri');
  });
});
