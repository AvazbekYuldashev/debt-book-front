/*
 * Node modullari QO'LDA e'lon qilinadi: tsconfig'da `types: ["jest"]`
 * turadi va node global tiplari ataylab yoqilmagan (yoqilsa `setTimeout`
 * kabi narsalar React Native tipidan node tipiga o'tib ketardi).
 */
declare const __dirname: string;
const fs = require('fs') as { readFileSync: (file: string, encoding: string) => string };
const path = require('path') as { join: (...parts: string[]) => string };

/**
 * XIZMAT ISHCHISI (web/service-worker.js) — oflayn qobiq qoidalari.
 *
 * Bu fayl ilovaning bundle'iga kirmaydi va TypeScript uni ko'rmaydi,
 * shuning uchun shu yerda haqiqiy fayl o'qib, soxta brauzer muhitida
 * ishga tushiriladi. Tekshiriladigan narsa uchta va har biri buzilsa
 * oflayn rejim jim o'ladi:
 *   1) `/api/` so'rovlariga ARALASHMASLIK — aks holda ilova "internet
 *      bor" deb o'ylar va oflayn amal navbatga tushmasdan yo'qolardi;
 *   2) oflaynda sahifani keshdan berish — bo'lmasa ilova umuman
 *      yuklanmaydi va qurilmadagi kesh behuda yotadi;
 *   3) yangi deploy chiqqanda eski JS to'plamini tashlash.
 */

interface FakeResponse {
  status: number;
  type: string;
  ok: boolean;
  body: string;
  clone: () => FakeResponse;
}

const response = (body: string, status = 200, type = 'basic'): FakeResponse => {
  const self_: FakeResponse = {
    status,
    type,
    ok: status >= 200 && status < 300,
    body,
    clone: () => self_,
  };
  return self_;
};

type Handler = (event: unknown) => void;

const ORIGIN = 'https://pul-hisob.uz';

const loadWorker = () => {
  const code = fs.readFileSync(
    path.join(__dirname, '..', '..', '..', '..', 'web', 'service-worker.js'),
    'utf8',
  );

  const handlers: Record<string, Handler> = {};
  const store = new Map<string, FakeResponse>();
  const urlOf = (key: unknown): string =>
    typeof key === 'string'
      ? new URL(key, ORIGIN).toString()
      : String((key as { url: string }).url);

  const cache = {
    match: async (key: unknown) => store.get(urlOf(key)),
    put: async (key: unknown, value: FakeResponse) => {
      store.set(urlOf(key), value);
    },
    add: async (key: unknown) => {
      store.set(urlOf(key), response('qobiq'));
    },
    keys: async () => [...store.keys()].map((url) => ({ url })),
    delete: async (key: unknown) => store.delete(urlOf(key)),
  };

  const caches = {
    open: async () => cache,
    keys: async () => ['tez-top-shell-v1'],
    delete: async () => true,
  };

  const fetchMock = jest.fn();
  const fakeSelf = {
    location: { origin: ORIGIN },
    addEventListener: (type: string, handler: Handler) => {
      handlers[type] = handler;
    },
    skipWaiting: async () => undefined,
    clients: { claim: async () => undefined, matchAll: async () => [] },
  };

  const ResponseMock = { error: () => response('tarmoq xatosi', 0, 'error') };

  // eslint-disable-next-line no-new-func
  new Function('self', 'caches', 'fetch', 'Response', code)(
    fakeSelf,
    caches,
    fetchMock,
    ResponseMock,
  );

  /** Bitta `fetch` hodisasini o'tkazadi; `null` — ishchi aralashmadi. */
  const handleFetch = async (
    url: string,
    init: { method?: string; mode?: string; destination?: string } = {},
  ): Promise<FakeResponse | null> => {
    let answered: Promise<FakeResponse> | null = null;
    handlers.fetch({
      request: {
        url: new URL(url, ORIGIN).toString(),
        method: init.method ?? 'GET',
        mode: init.mode ?? 'no-cors',
        destination: init.destination ?? '',
      },
      respondWith: (value: Promise<FakeResponse>) => {
        answered = value;
      },
    });
    return answered ? await answered : null;
  };

  return { handlers, handleFetch, fetchMock, store };
};

