// Ilovaning joriy build versiyasi (Android `versionCode` bilan BIR XIL bo'lishi SHART).
// ⚠️ Har release'da app.json -> android.versionCode bilan BIRGA oshiring.
//
// Majburiy yangilanish (force-update) tekshiruvi shu qiymatni backenddagi
// minVersionCode bilan solishtiradi: APP_VERSION_CODE < minVersionCode bo'lsa,
// ilova foydalanuvchidan yangilashni talab qiladi va ishlashni bloklaydi.
//
// ⚠️ Bu qiymat app.json'dan ORQADA QOLSA, yangi versiya O'ZINI O'ZI bloklaydi:
// foydalanuvchi yopib bo'lmaydigan "yangilang" ekranida qamalib qoladi, Play'da
// esa allaqachon eng yangi versiya turgan bo'ladi. Shu sababli moslikni
// `__tests__/appVersion.test.ts` avtomatik tekshiradi — versionCode oshirilganda
// test yiqilsa, demak shu faylni ham yangilash kerak.
export const APP_VERSION_CODE = 24;
