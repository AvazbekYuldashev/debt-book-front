import MockAdapter from 'axios-mock-adapter';

/**
 * OFLAYN YOZUVNING TO'LIQ ZANJIRI:
 *   tarmoq yo'q -> amal navbatga tushadi -> internet qaytadi ->
 *   o'sha amal AYNI kalit bilan serverga yetib boradi.
 *
 * Kalitning o'zgarmasligi muhim: server takrorni aynan undan taniydi va
 * pulni ikki marta yozmaydi.
 */

const mockDisk = new Map<string, string>();
jest.mock('../../lib/storage', () => ({
  storage: {
    get: async (k: string) => mockDisk.get(k) ?? null,
    set: async (k: string, v: string) => {
      mockDisk.set(k, v);
    },
    remove: async (k: string) => {
      mockDisk.delete(k);
    },
  },
}));

const settle = async (): Promise<void> => {
  for (let i = 0; i < 5; i += 1) await Promise.resolve();
};

describe('oflayn yozuvlar', () => {
  beforeEach(() => {
    mockDisk.clear();
    jest.resetModules();
  });

  it('tarmoqsiz yozuv navbatga tushadi va "saqlandi" xatosini beradi', async () => {
    const { apiClient, isQueuedOffline } = require('../apiClient');
    const { outbox } = require('../../lib/outbox');
    const mock = new MockAdapter(apiClient);
    mock.onPost('/core/debt/give').networkError();

    let tutilgan: unknown;
    try {
      await apiClient.post('/core/debt/give', { amount: 5000 });
    } catch (e) {
      tutilgan = e;
    }

    expect(isQueuedOffline(tutilgan)).toBe(true);
    expect(outbox.size()).toBe(1);
    expect(outbox.list()[0].url).toBe('/core/debt/give');
    expect(outbox.list()[0].body).toEqual({ amount: 5000 });
    expect(outbox.list()[0].key).toBeTruthy();
  });

  it('xato NAVBATDAGI KALITNI aytib yuboradi', async () => {
    const { apiClient, isQueuedOffline } = require('../apiClient');
    const { outbox } = require('../../lib/outbox');
    const mock = new MockAdapter(apiClient);
    mock.onPost('/expense').networkError();

    let tutilgan: unknown;
    try {
      await apiClient.post('/expense', { amount: 5000 });
    } catch (e) {
      tutilgan = e;
    }

    /*
     * Ekran shu kalit bo'yicha vaqtinchalik yozuv yasaydi va amal
     * serverga yetgach aynan o'shani keshdan topib olib tashlaydi.
     * Kalit mos kelmasa yozuv ekranda abadiy qolib ketardi.
     */
    expect(isQueuedOffline(tutilgan)).toBe(true);
    expect((tutilgan as { key: string }).key).toBe(outbox.list()[0].key);
  });

  it('internet qaytganda AYNI kalit bilan yuboradi', async () => {
    const { apiClient } = require('../apiClient');
    const { outbox } = require('../../lib/outbox');
    const { connectOutbox } = require('../outboxSender');
    const mock = new MockAdapter(apiClient);

    mock.onPost('/core/debt/give').networkError();
    await apiClient.post('/core/debt/give', { amount: 5000 }).catch(() => undefined);
    const navbatdagiKalit = outbox.list()[0].key;

    // Tarmoq qaytdi: endi server qabul qiladi.
    const ketganKalitlar: string[] = [];
    mock.reset();
    mock.onPost('/core/debt/give').reply((config) => {
      ketganKalitlar.push(String(config.headers?.['Idempotency-Key']));
      return [200, { id: 'server-qarz' }];
    });

    connectOutbox();
    await outbox.flush();
    await settle();

    expect(ketganKalitlar).toEqual([navbatdagiKalit]);
    expect(outbox.size()).toBe(0);
  });

  it('O\'QISH so\'rovi navbatga tushmaydi', async () => {
    const { apiClient } = require('../apiClient');
    const { outbox } = require('../../lib/outbox');
    const mock = new MockAdapter(apiClient);
    mock.onGet('/core/debt/history').networkError();

    await apiClient.get('/core/debt/history').catch(() => undefined);

    expect(outbox.size()).toBe(0);
  });

  it('filtr yuboradigan POST ham navbatga tushmaydi', async () => {
    const { apiClient } = require('../apiClient');
    const { outbox } = require('../../lib/outbox');
    const mock = new MockAdapter(apiClient);
    mock.onPost('/gap/summary').networkError();

    await apiClient.post('/gap/summary', { unitCode: 'ALL' }).catch(() => undefined);

    // Bu o'qish: navbatga tushsa ortidagi haqiqiy amallarni kechiktirardi.
    expect(outbox.size()).toBe(0);
  });

  it('server RAD ETGAN so\'rov navbatga tushmaydi', async () => {
    const { apiClient, isQueuedOffline } = require('../apiClient');
    const { outbox } = require('../../lib/outbox');
    const mock = new MockAdapter(apiClient);
    mock.onPost('/expense').reply(400, { message: 'summa noto\'g\'ri' });

    let tutilgan: unknown;
    try {
      await apiClient.post('/expense', { amount: -1 });
    } catch (e) {
      tutilgan = e;
    }

    // Server javob berdi — aloqa bor, qayta yuborishning ma'nosi yo'q.
    expect(isQueuedOffline(tutilgan)).toBe(false);
    expect(outbox.size()).toBe(0);
  });

  it("PAROL o'zgartirish navbatga TUSHMAYDI", async () => {
    const { apiClient } = require('../apiClient');
    const { outbox } = require('../../lib/outbox');
    const mock = new MockAdapter(apiClient);
    mock.onPut('/profile/password').networkError();

    await apiClient.put('/profile/password', { oldPassword: 'a', newPassword: 'b' }).catch(() => undefined);

    // Navbat diskka shifrlanmagan yoziladi — parol u yerda qolmasligi kerak.
    expect(outbox.size()).toBe(0);
    expect(JSON.stringify([...mockDisk.values()])).not.toContain('newPassword');
  });

  it('har yangi amal YANGI kalit oladi', async () => {
    const { apiClient } = require('../apiClient');
    const mock = new MockAdapter(apiClient);
    const kalitlar: string[] = [];
    mock.onPost('/expense').reply((config) => {
      kalitlar.push(String(config.headers?.['Idempotency-Key']));
      return [200, {}];
    });

    await apiClient.post('/expense', { amount: 10000 });
    await apiClient.post('/expense', { amount: 10000 });

    // Ataylab ikki marta kiritilgan bir xil xarajat ikkita bo'lib qolishi kerak.
    expect(kalitlar).toHaveLength(2);
    expect(kalitlar[0]).not.toBe(kalitlar[1]);
  });
});
