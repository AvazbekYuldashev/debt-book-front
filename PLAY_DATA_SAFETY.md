# Data safety — to'ldirish uchun aniq javoblar (kod auditidan)

✅ **2026-08-21: anketa to'ldirildi va tekshiruvga yuborildi.** Play preview endi
"Личная информация (Имя, Идентификаторы пользователей, Номер телефона), Финансовые сведения,
Фото и видео, Контакты" ko'rsatadi. Quyidagi javoblar aynan shu tarzda kiritilgan.

⚠️ Ilgarigi holat **NOTO'G'RI** edi: "Данные не собираются" deb turgan edi, aslida ilova
ma'lumot yig'adi. Google buni siyosat buzilishi deb hisoblaydi (ilova to'xtatilishi mumkin).

Quyidagi javoblar `Debt-Book` va `debt-book-front` kodidan tekshirib olingan (2026-08-21).
PLAY_RELEASE_KIT.md dagi eski jadval **noto'g'ri** — u email yig'iladi deydi, aslida yo'q.

Play Console → **Контент приложения → Безопасность данных**

---

## 2-bosqich: Сбор и безопасность данных

| Savol | Javob |
|---|---|
| Ilova ma'lumot yig'adimi / uchinchi tomonga beradimi? | **Да** |
| Barcha ma'lumot shifrlangan holda uzatiladimi? | **Да** (mobil `https://pul-hisob.uz`, Let's Encrypt) |
| Akkaunt yaratish usuli | **Имя пользователя, пароль и другие данные для аутентификации** (telefon + parol, SMS bir martalik kod) |
| Akkaunt o'chirish URL | `https://pul-hisob.uz/delete-account.html` |
| Akkauntni o'chirmasdan ma'lumotni o'chirish mumkinmi? | **Нет** |

## 3-bosqich: Типы данных — jami 6 ta

| Bo'lim | Belgilanadi |
|---|---|
| Личная информация | **Имя**, **Номер телефона**, **Идентификаторы пользователей** |
| Финансовые сведения | **Другие финансовые сведения** |
| Фото и видео | **Фото** |
| Контакты | **Контакты** |

❌ **Belgilanmaydi:** Электронный адрес (email yig'ilmaydi), Адрес, Местоположение,
Платежные данные, История покупок, Кредитный рейтинг, История действий в приложении,
Аудиофайлы, Календарь, Сообщения, Файлы и документы, Сведения о приложении.

## 4-bosqich: Использование и обработка — har 6 ta tur uchun

| Savol | Javob |
|---|---|
| Ma'lumot yig'iladimi? | **Да** (hammasi serverga boradi) |
| Uchinchi tomonga beriladimi (передаются)? | **Нет** |
| Vaqtinchalik qayta ishlanadimi? | **Нет** (bazada saqlanadi) |
| Majburiymi? | Имя / Номер телефона / Идентификаторы / Другие финансовые — **Обязательно**<br>Фото / Контакты — **Пользователи могут отказаться** |
| Maqsad (цель) | Hammasi: **Функции приложения**<br>Qo'shimcha Имя/Телефон/Идентификаторы uchun: **Управление аккаунтом** |

❌ Hech qaysi tur uchun **Реклама/маркетинг**, **Аналитика**, **Персонализация**,
**Предотвращение мошенничества** ni belgilamang — ilovada analitika, reklama yoki
crash-SDK yo'q (`package.json` toza, push token serverga yuborilmaydi).

---

## Nima uchun shunday (kod dalillari)

| Ma'lumot | Dalil |
|---|---|
| Ism, familiya | `security/dto/RegistrationDTO.java` — `name`, `surname` |
| Telefon | `RegistrationDTO.username`, SMS orqali tasdiqlanadi |
| Foydalanuvchi ID | `profile/entity/ProfileEntity.java` — `id` |
| Moliyaviy yozuvlar | `money/entity/MoneyEntity.java` — summa, tavsif, tomonlar |
| Rasmlar | `attach/entity/AttachEntity.java` (avatar, kategoriya rasmi) |
| Kontaktlar | `src/shared/lib/deviceContacts.ts` — qurilmada o'qiladi, tanlangani mijoz sifatida serverga boradi |
| Email YO'Q | backendda `email` faqat Eskiz SMS konfigida va Swagger contact'da |
| Analitika YO'Q | `package.json` da firebase/sentry/analytics/admob yo'q |
| Push token YO'Q | `deviceNotifications.ts` tokenni serverga yubormaydi |
| Shifrlash | `src/shared/api/config.ts` — `MOBILE_BACKEND = 'https://pul-hisob.uz'` |
| O'chirish imkoni | `profile/controller/profile/AccauntController.java:53` — `@DeleteMapping("/{id}")` |

## Keyin

To'ldirgach → **Обзор публикации** → **Отправить на проверку**.

### 🔴 OCHIQ MUAMMO: akkaunt o'chirish aslida SOFT DELETE

`ProfileCoreService.deletebyId()` → `ProfileRepository.deleteSoftById()` faqat
`UPDATE ProfileEntity SET visible = false` qiladi. Telefon raqami, ism, parol xeshi va
profil rasmi bazada **qolib ketadi**. Play'ning akkaunt o'chirish talabi esa foydalanuvchi
ma'lumotlari haqiqatan o'chirilishini (yoki anonimlashtirilishini) kutadi.

`web/delete-account.html` matni 2026-08-21 da haqiqatga moslab tuzatildi (endi "telefon
raqami, ism, parol o'chiriladi" deb noto'g'ri aytmaydi), lekin **backendni tuzatish kerak**:
o'chirishda `name`/`surname`/`photoId` ni null qilish, `username` ni anonimlashtirish
(masalan `deleted-<uuid>`), parolni bekor qilish. Money/Client yozuvlaridagi tarix ID
orqali saqlanib qolaveradi, ya'ni qarshi tomonning daftari buzilmaydi.

### Saqlash muddati (2026-08-21 da qo'shildi)

`web/delete-account.html` da saqlash muddati ko'rsatilmagan edi — Google buni talab qiladi
("содержится информация о том, данные каких типов будут удалены или сохранены, и о сроках
хранения"). Sahifaga "Saqlash muddati" bo'limi qo'shildi. ⚠️ Sahifa **pul-hisob.uz ga qayta
deploy qilinishi kerak** (`deploy/sync-legal-pages.sh`) — aks holda Play eski matnni ko'radi.
