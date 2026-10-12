# Ijara (rental) — shartnoma

Ikki tomon ham YOZILGAN:

- frontend — `src/features/rentals/` (shu repozitoriya)
- backend — `api/debt/book/rental/` (repo: `AvazbekYuldashev/Debt-Book`)

Yo'llar `/api/v1` ostida. Bu hujjat ikkisi orasidagi shartnoma: bir tomonni
o'zgartirganda ikkinchisi ham shu yerdan tekshirilishi kerak.

Mantiq: **buyum beriladi → kelishilgan kun o'tadi → puli olinadi.** Pul buyum
qaytganda olinadi, ya'ni shu paytgacha mijozda **qarz** bo'lib turadi.

---

## 1. KUN QOIDASI (eng muhim qism)

Summa vaqt bilan o'sadi, shuning uchun u **saqlanmaydi** — kunlik narxdan
qaytadan hisoblanadi. Server va telefon **aynan bir xil** qoidani bajarishi
shart, aks holda ekrandagi raqam bilan bazadagi raqam farq qiladi.

```
kun = TUN (boshlanish kuni kiradi, tugash kuni kirmaydi)

hisob_tugash_kuni = returnedDate ?? bugun
hisoblangan_kun   = max(1, hisob_tugash_kuni − startDate)
kechikkan_kun     = max(0, hisob_tugash_kuni − dueDate)

yig'ilgan_summa   = dailyPrice × quantity × hisoblangan_kun
olinmagan_qoldiq  = yig'ilgan_summa − paidAmount
```

Natijalar (1-oktyabrda berilgan, 3 kunlik ijara → `dueDate` = 4-oktyabr):

