# Ijara (rental) — shartnoma, 2-versiya: OMBOR + kunlik/soatlik

Ikki tomon:

- frontend — `src/features/rentals/` (shu repozitoriya)
- backend — `api/debt/book/rental/` (repo: `AvazbekYuldashev/Debt-Book`)

Ikkala tomon ham 2-versiyani YOZGAN.

Yo'llar `/api/v1` ostida. Bu hujjat ikkisi orasidagi shartnoma: bir tomonni
o'zgartirganda ikkinchisi ham shu yerdan tekshirilishi kerak.

## 0. Nima o'zgardi (1-versiyadan farqi)

Mijoz (ijarachi) talabi: opalubka, lesa, arava, qurilish jihozlari va
to'y uchun stul-stol-chodir beradigan odamni tasavvur qilib qurilsin.

1. **OMBOR.** Ijarachi avval buyumlarini kiritadi: nomi, NECHTA BORLIGI,
   narxi KUNLIK yoki SOATLIK. Ijara endi erkin matn emas — ombordagi
   buyumdan beriladi.
2. **BAND / BO'SH.** "100 ta lesadan 50 tasi band, 50 tasi bo'sh" — server
   ochiq ijaralardan hisoblaydi va ombor ro'yxatida qaytaradi.
3. **KIMLARDA.** Ombordagi har buyum bo'yicha "kimlarda, nechta, qancha
   pul olinishi kerak" — `rentalItemId` filtri.
4. **SOATLIK ijara.** Kunlikdan tashqari soatlik narx: vaqt bilan (HH:mm).
5. **NASIYA.** Buyum qaytgan, lekin puli to'liq olinmagan ijaralar alohida
   filtr (`DEBT`) va paneldagi alohida summa.
6. **Bir nechta buyum birdaniga** bir mijozga (`POST /rental/batch`).
7. **Biznes hisobi** — ombor ham, ijaralar ham BIZNESNIKI: hamma a'zolar
   bir xil ro'yxatni ko'radi.

Mantiq o'zgarmadi: **buyum beriladi → muddat o'tadi → puli olinadi.** Pul
buyum qaytganda olinadi, ya'ni shu paytgacha mijozda **qarz** bo'lib turadi.

---

## 1. HISOB QOIDASI (eng muhim qism)

Summa vaqt bilan o'sadi, shuning uchun u **saqlanmaydi** — davr narxidan
qaytadan hisoblanadi. Server va telefon **aynan bir xil** qoidani bajarishi
shart, aks holda ekrandagi raqam bilan bazadagi raqam farq qiladi.

```
davr          = period ('DAY' | 'HOUR'), eski yozuvlarda yo'q -> 'DAY'
hisob_tugashi = returned ?? hozir

-- DAY (kun = TUN; soat HISOBGA KIRMAYDI, faqat sana)
hisoblangan   = max(1, sana(hisob_tugashi) − startDate)            kun
kechikkan     = max(0, sana(hisob_tugashi) − dueDate)              kun

-- HOUR (boshlangan soat TO'LIQ)
daqiqa        = (hisob_tugashi) − (startDate + startTime)
hisoblangan   = max(1, ceil(daqiqa / 60))                          soat
kech_daqiqa   = (hisob_tugashi) − (dueDate + dueTime)
kechikkan     = kech_daqiqa > 0 ? ceil(kech_daqiqa / 60) : 0       soat

yig'ilgan     = round2( price × Σ buyum-davrlar )
olinmagan     = round2( yig'ilgan − paidAmount )
```

Vaqt **mintaqasiz devor soati** (`LocalDate` / `LocalTime`), biznes
O'zbekistonda — serverdagi "hozir" `Asia/Tashkent` bo'yicha olinadi
(`RentalClock`), server JVM'i qaysi mintaqada ishlashidan qat'i nazar.

Kunlik natijalar (1-oktyabrda berilgan, 3 kunlik ijara → `dueDate` = 4-oktyabr):

