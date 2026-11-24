import type { OutboxItem } from '../outbox';

/**
 * Oflayn navbat: tarmoqsiz paytda bajarilgan amal yo'qolmasligi va
 * internet qaytganda TO'G'RI TARTIBDA serverga yetib borishi kerak.
 */

// Diskni xotiradagi oddiy xarita bilan almashtiramiz.
// Nom `mock` bilan boshlanadi: jest mock fabrikasi ichidan faqat
// shunday nomlangan tashqi o'zgaruvchiga murojaat qilish mumkin.
const mockDisk = new Map<string, string>();
jest.mock('../storage', () => ({
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

const loadOutbox = () => require('../outbox') as typeof import('../outbox');

const xato = (status?: number, message = 'xato'): Error & { status?: number } => {
  const e = new Error(message) as Error & { status?: number };
  e.status = status;
  return e;
};

describe('oflayn navbat', () => {
  beforeEach(() => {
    mockDisk.clear();
    jest.resetModules();
  });

  it('amalni navbatga qo\'yadi va diskka yozadi', async () => {
    const { outbox } = loadOutbox();
    await outbox.enqueue({ method: 'POST', url: '/core/debt/give', body: { amount: 100 } });

    expect(outbox.size()).toBe(1);
    const saqlangan = JSON.parse(mockDisk.get('debt-book.outbox')!);
    expect(saqlangan).toHaveLength(1);
    expect(saqlangan[0].url).toBe('/core/debt/give');
    expect(saqlangan[0].key).toBeTruthy();
  });

  it('ilova qayta ochilganda navbat yo\'qolmaydi', async () => {
    const birinchi = loadOutbox();
    await birinchi.outbox.enqueue({ method: 'POST', url: '/a' });

    // "Ilova yopildi va qayta ochildi": modul holati tozalanadi, mockDisk qoladi.
    jest.resetModules();
    const ikkinchi = loadOutbox();
    await ikkinchi.outbox.init();

    expect(ikkinchi.outbox.size()).toBe(1);
    expect(ikkinchi.outbox.list()[0].url).toBe('/a');
  });

  it('KIRGAN TARTIBDA yuboradi', async () => {
    const { outbox } = loadOutbox();
    const ketgan: string[] = [];
    outbox.setSender(async (item: OutboxItem) => {
      ketgan.push(item.url);
    });

    await outbox.enqueue({ method: 'POST', url: '/birinchi' });
    await outbox.enqueue({ method: 'POST', url: '/ikkinchi' });
    await outbox.enqueue({ method: 'POST', url: '/uchinchi' });

    const natija = await outbox.flush();

    expect(ketgan).toEqual(['/birinchi', '/ikkinchi', '/uchinchi']);
    expect(natija.sent).toBe(3);
    expect(outbox.size()).toBe(0);
  });

  it('tarmoq uzilsa O\'SHA JOYDA to\'xtaydi, keyingilarini urinmaydi', async () => {
    const { outbox } = loadOutbox();
    const ketgan: string[] = [];
    outbox.setSender(async (item: OutboxItem) => {
      if (item.url === '/ikkinchi') throw xato(undefined, 'tarmoq yo\'q');
      ketgan.push(item.url);
    });

    await outbox.enqueue({ method: 'POST', url: '/birinchi' });
    await outbox.enqueue({ method: 'POST', url: '/ikkinchi' });
    await outbox.enqueue({ method: 'POST', url: '/uchinchi' });

    const natija = await outbox.flush();

    expect(ketgan).toEqual(['/birinchi']);
    expect(natija.sent).toBe(1);
    // Tartib buzilmasligi uchun ortidagi amal ham navbatda qoladi.
    expect(outbox.list().map((i) => i.url)).toEqual(['/ikkinchi', '/uchinchi']);
  });

  it('server RAD ETSA (4xx) amal tashlanadi va navbat to\'silib qolmaydi', async () => {
    const { outbox } = loadOutbox();
    const ketgan: string[] = [];
    outbox.setSender(async (item: OutboxItem) => {
      if (item.url === '/buzuq') throw xato(400, 'noto\'g\'ri ma\'lumot');
      ketgan.push(item.url);
    });

    await outbox.enqueue({ method: 'POST', url: '/buzuq' });
    await outbox.enqueue({ method: 'POST', url: '/yaxshi' });

    const natija = await outbox.flush();

    expect(natija.dropped).toBe(1);
    expect(natija.sent).toBe(1);
    expect(ketgan).toEqual(['/yaxshi']);
    expect(outbox.size()).toBe(0);
  });

  it('RAD ETILGAN amal haqida ham XABAR beradi', async () => {
    const { outbox } = loadOutbox();
    outbox.setSender(async (item: OutboxItem) => {
      if (item.url === '/buzuq') throw xato(400);
    });

    const xabarlar: Array<[string, string]> = [];
    outbox.subscribeSettled((item, outcome) => xabarlar.push([item.url, outcome]));

    await outbox.enqueue({ method: 'POST', url: '/buzuq' });
    await outbox.enqueue({ method: 'POST', url: '/yaxshi' });
    await outbox.flush();

    /*
     * Rad etilgani aytilmasa, ekrandagi vaqtinchalik yozuv soat
     * belgisi bilan ABADIY turib qolar va odam yuborilishini bir umr
     * kutardi.
     */
    expect(xabarlar).toEqual([
      ['/buzuq', 'dropped'],
      ['/yaxshi', 'sent'],
    ]);
  });

  it('navbatda QOLGAN amal haqida xabar bermaydi', async () => {
    const { outbox } = loadOutbox();
    outbox.setSender(async () => {
      throw xato(undefined, "tarmoq yo'q");
    });

    const xabarlar: string[] = [];
    outbox.subscribeSettled((item) => xabarlar.push(item.url));

    await outbox.enqueue({ method: 'POST', url: '/keyinroq' });
    await outbox.flush();

    // Amal hali navbatda — yozuv ekranda qolishi kerak.
    expect(xabarlar).toEqual([]);
    expect(outbox.size()).toBe(1);
  });

  it('"keyinroq urin" javoblari (408, 429, 5xx) navbatda qoladi', async () => {
    for (const status of [408, 429, 500, 503]) {
      jest.resetModules();
      mockDisk.clear();
      const { outbox } = loadOutbox();
      outbox.setSender(async () => {
        throw xato(status);
      });
      await outbox.enqueue({ method: 'POST', url: '/a' });

      await outbox.flush();

      expect(outbox.size()).toBe(1);
      expect(outbox.list()[0].attempts).toBe(1);
    }
  });

  it('berilgan kalitni saqlaydi — qayta yuborishda o\'zgarmaydi', async () => {
    const { outbox } = loadOutbox();
    const kalitlar: string[] = [];
    let birinchiUrinish = true;
    outbox.setSender(async (item: OutboxItem) => {
      kalitlar.push(item.key);
      if (birinchiUrinish) {
        birinchiUrinish = false;
        throw xato(500);
      }
    });

    await outbox.enqueue({ method: 'POST', url: '/a', key: 'qotirilgan-kalit' });
    await outbox.flush();
    await outbox.flush();

    expect(kalitlar).toEqual(['qotirilgan-kalit', 'qotirilgan-kalit']);
  });

  it('tozalash navbatni ham, diskni ham bo\'shatadi', async () => {
    const { outbox } = loadOutbox();
    await outbox.enqueue({ method: 'POST', url: '/a' });

    await outbox.clear();

    expect(outbox.size()).toBe(0);
    expect(JSON.parse(mockDisk.get('debt-book.outbox')!)).toEqual([]);
  });

  it('buzuq saqlangan navbat ilovani ishdan chiqarmaydi', async () => {
    mockDisk.set('debt-book.outbox', '{bu json emas');
    const { outbox } = loadOutbox();

    await outbox.init();

    expect(outbox.size()).toBe(0);
  });
});
