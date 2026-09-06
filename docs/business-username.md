# Biznes username — backend talablari

Maqsad: biznesni **UUID o'rniga username** bilan tanish va topish. Hozir
foydalanuvchi boshqa biznesni mijoz sifatida qo'shish uchun 36 belgili
UUID ni qo'lda ko'chirib yozishi kerak — bu xatoga juda moyil va
ulashish uchun noqulay.

Profil username'i allaqachon shunday ishlaydi (u telefon raqami), demak
naqsh tanish. Biznes uchun esa telefon yo'q — shuning uchun alohida,
odam o'qiy oladigan `username` kerak.

> Holat: **backend hali qo'llab-quvvatlamaydi.** Frontendda faqat
> xavfsiz poydevor qo'yilgan (pastda "Frontend holati" bo'limiga qarang).

---

## 1. Ma'lumot modeli

`Business` entity'siga yangi maydon:

| Maydon | Tur | Cheklovlar |
|---|---|---|
| `username` | string | **UNIQUE**, indekslangan, `NOT NULL` (mavjud yozuvlar uchun migratsiya kerak) |

### Validatsiya qoidalari (taklif)

- uzunligi **4–30** belgi
- faqat `a-z`, `0-9`, `_` va `.` (nuqta/pastki chiziq ketma-ket kelmasin,
  boshida/oxirida bo'lmasin)
- **katta-kichik harf farqlanmaydi**: saqlashda `lowercase` ga keltirilsin,
  qidiruv ham `lowercase` bo'yicha
- band nomlar ro'yxati: `admin`, `api`, `business`, `support`, `null` va h.k.

### Mavjud bizneslar uchun migratsiya

`username` `NOT NULL` bo'lgani uchun eski yozuvlarga qiymat kerak.
Ikki variant:

1. Avtomatik: `biz_<id ning birinchi 8 belgisi>` — keyin egasi o'zgartiradi
2. Nullable qilib qo'yib, egasi kiritmaguncha UI'da UUID ko'rsatiladi
   (frontend allaqachon shunday ishlashga tayyor — pastga qarang)

**Tavsiya: 2-variant.** Avtomatik nom foydalanuvchiga tushunarsiz bo'ladi
va baribir almashtiriladi.

---

## 2. API o'zgarishlari

### 2.1. Biznes yaratish

```
POST /business
```

So'rov tanasiga `username` qo'shiladi:

```json
{ "name": "Salom Market", "address": "Toshkent", "username": "salom_market" }
```

Javob (`BusinessDTO`) ham `username` ni qaytarsin.

**Xatolar:**

| Holat | Kod | Xabar kaliti |
|---|---|---|
| username band | `409` | `business.usernameTaken` |
| format noto'g'ri | `400` | `business.usernameInvalid` |

Xato javobi mavjud `AppResponse` formatida bo'lsin — frontend
`extractErrorMessage` orqali o'qiydi.

### 2.2. Bandlikni oldindan tekshirish (ixtiyoriy, lekin juda foydali)

```
GET /business/username-available?username=salom_market
-> { "available": true }
```

Formani yuborishdan oldin real-time tekshirish uchun. Bo'lmasa ham
ishlaydi (409 bo'yicha xato ko'rsatiladi), lekin UX yomonroq.

### 2.3. Username bo'yicha biznesni topish — **eng muhimi**

```
GET /business/by-username/{username}
-> BusinessDTO   (200)
-> 404           (topilmadi)
```

Busiz asosiy maqsadga erishilmaydi: mijoz qo'shishda username'ni
biznesga bog'lash kerak.

**Diqqat — ruxsat:** bu endpoint istalgan autentifikatsiyalangan
foydalanuvchiga ochiq bo'lishi kerak (begona biznesni ham topa olsin),
lekin javobda **faqat ommaviy maydonlar** qaytsin: `id`, `name`,
`username`, `photoId`. `ownerId`, `address`, `currentRole` va a'zolar
soni kabi ma'lumotlar **chiqmasin** — aks holda bu username'lar bo'yicha
biznes ma'lumotlarini yig'ish kanaliga aylanadi.

### 2.4. Mijoz sifatida qo'shish

Hozir:

```json
POST /client
{ "name": "...", "targetType": "BUSINESS_ACCOUNT", "targetBusinessId": "<uuid>" }
```

Kerak (ikki variantdan biri):

- **A)** `targetBusinessUsername` maydonini qo'shish va backend o'zi
  UUID ga o'girishi
- **B)** Frontend avval `GET /business/by-username/{u}` bilan UUID ni
  olib, keyin hozirgidek `targetBusinessId` yuborishi

**Tavsiya: B.** Backendda o'zgarish kamroq, frontend esa topilgan
biznesning **nomi va rasmini tasdiqlash uchun ko'rsata oladi** —
foydalanuvchi noto'g'ri biznes qo'shib qo'ymaydi. A variantda u nimani
qo'shayotganini yubormaguncha bilmaydi.

Xuddi shu narsa pul modalidagi qo'lda kiritish uchun ham amal qiladi
(`MoneyActionModal`).

### 2.5. Username'ni o'zgartirish

```
PUT /business/{id}/username
{ "username": "yangi_nom" }
```

- faqat **OWNER**
- eski username **darhol bo'shasin** (profil username'idagi kabi SMS
  tasdiqlash shart emas — bu telefon raqam emas)
- o'zgartirishga chastota chegarasi qo'yilsa yaxshi (masalan 30 kunda 1 marta),
  aks holda username'lar "aylanib" ketadi va eski havolalar buziladi

---

## 3. Frontend holati

Backend tayyor bo'lmagani uchun hozircha faqat **xatarsiz** qism kiritildi:

- `BusinessDTO.username?: string` — **ixtiyoriy** maydon. Backend
  yubormasa `undefined` bo'ladi, hech narsa buzilmaydi.
- `businessHandle(business)` yordamchisi: `username` bo'lsa uni,
  bo'lmasa `id` ni qaytaradi.
- `BusinessCard` shu yordamchidan foydalanadi — backend `username`
  yuboradigan kunning ertasiga karta o'zi yangilanadi, qo'shimcha ish
  talab qilmaydi.

**Hali qilinmagan** (backend chiqqach bir seansda bajariladi):

1. Biznes yaratish formasiga `username` maydoni + bandlik tekshiruvi
2. Mijoz qo'shishda "Biznes ID" o'rniga username + topilgan biznesni
   tasdiqlash bloki
3. `MoneyActionModal` da xuddi shu
4. Sozlamalarda username'ni o'zgartirish
5. Yangi xato kalitlari: `business.usernameTaken`, `business.usernameInvalid`,
   `business.usernameNotFound` (uz/ru/en)

---

## 4. Backend uchun qisqa ro'yxat

- [ ] `business.username` ustuni: unique + index, migratsiya
- [ ] Validatsiya: uzunlik, charset, lowercase, band nomlar
- [ ] `POST /business` — `username` qabul qilsin, 409/400 qaytarsin
- [ ] `BusinessDTO` — `username` qaytarsin (barcha endpointlarda)
- [ ] `GET /business/by-username/{username}` — **faqat ommaviy maydonlar**
- [ ] `GET /business/username-available` (ixtiyoriy)
- [ ] `PUT /business/{id}/username` — OWNER, chastota chegarasi
