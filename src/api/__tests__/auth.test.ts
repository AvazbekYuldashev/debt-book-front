import { login, register, ApiRequestError } from '../auth';

// auth.ts global fetch ishlatadi — uni mock qilamiz.
const mockFetch = jest.fn();
beforeAll(() => {
  (globalThis as any).fetch = mockFetch;
});
beforeEach(() => {
  mockFetch.mockReset();
});

const okResponse = (body: unknown) => ({
  ok: true,
  status: 200,
  statusText: 'OK',
  text: async () => JSON.stringify(body),
});

const errResponse = (status: number, body: unknown) => ({
  ok: false,
  status,
  statusText: 'Bad Request',
  text: async () => JSON.stringify(body),
});

describe('login', () => {
  it('username ni 998 kanonik formatga normalizatsiya qilib yuboradi', async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ id: '1', jwt: 'tok', name: 'A', surname: '', username: '998901234567' }));
    const result = await login({ username: '901234567', password: 'secret' });

    const [, init] = mockFetch.mock.calls[0];
    const sentBody = JSON.parse((init as RequestInit).body as string);
    expect(sentBody.username).toBe('998901234567');
    expect((result as any).jwt).toBe('tok');
  });

  it('xato javobida ApiRequestError tashlaydi va message ni mapping qiladi', async () => {
    mockFetch.mockResolvedValueOnce(errResponse(400, { message: 'Login yoki parol noto‘g‘ri' }));
    expect.assertions(2);
    try {
      await login({ username: '901234567', password: 'x' });
    } catch (e) {
      expect(e).toBeInstanceOf(ApiRequestError);
      expect((e as Error).message).toBe('Login yoki parol noto‘g‘ri');
    }
  });
});

describe('register', () => {
  it('username ni normalizatsiya qiladi', async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ message: 'ok' }));
    await register({ name: 'A', surname: 'B', username: '0901234567', password: 'secret12' });
    const [, init] = mockFetch.mock.calls[0];
    const sentBody = JSON.parse((init as RequestInit).body as string);
    expect(sentBody.username).toBe('998901234567');
  });
});
