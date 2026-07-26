# Tez Top — Google Play Release Kit

Paket: `uz.teztop.app` · Versiya: 1.0.0 · Build usuli: lokal Gradle (AAB)

---

## 1. Do'kon sahifasi matnlari (Store listing)

### O'zbek (asosiy til)

**Ilova nomi (max 30 belgi):**
```
Tez Top — qarz daftari
```

**Qisqa tavsif (max 80 belgi):**
```
Mijozlar bilan qarz-haq, balans va xarajatlarni oson va aniq yuriting.
```

**To'liq tavsif (max 4000 belgi):**
```
Tez Top — mijozlar bilan oldi-berdi (qarz va haq) hisobini, balanslarni va xarajatlarni yuritish uchun qulay ilova. Tadbirkorlar, do'kon egalari va oddiy foydalanuvchilar uchun mo'ljallangan.

ASOSIY IMKONIYATLAR:

• Mijozlar bilan hisob — har bir mijoz bo'yicha "oldim/berdim" amallarini yuriting, tranzaksiyalar tarixini ko'ring.
• Ko'p valyutali hisob — so'm, dollar, rubl har biri ALOHIDA hisoblanadi. Valyutalar aralashtirilmaydi.
• Aniq balans — har bir mijozning va umumiy sof balansingizni bir qarashda ko'ring.
• Telefon kontaktlaridan qo'shish — mijozlarni qo'lda yoki kontaktlaringizdan tanlab qo'shing.
• Xarajatlar hisobi — xarajatlarni kategoriyalarga ajrating, sana bo'yicha filtrlab jamini ko'ring.
• Biznes hisoblari — jamoa bilan ishlang: a'zolar va rollar (egasi, administrator, a'zo).
• Real vaqt bildirishnomalari — yangi amallar haqida darhol xabar oling.
• Qulay interfeys — yorug' va qorong'i mavzu, o'zbek va rus tillari.

Tez Top bilan daftar va yozuvlarni unutib, barcha hisobni telefoningizda aniq va tartibli yuriting.

MUHIM: Tez Top — bu shaxsiy hisob-kitob DAFTARI. Ilova pul bermaydi, kredit yoki qarz bermaydi, to'lovlarni amalga oshirmaydi va hech qanday moliyaviy xizmat ko'rsatmaydi. Ilova faqat foydalanuvchining O'ZI kiritgan yozuvlarini saqlaydi va ko'rsatadi — qog'oz daftarning raqamli o'rnini bosadi.
```

**Kategoriya:** Biznes (Business) — TAVSIYA ETILADI. "Moliya" (Finance) tanlamang: shaxsiy dev-akkaunt uchun moliyaviy-xizmat tekshiruvini kuchaytiradi. Ilova moliyaviy xizmat emas, hisob-kitob vositasi.
**Teglar/kalit so'zlar:** qarz daftari, hisob-kitob, nasiya, balans, xarajat

### Rus (Русский)

**Название (max 30):**
```
Tez Top — учёт долгов
```

**Краткое описание (max 80):**
```
Удобный учёт долгов, балансов и расходов с клиентами. Точно и просто.
```

**Полное описание (max 4000):**
```
Tez Top — удобное приложение для ведения взаиморасчётов (долгов и задолженностей) с клиентами, учёта балансов и расходов. Подходит для предпринимателей, владельцев магазинов и обычных пользователей.

ОСНОВНЫЕ ВОЗМОЖНОСТИ:

• Учёт по клиентам — фиксируйте операции «взял/дал», просматривайте историю по каждому клиенту.
• Мультивалютность — сум, доллар, рубль учитываются ОТДЕЛЬНО, валюты не смешиваются.
• Точный баланс — видите чистый баланс по каждому клиенту и в целом.
• Импорт из контактов — добавляйте клиентов вручную или из телефонной книги.
• Учёт расходов — распределяйте расходы по категориям, фильтруйте по датам, смотрите итог.
• Бизнес-аккаунты — работа в команде: участники и роли (владелец, администратор, участник).
• Уведомления в реальном времени — мгновенно узнавайте о новых операциях.
• Удобный интерфейс — светлая и тёмная тема, узбекский и русский языки.

С Tez Top ведите все расчёты в телефоне — точно, аккуратно и без бумажных тетрадей.

ВАЖНО: Tez Top — это личная УЧЁТНАЯ ТЕТРАДЬ. Приложение не выдаёт деньги, не предоставляет кредиты или займы, не проводит платежи и не оказывает никаких финансовых услуг. Оно лишь хранит и показывает записи, которые вводит САМ пользователь, — цифровая замена бумажной тетради.
```

