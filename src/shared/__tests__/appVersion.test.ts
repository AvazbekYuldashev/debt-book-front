import { APP_VERSION_CODE } from '../appVersion';
import appJson from '../../../app.json';

/**
 * Force-update darvozasi (UpdateGate) ilovaning O'Z versiyasini
 * APP_VERSION_CODE orqali biladi, Play esa app.json dagi versionCode'ni
 * ko'radi. Ular ajralsa, chiqarilgan yangi versiya o'zini eski deb
 * hisoblab O'ZINI O'ZI bloklaydi.
 *
 * Qiymat endi app.json dan o'qiladi, ya'ni ajralish manbada hal qilingan.
 * Test esa o'sha yo'l uzilmaganini tekshiradi: import buzilsa yoki
 * app.json tuzilishi o'zgarsa, bu yerda ko'rinadi.
 */
describe('APP_VERSION_CODE', () => {
  it('app.json dagi android.versionCode dan o‘qiladi', () => {
    expect(APP_VERSION_CODE).toBe(appJson.expo.android.versionCode);
  });

  it('musbat butun son', () => {
    expect(Number.isInteger(APP_VERSION_CODE)).toBe(true);
    expect(APP_VERSION_CODE).toBeGreaterThan(0);
  });
});
