import apiClient from '../../../../shared/api/apiClient';
import { transcribe, understand } from '../voice';

/**
 * Ovoz chaqiruvi umumiy Authorization sarlavhasini O'CHIRMASLIGI kerak.
 *
 * HAQIQIY NARXI: ekranlar tokenni uzatmaydi, shuning uchun har bir ovoz
 * chaqiruvi sarlavhani tozalar, so'rov 403 olar va perehvatchik uni
 * qayta yuborardi. Ovoz fayli IKKI MARTA yuklanardi - server jurnalida
 * har bir ovozga aynan bitta 403 va bitta 200 ko'rinardi.
 */
describe('ovoz chaqiruvlari va token', () => {
  const headers = () => apiClient.defaults.headers.common as Record<string, unknown>;

  beforeEach(() => {
    jest.spyOn(apiClient, 'post').mockResolvedValue({ data: { text: 'salom' } });
    headers().Authorization = 'Bearer allaqachon-bor';
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete headers().Authorization;
  });

  it('tokensiz stt mavjud sarlavhani saqlaydi', async () => {
    await transcribe(new Blob(['x'], { type: 'audio/webm' }));

    expect(headers().Authorization).toBe('Bearer allaqachon-bor');
  });

  it('tokensiz understand ham sarlavhani saqlaydi', async () => {
    await understand('salom', 'TRANSACTION');

    expect(headers().Authorization).toBe('Bearer allaqachon-bor');
  });

  it('token berilsa u qoyiladi', async () => {
    await transcribe(new Blob(['x'], { type: 'audio/webm' }), 'yangi-token');

    expect(headers().Authorization).toBe('Bearer yangi-token');
  });
});