---

## 1b. ⚠️ Tekshiruvdan o'tish uchun 4 ta majburiy qadam (2026-07-26)

Google shaxsiy dev-akkauntlarga "moliyaviy xizmat" ilovalarini taqiqlaydi. Qarz daftari shubha uyg'otishi mumkin — quyidagilar rad etilmaslik uchun:

1. **Kategoriya = Business** (Finance emas). Play Console → Store listing → App category.
2. **Tavsifga "moliyaviy xizmat emas" izohi** qo'shildi (yuqorida, uz/ru) — bu matnni to'liq qo'ying.
3. **App content → Data safety / Financial features**: kredit, qarz berish (loans), to'lov, kripto — HECH BIRINI belgilamang ("None of these").
4. **App content → App access → "All functionality is restricted"**: reviewer uchun ISHLAYDIGAN demo login (telefon + parol) bering. SMS Eskiz test rejimida bo'lgani uchun reviewer o'zi ro'yxatdan o'ta olmaydi — demosiz deyarli aniq rad etiladi.

### Demo akkaunt qanday tayyorlanadi (SMS ishlamasa ham)
Ilovada o'zingiz demo akkaunt yarating; SMS kodini bazadan olib, tasdiqlang:
1. Ilovada (yoki https://pul-hisob.uz) yangi raqam bilan ro'yxatdan o'ting (masalan `90 000 00 01`), parol o'ylab qo'ying.
2. SMS ekraniga yetganda kod kelmaydi — kodni serverdan olamiz (`sms_history` jadvalidan, faqat o'qish).
3. Kodni kiritasiz → akkaunt ACTIVE bo'ladi. Shu telefon+parolni Play "App access"ga yozing.
> Kod: `psql` → `select code from sms_history where phone='998900000001' order by created_date desc limit 1;` (15 daqiqa amal qiladi). Yoki panelda A'zolar bo'limidan holatni ACTIVE qilib qo'yish mumkin.

---

## 2. Siyosat va shakllar (Policy & Forms)

### Maxfiylik siyosati (Privacy Policy) — MAJBURIY
Play uchun ochiq URL kerak (masalan `https://pul-hisob.uz/privacy`). Ilovada huquqiy modul bor — o'sha matnni domenga ochiq sahifa qilib joylang. URL'ni Play Console → App content → Privacy policy'ga kiriting.

### Data safety (ma'lumotlar xavfsizligi) shakli — javoblar
Ilova quyidagi ma'lumotlarni **yig'adi va serverga yuboradi**:

| Ma'lumot turi | Yig'iladimi | Maqsad | Izoh |
|---|---|---|---|
| Ism | Ha | Ilova funksiyasi | Ro'yxat va mijozlar |
| Telefon raqami | Ha | Ilova funksiyasi, autentifikatsiya | Kirish va mijoz identifikatsiyasi |
| Email | Ha | Aloqa, autentifikatsiya | Xabarlar va parol tiklash |
| Kontaktlar | Ha | Ilova funksiyasi | Foydalanuvchi tanlagan kontakt mijoz sifatida qo'shiladi |
| Rasmlar (foto) | Ha | Ilova funksiyasi | Avatar/kategoriya rasmi |
| Moliyaviy ma'lumot (summa) | Ha | Ilova funksiyasi | Foydalanuvchi kiritgan qarz/haq yozuvlari |
| Ilova faoliyati | Ha | Analitika/funksiya | Bildirishnomalar |

- **Uzatishda shifrlanadimi (encrypted in transit)?** — Ha (HTTPS).
- **Foydalanuvchi ma'lumotni o'chira oladimi?** — Ha (o'chirish usulini ko'rsating: ilova ichida yoki email orqali so'rov).
- **Ma'lumot uchinchi tomonga sotiladimi?** — Yo'q.

### Ruxsatlar (Permissions) — asoslash
Ilova ruxsatlari: `READ_CONTACTS`, `READ_MEDIA_IMAGES`, `POST_NOTIFICATIONS`, `VIBRATE`.

**Kontaktlar (READ_CONTACTS) — Google alohida so'raydi. Asoslash matni:**
```
Ilova foydalanuvchining telefon kontaktlarini FAQAT foydalanuvchi o'zi "kontaktlardan qo'shish" amalini tanlaganda o'qiydi. Maqsad — tanlangan kontaktni (ism va telefon raqami) mijoz sifatida ilovaga qo'shish. Kontaktlar avtomatik yuklab olinmaydi, reklama uchun ishlatilmaydi va uchinchi tomonga berilmaydi.
```
Ilovada ushbu ruxsat so'ralishidan oldin **prominent disclosure** (ochiq ogohlantirish) ekrani ko'rsatilishi tavsiya etiladi.

### Content rating
Anketani to'ldiring — ilovada zo'ravonlik/kontent yo'q, moliyaviy vosita ham emas (faqat shaxsiy hisob-kitob). Natija odatda "Everyone / 3+".

---

## 3. Grafikalar va screenshotlar

**Majburiy grafikalar:**
- Ilova ikonkasi: **512×512** PNG (bor: `assets/icon.png` — 512 ga moslang).
- Feature grafik: **1024×500** PNG/JPG (do'kon yuqorisidagi banner).
- Telefon screenshotlari: **kamida 2 ta, 8 tagacha** (16:9 yoki 9:16, min tomoni 320px).

**Tavsiya etilgan screenshot ekranlari (APK'dan oling):**
1. Kirish / ro'yxatdan o'tish ekrani
2. Mijozlar ro'yxati (balanslar bilan) — asosiy ekran
3. Mijoz ichidagi tranzaksiyalar tarixi
4. "Oldim/Berdim" oynasi
5. Xarajatlar (kategoriyalar)
6. Bildirishnomalar
7. Profil
8. Qorong'i (dark) mavzu ko'rinishi

*Maslahat:* har screenshot tepasiga qisqa izoh matni qo'shsangiz (masalan "Har valyuta alohida hisob") konversiya oshadi.

---

## 4. Keystore + AAB build (lokal Gradle)

### 4.1. Release keystore yaratish (BIR MARTA — parolni FAQAT SIZ saqlaysiz!)
> ⚠️ Bu keystore va uning parolini yo'qotmang — keyingi barcha yangilanishlar shu bilan imzolanadi.

```powershell
cd C:\Users\Greed
keytool -genkeypair -v -keystore teztop-upload.keystore -alias upload -keyalg RSA -keysize 2048 -validity 10000
```
So'ralganda: parol o'ylab toping (yozib qo'ying), ism/tashkilot ma'lumotlarini kiriting.

### 4.2. AAB build (imzolangan)
`android/` papka bo'lmasa yoki eskirgan bo'lsa avval:
```powershell
npx expo prebuild --platform android --no-install
```
So'ng imzolangan `.aab`:
```powershell
cd android
.\gradlew.bat bundleRelease --no-daemon `
  -Pandroid.injected.signing.store.file=C:/Users/Greed/teztop-upload.keystore `
  -Pandroid.injected.signing.store.password=SIZNING_PAROL `
  -Pandroid.injected.signing.key.alias=upload `
  -Pandroid.injected.signing.key.password=SIZNING_PAROL
```
Natija: `android/app/build/outputs/bundle/release/app-release.aab`

Bu `.aab` faylni Play Console → Production/Testing → "Create release" ga yuklaysiz. **Play App Signing** (tavsiya) yoqilgan holda qoldiring — Google app signing kalitini o'zi boshqaradi, siz upload kalit bilan imzolaysiz.

### 4.3. Versiya
Har yangi yuklashda `app.json` → `android.versionCode` ni oshiring (hozir 16). `version` (1.0.0) ni foydalanuvchiga ko'rinadigan yangilanishlarda oshiring.

---

## Keyingi qadamlar (tartib)
1. Play Console akkaunti ($25) + privacy policy URL.
2. Keystore yaratish (4.1) → AAB build (4.2).
3. Store listing (1) va grafikalarni (3) yuklash.
4. Data safety, content rating, ruxsat asoslash (2) to'ldirish.
5. Internal testing → Closed testing (12 tester, 14 kun) → Production.