describe('oflayn qobiq (service worker)', () => {
  it("API so'rovlariga ARALASHMAYDI — rasm bo'lsa ham", async () => {
    const { handleFetch, fetchMock } = loadWorker();

    // Ataylab `image`: aks holda bu so'rov "statik fayl" deb keshlanardi.
    // `/api/` chegarasi shu uchun qat'iy — ma'lumot ilovaning ishi va
    // keshdan javob berilsa ilova "internet bor" deb o'ylab qolardi.
    const javob = await handleFetch('/api/v1/attach/avatar-1.png', {
      destination: 'image',
    });

    expect(javob).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('version.txt ni keshdan bermaydi', async () => {
    const { handleFetch } = loadWorker();

    // Deploy tekshiruvi shu faylga tayanadi — eskisi yolg'on gapiradi.
    expect(await handleFetch('/version.txt')).toBeNull();
  });

  it('yozuv amallariga aralashmaydi', async () => {
    const { handleFetch } = loadWorker();

    expect(await handleFetch('/api/v1/expense', { method: 'POST' })).toBeNull();
  });

  it('OFLAYNDA sahifani keshdan beradi', async () => {
    const { handleFetch, fetchMock } = loadWorker();

    // Avval online: sahifa keshga tushadi.
    fetchMock.mockResolvedValueOnce(response('<html>ilova</html>'));
    await handleFetch('/', { mode: 'navigate' });

    // Endi tarmoq yo'q.
    fetchMock.mockRejectedValue(new Error("internet yo'q"));
    const javob = await handleFetch('/', { mode: 'navigate' });

    expect(javob?.body).toBe('<html>ilova</html>');
  });

  it('online sahifani TARMOQDAN oladi — eski deployda qolib ketmaydi', async () => {
    const { handleFetch, fetchMock } = loadWorker();

    fetchMock.mockResolvedValueOnce(response('eski'));
    await handleFetch('/', { mode: 'navigate' });
    fetchMock.mockResolvedValueOnce(response('yangi'));
    const javob = await handleFetch('/', { mode: 'navigate' });

    expect(javob?.body).toBe('yangi');
  });

  it("huquqiy sahifa ilova qobig'ini ALMASHTIRMAYDI", async () => {
    const { handleFetch, fetchMock } = loadWorker();

    fetchMock.mockResolvedValueOnce(response('<html>ilova</html>'));
    await handleFetch('/', { mode: 'navigate' });

    // Maxfiylik sahifasi ochildi — u ilova emas.
    fetchMock.mockResolvedValueOnce(response('<html>maxfiylik</html>'));
    await handleFetch('/privacy.html', { mode: 'navigate' });

    // Endi tarmoq yo'q: ilova o'rnida ilova chiqishi kerak, aks holda
    // odam ilova o'rniga maxfiylik sahifasini ko'rardi.
    fetchMock.mockRejectedValue(new Error("internet yo'q"));
    expect((await handleFetch('/', { mode: 'navigate' }))?.body).toBe('<html>ilova</html>');
  });

  it("oflaynda huquqiy sahifa o'rniga ilova chizilmaydi", async () => {
    const { handleFetch, fetchMock } = loadWorker();

    fetchMock.mockResolvedValueOnce(response('<html>ilova</html>'));
    await handleFetch('/', { mode: 'navigate' });

    fetchMock.mockRejectedValue(new Error("internet yo'q"));
    const javob = await handleFetch('/terms.html', { mode: 'navigate' });

    // Manzil shartlar sahifasini aytib turib ilova chizilsa, odam
    // manzilga ishonmay qolardi — halol xato ko'rsatiladi.
    expect(javob?.type).toBe('error');
  });

  it("ilovaning ICHKI manzili oflaynda ham ochiladi", async () => {
    const { handleFetch, fetchMock } = loadWorker();

    fetchMock.mockResolvedValueOnce(response('<html>ilova</html>'));
    await handleFetch('/', { mode: 'navigate' });

    fetchMock.mockRejectedValue(new Error("internet yo'q"));
    const javob = await handleFetch('/contacts/123', { mode: 'navigate' });

    expect(javob?.body).toBe('<html>ilova</html>');
  });

  it('JS to\'plamini ikkinchi marta tarmoqdan so\'ramaydi', async () => {
    const { handleFetch, fetchMock } = loadWorker();
    const bundle = '/_expo/static/js/web/AppEntry-aaa.js';

    fetchMock.mockResolvedValueOnce(response('bundle'));
    await handleFetch(bundle, { destination: 'script' });
    const javob = await handleFetch(bundle, { destination: 'script' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(javob?.body).toBe('bundle');
  });

  it('yangi to\'plam kelganda ESKISI keshdan o\'chadi', async () => {
    const { handleFetch, fetchMock, store } = loadWorker();

    fetchMock.mockResolvedValueOnce(response('eski bundle'));
    await handleFetch('/_expo/static/js/web/AppEntry-aaa.js', { destination: 'script' });
    fetchMock.mockResolvedValueOnce(response('yangi bundle'));
    await handleFetch('/_expo/static/js/web/AppEntry-bbb.js', { destination: 'script' });

    // Aks holda har deploy keshda yana bir nusxa qoldirardi.
    const bundles = [...store.keys()].filter((url) => url.includes('/_expo/static/js/'));
    expect(bundles).toEqual([`${ORIGIN}/_expo/static/js/web/AppEntry-bbb.js`]);
  });
});
