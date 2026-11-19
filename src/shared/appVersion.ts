import appJson from '../../app.json';

/**
 * Ilovaning joriy build versiyasi — Android `versionCode`.
 *
 * Qiymat `app.json` dan O'QILADI, qo'lda yozilmaydi. Ilgari bu yerda
 * alohida konstanta turardi va uni har release'da qo'lda oshirish kerak
 * edi — 1.0.5 da aynan shu unutildi: chiqarilgan ilova o'zini 31 deb
 * bilar, backend esa 32 talab qilardi va ilova O'ZINI O'ZI bloklardi.
 * Foydalanuvchi yopib bo'lmaydigan "yangilang" ekranida qamalib qolardi,
 * Play'da esa yangilanadigan narsa yo'q edi.
 *
 * Endi manba BITTA: `app.json` ni Play ham, ilova ham shundan oladi,
 * ya'ni ikkisi ajralib ketishi mumkin emas.
 */
export const APP_VERSION_CODE: number = appJson.expo.android.versionCode;