| Qaytarilgan kun | Hisoblangan kun | Kechikish |
|---|---|---|
| 1-oktyabr (o'sha kuni) | 1 (eng kami) | 0 |
| 4-oktyabr (muddatida) | 3 | 0 |
| 9-oktyabr (kech) | 8 | 5 |
| qaytmadi, bugun 12-oktyabr | 11 | 8 |

Soatlik natijalar (13-oktyabr 14:00 da, 3 soatga → muddat 17:00):

| Qaytgan payt | Hisoblangan soat | Kechikish |
|---|---|---|
| 14:05 | 1 (eng kami) | 0 |
| 17:00 (muddatida) | 3 | 0 |
| 17:10 | 4 | 1 |
| qaytmadi, ertasi 09:30 | 20 | 17 |

Kunlik ijarada soat KIRMAYDI: kechqurun 21:00 da berilib ertalab 08:00 da
qaytgan stul — 1 kun, 0.5 emas.

Formula ikki joyda, bir xil:

- frontend — `src/features/rentals/model/rentalMath.ts` (testlar:
  `model/__tests__/rentalMath.test.ts`)
- backend — `rental/service/RentalCalculator.java` (testlar:
  `RentalCalculatorTest`, xuddi shu jadvallar)

### Qisman qaytarish

Buyum PARTIYALAB qaytishi mumkin va har partiya **o'z paytigacha**
hisoblanadi. Shuning uchun summa oddiy "miqdor × davr" emas, **buyum-davrlar
yig'indisi**:

```
10 stul, 1-oktyabr:  3 tasi 3-oktyabrda qaytdi  -> 3 × 2 kun  =  6
                     7 tasi hali mijozda        -> 7 × 11 kun = 77
                                                   jami        83 buyum-kun
```

`rental.returned_date` **faqat HAMMA buyum qaytganda** to'ldiriladi — u
yopilganlik belgisi. Partiyasiz yopilgan ESKI yozuvlar avvalgidek: butun
miqdor `returned_date` gacha.

### Holat va bosqich saqlanmaydi

```
qolgan == 0                 -> RETURNED   (kech qaytarilgan bo'lsa ham)
kechikkan > 0               -> OVERDUE
aks holda                   -> ACTIVE

bosqich (stage):
  ACTIVE / OVERDUE          -> o'zi
  RETURNED va olinmagan > 0 -> DEBT    (NASIYA)
  RETURNED va olinmagan <= 0-> CLOSED
```

---

## 2. Jadvallar

### Yangi: `rental_item` (ombor)

```sql
CREATE TABLE rental_item (
    id              VARCHAR(36) PRIMARY KEY,
    business_id     VARCHAR(36) REFERENCES business(id), -- NULL = shaxsiy hisob
    creator_id      VARCHAR(36) NOT NULL,
    name            VARCHAR(255) NOT NULL,
    category        VARCHAR(128),                     -- "Qurilish", "To'y jihozlari"
    price_period    VARCHAR(8)   NOT NULL DEFAULT 'DAY', -- DAY | HOUR
    price           NUMERIC(19,2) NOT NULL,           -- 1 dona, 1 davr
    currency        VARCHAR(3)   NOT NULL DEFAULT 'UZS',
    unit            VARCHAR(32),                      -- ProductUnit: DONA, METR_KVADRAT, METR...
    total_quantity  NUMERIC(19,3) NOT NULL,
    note            TEXT,
    visible         BOOLEAN NOT NULL DEFAULT TRUE,    -- soft delete
    created_date    TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_rental_item_owner ON rental_item (business_id, creator_id) WHERE visible;
```

**Band soni SAQLANMAYDI** — so'rov paytida hisoblanadi:

```sql
busy(item) = Σ (r.quantity − Σ rr.quantity)
             FROM rental r LEFT JOIN rental_return rr ON rr.rental_id = r.id
             WHERE r.rental_item_id = item.id AND r.visible AND r.returned_date IS NULL
```

### `rental` — yangi ustunlar

```sql
ALTER TABLE rental ADD COLUMN rental_item_id VARCHAR(36) REFERENCES rental_item(id);
ALTER TABLE rental ADD COLUMN price_period   VARCHAR(8);  -- NULL = eski yozuv = DAY
ALTER TABLE rental ADD COLUMN start_time     TIME;   -- faqat HOUR
ALTER TABLE rental ADD COLUMN due_time       TIME;   -- faqat HOUR
ALTER TABLE rental ADD COLUMN returned_time  TIME;   -- faqat HOUR
CREATE INDEX idx_rental_item_open ON rental (rental_item_id) WHERE returned_date IS NULL;

ALTER TABLE rental_return ADD COLUMN returned_time TIME;  -- faqat HOUR
```

`daily_price` ustuni qoladi (nomini o'zgartirish shart emas) — u endi
"bir DAVR narxi". DTO'da `price` deb chiqadi (pastga qarang).

Ustun nomi `price_period` (`period` emas — SQL'da kalit so'z bo'lishi
mumkin). `rental` dagi yangi ustunlar NULL bo'la oladi: `ddl-auto=update`
eski qatorlari bor jadvalga NOT NULL ustun qo'sha olmaydi; NULL davr =
kunlik. Jadval va ustunlarni `ddl-auto=update` o'zi qo'shadi; indekslar
serverda qo'lda bajariladi — `src/main/resources/db.migration/V27__rental_item.sql`
(backend repo).

---

## 3. Endpointlar

Hammasi JWT talab qiladi va `X-Business-ID` sarlavhasini boshqa bo'limlar
bilan bir xil hisobga oladi.

**Biznes hisobida** ro'yxatlar `creator_id` bo'yicha EMAS, `business_id`
bo'yicha filtrlanadi — biznesning HAMMA a'zolari bir xil ombor va
ijaralarni ko'radi ("nima kimda" hamma adminda ko'rinsin). Huquqlar
`BusinessInterceptor` siyosati bilan bir xil: o'qish — hamma, yozish —
OWNER/ADMIN, o'chirish — OWNER.

### 3.1 Ombor

#### `GET /rental-item/my` → `RentalItemResponseDTO[]`

Sahifalanmaydi (buyum turlari o'nlab, ko'pi bilan yuzlab). `visible = true`
lar, `busyQuantity` bilan.

#### `POST /rental-item` → `RentalItemResponseDTO`

```json
{
  "name": "Lesa",
  "category": "Qurilish",
  "period": "DAY",
  "price": 5000,
  "currency": "UZS",
  "unit": "DONA",
  "totalQuantity": 100,
  "note": "1 sektsiya = 2 rama + 2 diagonal"
}
```

Tekshiruv: `name` bo'sh emas, `price > 0`, `totalQuantity > 0`.

#### `PUT /rental-item` → `RentalItemResponseDTO`

Yuqoridagi + `id`. `totalQuantity < busy` bo'lsa →
409 `rental.item.total.below.busy`. `period`/`price` o'zgarishi ochiq
ijaralarga TA'SIR QILMAYDI — ular narx va davrni o'zida nusxa qilib
saqlaydi.

#### `DELETE /rental-item/{id}` → `AppResponse<String>`

`busy > 0` bo'lsa → 409 `rental.item.in.use`. Aks holda `visible = false`
(soft delete): eski ijaralar `item_name` nusxasi bilan ko'rinishda qoladi.

#### `RentalItemResponseDTO`

```json
{
  "id": "uuid",
  "businessId": "uuid",
  "name": "Lesa",
  "category": "Qurilish",
  "period": "DAY",
  "price": 5000,
  "currency": "UZS",
  "unit": "DONA",
  "totalQuantity": 100,
  "busyQuantity": 50,
  "note": null,
  "createdDate": "2026-10-13T09:12:33"
}
```

`freeQuantity` yuborilmaydi — telefon `max(0, total − busy)` qiladi.

### 3.2 Ijara

#### `POST /rental/batch` → `RentalResponseDTO[]` — YANGI, asosiy yo'l

Bir mijozga bir yoki bir nechta buyum (to'yga stul + stol + chodir):

```json
{
  "clientId": "uuid",
  "period": "DAY",
  "startDate": "2026-10-13",
  "startTime": "14:00",
  "duration": 3,
  "note": "Obyekt: Chilonzor 9",
  "lines": [
    { "rentalItemId": "uuid-lesa",     "quantity": 40,  "price": 5000 },
    { "rentalItemId": "uuid-opalubka", "quantity": 120, "price": 3000 }
  ]
}
```

- Har qator alohida `rental` yozuvi bo'ladi; `item_name`, `unit`,
  `currency` ombordagi buyumdan NUSXA qilinadi; `price` qatordan (chegirma
  bo'lishi mumkin).
- `startTime` faqat `period = HOUR` da majburiy, kunlikda e'tiborsiz.
- `due` = `start + duration` (kun yoki soat) — SERVER hisoblaydi.
- Hamma qator buyumi `period` ga mos bo'lishi shart → aks holda 400
  `rental.item.period.mismatch`.
- **Bitta tranzaksiya**: biror qatorda `quantity > free` →
  409 `rental.item.not.enough`, HECH BIRI yozilmaydi.
- **Poyga:** ikki admin bir paytda oxirgi 10 ta lesani bera olmasin —
  qatorlardagi `rental_item` lar `SELECT ... FOR UPDATE` bilan qulflanadi,
  bo'sh soni shundan keyin tekshiriladi.

#### `POST /rental` (1-versiya) — eski ilovalar uchun qoladi

O'zgarishsiz qabul qilinadi (`itemName`, `dailyPrice`, `days`). Omborga
bog'lanmaydi (`rental_item_id = NULL`, `period = DAY`).

#### `PUT /rental` → `RentalResponseDTO`

```json
{
  "id": "uuid",
  "itemName": "Lesa",
  "quantity": 45,
  "period": "DAY",
  "price": 5000,
  "currency": "UZS",
  "startDate": "2026-10-13",
  "startTime": null,
  "duration": 3,
  "note": null
}
```

- `clientId`, `rentalItemId` o'zgarmaydi (yuborilsa e'tiborsiz).
  `period` ham o'zgarmaydi — summa qoidasi boshqa bo'lib qolardi.
- `quantity` ko'paysa ombordan tekshiriladi: `yangi − eski ≤ free` →
  aks holda 409 `rental.item.not.enough`.
- `quantity` qaytarilgandan kam bo'lmaydi → 409
  `rental.quantity.below.returned` (1-versiyadagidek).
- **Eski ilova** `dailyPrice` + `days` yuboradi — ular ham qabul qilinadi
  (`price ?? dailyPrice`, `duration ?? days`).

#### `POST /rental/my?page=1&size=20`

Filtr:

```json
{
  "clientId": "uuid",
  "rentalItemId": "uuid",
  "status": "OUT|OVERDUE|DEBT|CLOSED|ACTIVE|RETURNED",
  "search": "lesa"
}
```

| `status` | Ma'nosi |
|---|---|
| `OUT` | buyum mijozda (ACTIVE + OVERDUE) |
| `OVERDUE` | mijozda va muddati o'tgan |
| `DEBT` | **nasiya**: hamma buyum qaytgan, `olinmagan > 0` |
| `CLOSED` | qaytgan va to'liq to'langan |
| `ACTIVE`, `RETURNED` | 1-versiya qiymatlari — eski ilovalar uchun |

`DEBT`/`CLOSED` uchun summa kerak: yopilgan ijarada u o'zgarmaydi, demak
SQL'da `price × buyum-davrlar − paid_amount` sifatida hisoblash mumkin.
Telefon baribir o'zi ham bosqich bo'yicha ajratadi, lekin sahifalash
to'g'ri ishlashi uchun server ham filtrlashi kerak.

#### `POST /rental/summary`

Tana — xuddi shu filtr. Javob (yangi maydonlar belgilangan):

```json
{
  "activeCount": 7,
  "overdueCount": 2,
  "debtCount": 3,                                  // YANGI
  "outQuantity": 230,                              // YANGI: mijozlardagi buyumlar soni
  "accruedByCurrency":   { "UZS": 2450000, "USD": 120 },
  "unpaidByCurrency":    { "UZS": 900000 },
  "outUnpaidByCurrency": { "UZS": 600000 },        // YANGI: mijozdagilardan olinishi kerak
  "debtByCurrency":      { "UZS": 300000 }         // YANGI: nasiya
}
```

`unpaidByCurrency = outUnpaidByCurrency + debtByCurrency` (+ ortiqcha
to'lovlar manfiy). Valyutalar **qo'shilmaydi**. Yangi maydonlar kelmasa
telefon avvalgidek bitta "Olinmagan pul" ko'rsatadi.

#### `GET /rental/{id}`, `DELETE /rental/{id}`, `POST /rental/{id}/payment`

1-versiyadagidek.

#### `POST /rental/{id}/return` → `RentalResponseDTO`

```json
{ "returnedDate": "2026-10-04", "returnedTime": "17:10", "quantity": 3 }
```

`returnedTime` faqat soatlik ijarada (berilmasa — hozirgi soat). Qolgani
1-versiyadagidek; `returned < start` tekshiruvi soatlikda sana+soat
bo'yicha. Qaytgan buyum o'z-o'zidan omborga BO'SH bo'lib qaytadi (band
soni hisoblanadi, saqlanmaydi).

### 3.3 `RentalResponseDTO`

```json
{
  "id": "uuid",
  "clientId": "uuid",
  "clientName": "Akmal Tursunov",
  "clientPhone": "998901234567",
  "rentalItemId": "uuid",                 // YANGI (eski yozuvlarda null)
  "productId": null,
  "itemName": "Lesa",
  "quantity": 40,
  "unit": "DONA",
  "period": "DAY",                        // YANGI
  "price": 5000,                          // YANGI nom
  "dailyPrice": 5000,                     // o'tish davri: eski ilovalar uchun xuddi shu qiymat
  "currency": "UZS",
  "startDate": "2026-10-01",
  "startTime": null,                      // YANGI, HOUR da "14:00"
  "dueDate": "2026-10-04",
  "dueTime": null,                        // YANGI
  "returnedDate": null,
  "returnedTime": null,                   // YANGI
  "returns": [
    { "id": "uuid", "quantity": 3, "returnedDate": "2026-10-03", "returnedTime": null }
  ],
  "paidAmount": 0,
  "note": null,
  "creatorName": "Bekzod (admin)",        // YANGI: biznesda kim bergani
  "createdDate": "2026-10-01T09:12:33",

  "status": "OVERDUE",
  "billedDays": 11,
  "overdueDays": 8,
  "returnedQuantity": 3,
  "remainingQuantity": 37,
  "accrued": 550000.00,
  "unpaid": 550000.00
}
```

Oxirgi yetti maydon — SERVER hisoblagani; ilova ularni ko'rsatishda
ishlatmaydi (ekran ochiq turganda summa o'sib borishi kerak). Ular ikki
tomon hisobini solishtirish uchun. Soatlik ijarada `billedDays` /
`overdueDays` SOAT sonini bildiradi (nomi tarixiy).

Sanalar `YYYY-MM-DD`, soatlar `HH:mm` — mintaqasiz.

---

## 4. Xato kodlari (yangi)

| Kod | HTTP | Qachon |
|---|---|---|
| `rental.item.not.enough` | 409 | omborda bo'sh soni yetmaydi (batch, PUT) |
| `rental.item.in.use` | 409 | mijozlarda turgan buyumni o'chirish |
| `rental.item.total.below.busy` | 409 | jami sonini banddan kam qilish |
| `rental.item.period.mismatch` | 400 | batch'da davri boshqa buyum |
| `rental.item.not.found` | 404 | boshqa biznesning yoki o'chirilgan buyumi |

Xabar matni boshqa bo'limlardagidek lokalizatsiya qilinadi — ilova uni
to'g'ridan-to'g'ri ko'rsatadi.

---

## 5. Chiqarish

**Tartib: avval backend, keyin frontend.** Yangi ilova eski serverda
ombor bo'limini ocholmaydi (`/rental-item` yo'q) va `/rental/batch` 404
qaytaradi. Teskarisi xavfsiz: eski ilova yangi serverda avvalgidek
ishlaydi (`POST /rental`, `dailyPrice`, `days` qabul qilinadi va
qaytariladi).

Serverda backend chiqqandan keyin bir marta (ixtiyoriy, tezlik uchun):
`V27__rental_item.sql` dagi indekslar.

## 6. Qarz bo'limi bilan bog'lanish — QOIDA KELISHILDI, ULANMAGAN

Ijara qoldig'i mijozning QARZ BALANSIGA qo'shiladi, lekin hammasi emas:

| Holat | Balansga qo'shiladimi |
|---|---|
| Muddat kelmagan, yakuniy sana ham belgilanmagan | **yo'q** |
| Muddat kelgan (yoki o'tib ketgan) | **ha** |
| Muddat kelmagan, lekin yakuniy sana oldindan kiritilgan | **ha** |

Mantiq: summa QAT'IYLASHGANDA qarz bo'ladi. Ochiq muddatli ijarada
(buyum berilgan, qachon qaytishi kelishilmagan) yakuniy summa hali
ma'lum emas — uni balansga qo'shish yolg'on raqam bo'lardi. Muddat
kelishilgan bo'lsa summa ma'lum va bu haqiqiy qarz.

MUDDATDAN KEYINGI KUNLAR ham ikki tomonning hisobida yurib boradi:
kechikkan ijara har kuni o'sadi va o'sgan summa balansda ko'rinadi.

Buning uchun kerak bo'ladigan ishlar:

1. **Ochiq muddatli ijara.** Hozir muddat MAJBURIY (`duration`), ya'ni
   "yakuniy sana belgilanmagan" holatini ifodalab bo'lmaydi. `due_date`
   null bo'la olishi va forma shu holatni qabul qilishi kerak.
2. **Balansga ulash.** Mijoz balansi hisoblanganda ijara qoldig'i
   yuqoridagi shart bo'yicha qo'shiladi — egasiga "olinishi kerak",
   mijozga "to'lashim kerak".
3. **Mijozning to'lovi.** Hozir to'lovni faqat egasi yozadi. Mijoz
   "to'ladim" deb yoza olishi uchun ijara so'rovidagi kabi tasdiq
   oqimi kerak (aks holda mijoz qarzini o'zicha yopib qo'ya olardi).

## 7. Bildirishnoma (ixtiyoriy, keyingi qadam)

Muddati bugun (soatlikda — shu soatda) tugaydigan va kechikkan ijaralar
uchun bildirishnoma mavjud `notification` mexanizmiga tabiiy tushadi.
Frontend tomonda qo'shimcha ish talab qilmaydi — faqat yangi `type` qiymati.