| Qaytarilgan kun | Hisoblangan kun | Kechikish |
|---|---|---|
| 1-oktyabr (o'sha kuni) | 1 (eng kami) | 0 |
| 4-oktyabr (muddatida) | 3 | 0 |
| 9-oktyabr (kech) | 8 | 5 |
| qaytmadi, bugun 12-oktyabr | 11 | 8 |

Nima uchun shunday: foydalanuvchi **kun sonini** kiritadi
(`dueDate = startDate + days`), demak muddat kuni kelganda hisob ham o'sha
kun soniga teng chiqishi kerak. Ikki chetini ham qo'shadigan sanoqda 3 kunlik
ijara 4 kun bo'lib ketardi.

Formula ikki joyda, bir xil:

- frontend — `src/features/rentals/model/rentalMath.ts` (26 test)
- backend — `rental/service/RentalCalculator.java` (16 test)

Ikkalasi ham AYNAN shu jadvalni qaytaradi. Yakuniy hisob server tomonda:
pul masalasida telefon emas, server haq.

### Qisman qaytarish

Buyum PARTIYALAB qaytishi mumkin va har partiya **o'z kunigacha**
hisoblanadi. Shuning uchun summa oddiy "miqdor × kun" emas, **buyum-kunlar
yig'indisi**:

```
10 stul, 1-oktyabr:  3 tasi 3-oktyabrda qaytdi  -> 3 × 2 kun  =  6
                     7 tasi hali mijozda        -> 7 × 11 kun = 77
                                                   jami        83 buyum-kun
```

`rental.returned_date` **faqat HAMMA buyum qaytganda** to'ldiriladi — u
yopilganlik belgisi va ro'yxat so'rovlari (holat filtri, tartib) aynan shunga
tayanadi. Qisman qaytarishda to'ldirilsa, qolgan buyumlar hali mijozda turgani
holda ijara "qaytarilgan" bo'lib ko'rinardi.

Partiyasiz yopilgan ESKI yozuvlar (bu o'zgarishdan oldin yaratilganlar)
avvalgidek hisoblanadi: `returned_date` bor, partiya yo'q -> butun miqdor
o'sha sanagacha.

### Holat (status) saqlanmaydi

`ACTIVE` / `OVERDUE` / `RETURNED` ustun sifatida saqlanmaydi, sanalardan
hisoblanadi:

```
returnedDate bor           -> RETURNED   (kech qaytarilgan bo'lsa ham)
kechikkan_kun > 0          -> OVERDUE
aks holda                  -> ACTIVE
```

Saqlanganda "bugun" o'zgarishi bilan yozuv yolg'on holatda qolib ketardi.
Filtrdagi `status` esa shu hisobga mos qatorlarni qaytarishi kerak.

---

## 2. Jadval

```sql
CREATE TABLE rental (
    id              UUID PRIMARY KEY,
    client_id       UUID NOT NULL REFERENCES client(id),
    business_id     UUID REFERENCES business(id),   -- X-Business-ID konteksti
    creator_id      UUID NOT NULL,
    product_id      UUID REFERENCES product(id),    -- narxnomadan tanlangan bo'lsa
    item_name       VARCHAR(255) NOT NULL,          -- NUSXA: narxnoma o'zgarsa ham saqlanadi
    quantity        NUMERIC(12,2) NOT NULL DEFAULT 1,
    unit            VARCHAR(32),                    -- ProductUnit enum'i
    daily_price     NUMERIC(19,2) NOT NULL,
    currency        VARCHAR(3)  NOT NULL DEFAULT 'UZS',
    start_date      DATE NOT NULL,
    due_date        DATE NOT NULL,                  -- start_date + days
    returned_date   DATE,                           -- NULL = buyum hali mijozda
    paid_amount     NUMERIC(19,2) NOT NULL DEFAULT 0,
    note            TEXT,
    visible         BOOLEAN NOT NULL DEFAULT TRUE,
    created_date    TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_rental_client ON rental (client_id);
CREATE INDEX idx_rental_open   ON rental (returned_date) WHERE returned_date IS NULL;
```

Qaytarish partiyalari alohida jadvalda (`V26__rental_return.sql`):

```sql
CREATE TABLE rental_return (
    id            VARCHAR(36) PRIMARY KEY,
    rental_id     VARCHAR(36) NOT NULL REFERENCES rental(id),
    quantity      NUMERIC(19,3) NOT NULL,   -- shu partiyada nechta qaytdi
    returned_date DATE        NOT NULL,     -- qaysi kuni
    created_date  TIMESTAMP   NOT NULL DEFAULT now()
);
CREATE INDEX idx_rental_return_rental ON rental_return (rental_id);
```

Ijara yozuvining o'zi BO'LINMAYDI: buyum bitta kelishuv bo'yicha berilgan va
to'lov ham bitta. Yozuvni ikkiga ajratish "to'langan summani qaysi bo'lakka
yozamiz" degan sun'iy savolni tug'dirardi.

Amalda yozilgan versiya: `src/main/resources/db.migration/V25__rental.sql`.
`business_id` NULL bo'lishi mumkin — ijara shaxsiy hisobda ham yuritiladi
(narxnomadan farqi shu). Flyway o'chirilgan, jadvalni `ddl-auto=update`
yaratadi; indekslar esa serverda qo'lda bajarilishi kerak.

To'lovlar alohida jadvalda yuritilmaydi: frontend ham, panel ham faqat
yig'indini (`paidAmount`) ishlatadi, qisman to'lovlar tarixi esa hozircha
talab qilinmagan.

---

## 3. Endpointlar

Hammasi JWT talab qiladi va `X-Business-ID` sarlavhasini boshqa bo'limlar
bilan bir xil hisobga oladi.

### `POST /rental/my?page=1&size=20`

Tana — filtr (bo'sh bo'lsa hammasi):

```json
{ "clientId": "uuid", "status": "ACTIVE|OVERDUE|RETURNED", "search": "perforator" }
```

Javob — `PageResponse<RentalResponseDTO>` (boshqa bo'limlardagi sahifa shakli).

`search` buyum nomi **va** mijoz ismi bo'yicha qidiradi.

### `POST /rental/summary`

Tana — xuddi shu filtr. Javob:

```json
{
  "activeCount": 7,
  "overdueCount": 2,
  "accruedByCurrency": { "UZS": 2450000, "USD": 120 },
  "unpaidByCurrency":  { "UZS": 900000 }
}
```

Valyutalar **qo'shilmaydi** — gap kassadagi qoida bilan bir xil.
`accruedByCurrency` yuqoridagi kun qoidasi bo'yicha hisoblanadi.

### `GET /rental/{id}` → `RentalResponseDTO`

### `POST /rental` → `RentalResponseDTO`

```json
{
  "clientId": "uuid",
  "itemName": "Perforator",
  "productId": "uuid",
  "quantity": 1,
  "unit": "DONA",
  "dailyPrice": 50000,
  "currency": "UZS",
  "startDate": "2026-10-01",
  "days": 3,
  "note": "Qo'shimcha g'ilof bilan"
}
```

**`dueDate` frontenddan kelmaydi** — server `startDate + days` qilib o'zi
qo'yadi. Ikkisi ham yuborilsa bir-biriga mos kelmaydigan juftlik paydo
bo'lish ehtimoli bor.

Tekshiruvlar: `clientId` chaqiruvchiga tegishli bo'lishi, `days >= 1`,
`dailyPrice > 0`, `quantity > 0`.

### `PUT /rental` → `RentalResponseDTO`

PUT semantikasi: `id`, `itemName`, `dailyPrice`, `startDate`, `days`
MAJBURIY (narxnomadagi `PUT /product` bilan bir xil). `dueDate` qayta
hisoblanadi.

`quantity` ni allaqachon QAYTARILGAN sondan kam qilib bo'lmaydi
(409 `rental.quantity.below.returned`) — u holda qolgan miqdor manfiyga
tushardi.

`clientId` DTO'da umuman yo'q — yuborilsa jim e'tiborsiz qoldiriladi
(Jackson standart sozlamasi). Mijozni almashtirish yozuvni boshqa odamning
ijarasiga aylantirardi, to'lov tarixi esa birinchisida qolib ketardi —
boshqa odamga berilgan buyum uchun yangi ijara ochiladi.

### `POST /rental/{id}/return` → `RentalResponseDTO`

```json
{ "returnedDate": "2026-10-04", "quantity": 3 }
```

Har chaqiruv YANGI PARTIYA qo'shadi (ustiga yozmaydi).

- `returnedDate` berilmasa — bugun
- `quantity` berilmasa — qolganining hammasi (eng ko'p uchraydigan holat;
  bitta buyumli ijarada ilova bu savolni umuman bermaydi)

Xatolar: `returnedDate < startDate` -> 409 `rental.return.before.start`;
`quantity` qolganidan ko'p -> 409 `rental.return.too.many`; hamma buyum
qaytib bo'lgandan keyin yana chaqirilsa -> 409 `rental.already.returned`.

### `POST /rental/{id}/payment` → `RentalResponseDTO`

```json
{ "amount": 150000, "date": "2026-10-04" }
```

`paidAmount` ga **qo'shiladi** (almashtirilmaydi). Qisman to'lov normal holat.

**Qaytarish va to'lov ataylab ikki alohida endpoint**: hayotda buyum qaytib,
puli bir hafta keyin ham berilishi mumkin. Bitta "yopish" amali bo'lsa
dastur ikkisini bir vaqtda bo'ldi deb yozishga majbur bo'lardi.

### `DELETE /rental/{id}` → `AppResponse<String>`

---

## 4. `RentalResponseDTO`

```json
{
  "id": "uuid",
  "clientId": "uuid",
  "clientName": "Akmal Tursunov",
  "clientPhone": "998901234567",
  "productId": null,
  "itemName": "Perforator",
  "quantity": 1,
  "unit": "DONA",
  "dailyPrice": 50000,
  "currency": "UZS",
  "startDate": "2026-10-01",
  "dueDate": "2026-10-04",
  "returnedDate": null,
  "returns": [
    { "id": "uuid", "quantity": 3, "returnedDate": "2026-10-03" }
  ],
  "paidAmount": 0,
  "note": null,
  "createdDate": "2026-10-01T09:12:33",

  "status": "OVERDUE",
  "billedDays": 11,
  "overdueDays": 8,
  "returnedQuantity": 3,
  "remainingQuantity": 7,
  "accrued": 550000.00,
  "unpaid": 550000.00
}
```

Oxirgi besh maydon — SERVER hisoblagani. Ilova ularni hozir
ko'rsatishda ISHLATMAYDI: ekran ochiq turganda summa o'sib borishi kerak,
server esa javobni faqat so'rov paytida beradi. Ular shartnomani tekshirish
uchun: ikki tomonning raqami farq qilsa, hisobda xatolik borligi darhol
ko'rinadi.

Sanalar **`YYYY-MM-DD`** (soat yo'q): hisob kalendar kuni bo'yicha boradi,
soat qo'shilsa mintaqa farqi bir kunni surib yuborardi. `createdDate` esa
odatdagi timestamp.

`dailyPrice`/`paidAmount` BigDecimal — frontend satr kelishiga ham tayyor
(`normalizeRental`), lekin son yuborilsa yaxshi.

---

## 5. Qarz bo'limi bilan bog'lanish — HALI ULANMAGAN

Hozirgi holat: ijara qarzi ijara modulining O'ZIDA yuritiladi
(`unpaid` maydoni va paneldagi "Olinmagan pul"). `money` jadvaliga hech
narsa yozilmaydi, ya'ni Qarzlar ekranidagi mijoz balansida ijara haqi
KO'RINMAYDI.

Buni ulashning ikki yo'li bor va qaysi birini tanlash ma'lumot modeliga
qaytarib bo'lmaydigan ta'sir qiladi — shuning uchun qaror so'ralmaguncha
hech biri bajarilmadi:

1. **Hisoblab ko'rsatish.** `money` ga yozuv tushmaydi, mijoz balansi
   hisoblanganda ijara qoldig'i qo'shiladi. Ortga qaytarish oson, lekin
   qarzlar bo'limidagi hisob-kitob mantiqi o'zgaradi.
2. **Haqiqiy qarz yozuvi.** Buyum qaytarilganda (summa qat'iylashganda)
   `money` ga oddiy qarz yozuvi tushadi. Qarzlar bo'limi tegilmaydi, lekin
   ikki jadval bir pulni ko'rsatib qolmasligi uchun ijara to'lovlari
   o'sha yozuv bilan bog'lanishi kerak — aks holda bir qarz ikki marta
   sanaladi.

Frontend ikkalasiga ham tayyor: har o'zgarishdan keyin `contacts` va
`contact-balances` so'rovlarini yangilaydi (`hooks/useRentals.ts`).

## 6. Bildirishnoma (ixtiyoriy, keyingi qadam)

Muddati bugun tugaydigan va kechikkan ijaralar uchun kunlik bildirishnoma
mavjud `notification` mexanizmiga tabiiy tushadi. Frontend tomonda
qo'shimcha ish talab qilmaydi — faqat yangi `type` qiymati kerak.
