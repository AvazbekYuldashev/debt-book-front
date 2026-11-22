/**
 * Oflayn rejimning eng xavfli joyi: ILOVA OFLAYNDA QOTIB QOLMASLIGI.
 *
 * Tarmoq holati so'rovlar natijasidan olinadi, oflaynda esa React Query
 * so'rovlarni to'xtatadi — ya'ni natija beradigan hech narsa qolmaydi.
 * Zond bo'lmasa, bir marta oflayn bo'lgan ilova internet qaytgandan
 * keyin ham oflayn deb o'ylab o'tiraverardi.
 */

const flush = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
};

describe('networkStatus', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    jest.resetModules();
    jest.useFakeTimers();
    fetchMock = jest.fn();
    (globalThis as { fetch?: unknown }).fetch = fetchMock;
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('boshlanishida onlayn deb hisoblanadi', () => {
    const { networkStatus } = require('../networkStatus');
    expect(networkStatus.isOnline()).toBe(true);
  });

  it('oflayn bo\'lganda serverni DAVRIY tekshira boshlaydi', () => {
    const { networkStatus } = require('../networkStatus');
    networkStatus.markOffline();
    expect(networkStatus.isOnline()).toBe(false);

    expect(fetchMock).not.toHaveBeenCalled();
    jest.advanceTimersByTime(5_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(5_000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('server javob berishi bilan onlaynga qaytadi va tekshiruvni to\'xtatadi', async () => {
    const { networkStatus } = require('../networkStatus');
    const seen: boolean[] = [];
    networkStatus.subscribe(() => seen.push(networkStatus.isOnline()));

    fetchMock.mockRejectedValue(new Error('tarmoq yo\'q'));
    networkStatus.markOffline();

    jest.advanceTimersByTime(5_000);
    await flush();
    expect(networkStatus.isOnline()).toBe(false);

    fetchMock.mockResolvedValue({ ok: true });
    jest.advanceTimersByTime(5_000);
    await flush();
    expect(networkStatus.isOnline()).toBe(true);

    // Qaytgandan keyin zond o'chadi — bekorga so'rov yubormaydi.
    const callsSoFar = fetchMock.mock.calls.length;
    jest.advanceTimersByTime(20_000);
    expect(fetchMock).toHaveBeenCalledTimes(callsSoFar);
    expect(seen).toEqual([false, true]);
  });

  it('4xx javob ham ONLAYN deb hisoblanadi — server gapiryapti', async () => {
    const { networkStatus } = require('../networkStatus');
    // `fetch` 404 da ham rad etmaydi, javob qaytaradi.
    fetchMock.mockResolvedValue({ ok: false, status: 404 });
    networkStatus.markOffline();

    jest.advanceTimersByTime(5_000);
    await flush();
    expect(networkStatus.isOnline()).toBe(true);
  });

  it('bir xil holat qayta berilsa kuzatuvchilar bezovta qilinmaydi', () => {
    const { networkStatus } = require('../networkStatus');
    const listener = jest.fn();
    networkStatus.subscribe(listener);

    networkStatus.markOnline();
    expect(listener).not.toHaveBeenCalled();

    networkStatus.markOffline();
    networkStatus.markOffline();
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
