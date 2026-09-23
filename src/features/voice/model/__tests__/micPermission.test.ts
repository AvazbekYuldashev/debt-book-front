import { micPermission } from '../micPermission';

/**
 * Ruxsat holati.
 *
 * Bu "chiroyli qo'shimcha" emas: ruxsat bir marta rad etilgan bo'lsa,
 * brauzer keyingi safar UMUMAN so'ramaydi. Holatni bilmasak,
 * foydalanuvchiga "ruxsat bering" deb aytardik — u esa hech qanday so'rov
 * ko'rmaydi va dastur buzilgan deb o'ylaydi.
 */
describe('micPermission', () => {
  const api = (state: string) => ({ query: jest.fn(async () => ({ state })) });

  it('brauzer aytgan holatni qaytaradi', async () => {
    expect(await micPermission(api('granted'))).toBe('granted');
    expect(await micPermission(api('denied'))).toBe('denied');
    expect(await micPermission(api('prompt'))).toBe('prompt');
  });

  it('mikrofon nomi bilan so\'raydi', async () => {
    const source = api('prompt');
    await micPermission(source);
    expect(source.query).toHaveBeenCalledWith({ name: 'microphone' });
  });

  /**
   * Permissions API hamma joyda yo'q (Safari mikrofon uchun qo'llamaydi).
   * Bu XATO EMAS — shunda oddiy yo'l bilan so'raymiz.
   */
  it('API bo\'lmasa noma\'lum deydi', async () => {
    expect(await micPermission(null)).toBe('unknown');
    expect(await micPermission({ query: undefined as never })).toBe('unknown');
  });

  it('so\'rov yiqilsa ham istisno ko\'tarmaydi', async () => {
    const throwing = {
      query: jest.fn(async () => {
        throw new TypeError('microphone is not a valid permission name');
      }),
    };
    expect(await micPermission(throwing)).toBe('unknown');
  });

  it('kutilmagan qiymat noma\'lum sanaladi', async () => {
    expect(await micPermission(api('nimadir'))).toBe('unknown');
  });
});
