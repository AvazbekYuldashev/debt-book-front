import { APP_VERSION_CODE } from '../appVersion';
import appJson from '../../../app.json';

/**
 * Force-update darvozasi (UpdateGate) ilovaning O'Z versiyasini APP_VERSION_CODE
 * orqali biladi, Play esa app.json/build.gradle dagi versionCode'ni ko'radi.
 *
 * Agar ular bir-biridan uzoqlashsa, chiqarilgan yangi versiya o'zini eski deb
 * hisoblab, backend `minVersionCode` dan past qoladi va O'ZINI O'ZI bloklaydi:
 * foydalanuvchi yopib bo'lmaydigan "yangilang" ekranida qamalib qoladi, Play'da
 * esa yangilanadigan narsa yo'q. Shu sababli moslik test bilan qulflangan.
 */
describe('APP_VERSION_CODE', () => {
  it('app.json dagi android.versionCode bilan bir xil bo‘lishi shart', () => {
    expect(APP_VERSION_CODE).toBe(appJson.expo.android.versionCode);
  });

  it('musbat butun son', () => {
    expect(Number.isInteger(APP_VERSION_CODE)).toBe(true);
    expect(APP_VERSION_CODE).toBeGreaterThan(0);
  });
});
