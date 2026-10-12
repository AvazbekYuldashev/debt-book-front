import { formatDateFromDate, isValidDateInput } from '../../../shared/lib/date';
import { RentalResponseDTO, RentalStatus, toAmount } from '../types/rental';

/**
 * Ijara hisobining YAGONA joyi. Ekranlar hisobni o'zi qilmaydi.
 *
 * ============================ KUN QOIDASI ============================
 * Kun = TUN. 1-oktyabrda berilgan 3 kunlik ijaraning muddati 4-oktyabr;
 * 4-oktyabrda qaytarilsa aynan 3 kun hisoblanadi.
 *
 * Shu qoida tanlangani sababi: foydalanuvchi KUN SONINI kiritadi
 * (`dueDate = startDate + days`), demak qaytarish kuni kelganda hisob
 * ham xuddi o'sha kun soniga teng chiqishi kerak. Ikki chetini ham
 * qo'shadigan sanoqda ("1-dan 4-gacha = 4 kun") 3 kunlik ijara 4 kun
 * bo'lib ketardi va odam dasturga ishonmay qolardi.
 *
 * YAGONA istisno — eng kami bir kun: ertalab berib kechqurun qaytarilgan
 * buyum uchun 0 kun emas, 1 kun olinadi.
 *
 * MUDDATDAN KEYIN HISOB TO'XTAMAYDI: buyum qaytmaguncha har kun
 * ustiga qo'shilib boradi.
 *
 * ========================= QISMAN QAYTARISH =========================
 * Buyum PARTIYALAB qaytishi mumkin va har partiya O'Z kunigacha
 * hisoblanadi:
 *
 *   10 stul, 1-oktyabr:  3 tasi 3-oktyabrda qaytdi  -> 3 × 2 kun
 *                        7 tasi hali mijozda        -> 7 × (bugungacha)
 *
 * Shuning uchun summa BUYUM-KUNLAR yig'indisidan chiqariladi, oddiy
 * "miqdor × kun" dan emas.
 *
 * Server ham AYNAN shu qoidani bajaradi
 * (Debt-Book: rental/service/RentalCalculator.java, docs/rental-api.md) —
 * aks holda telefondagi summa bilan serverdagi summa farq qiladi.
 * =====================================================================
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Kalendar kunining tartib raqami.
 *
 * UTC orqali: yozgi/qishki vaqtga o'tish kuni 23 yoki 25 soat bo'ladi va
 * oddiy millisekund ayirmasi bir kunni yeb qo'yishi mumkin.
 */
const dayNumber = (value: string): number | null => {
  if (!isValidDateInput(value)) return null;
  const [y, m, d] = value.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / DAY_MS;
};

/** Bugungi sana YYYY-MM-DD ko'rinishida (qurilmaning lokal kuni). */
export const todayString = (): string => formatDateFromDate(new Date());

/**
 * `from` dan `to` gacha o'tgan kunlar soni. Sana noto'g'ri bo'lsa null.
 * Teskari oraliqda manfiy qiymat qaytadi — chegarani chaqiruvchi qo'yadi.
 */
export const daysBetween = (from: string, to: string): number | null => {
  const start = dayNumber(from);
  const end = dayNumber(to);
  if (start === null || end === null) return null;
  return end - start;
};

/** Ikki sana orasidagi hisob kunlari — kamida 1. */
export const billedDaysBetween = (from: string, to: string): number => {
  const diff = daysBetween(from, to);
  if (diff === null) return 1;
  return Math.max(1, diff);
};

// ---------------------------------------------------------------- miqdor

/** Berilgan buyumlar soni (eski yozuvlarda maydon yo'q = 1). */
export const totalQuantity = (rental: RentalResponseDTO): number => toAmount(rental.quantity) || 1;

/** Shu paytgacha qaytgan buyumlar soni. */
export const returnedQuantity = (rental: RentalResponseDTO): number =>
  (rental.returns ?? []).reduce((sum, item) => sum + toAmount(item.quantity), 0);

/**
 * Hali mijozda turgan buyumlar soni.
 *
 * `returnedDate` to'la bo'lsa NOL: u yozuvning yopilganlik belgisi va
 * partiyalar joriy qilinishidan oldingi yozuvlarda partiya umuman yo'q.
 * Shu tekshiruvsiz eski yozuv "hali mijozda" deb hisoblanib, summasi
 * har kuni o'sib ketardi.
 */
export const remainingQuantity = (rental: RentalResponseDTO): number => {
  if (rental.returnedDate) return 0;
  return Math.max(0, totalQuantity(rental) - returnedQuantity(rental));
};

/** Buyum qisman qaytganmi — qatorda va kartada alohida ko'rsatiladi. */
export const isPartiallyReturned = (rental: RentalResponseDTO): boolean =>
  !rental.returnedDate && returnedQuantity(rental) > 0;

// ---------------------------------------------------------------- kunlar

/** Hisob to'xtagan kun: yozuv yopilgan bo'lsa o'sha sana, aks holda bugun. */
export const effectiveEndDate = (rental: RentalResponseDTO, today = todayString()): string => {
  // Yopilganlik belgisi birinchi: u yozuv qachon tugaganini aniq aytadi.
  if (rental.returnedDate && isValidDateInput(rental.returnedDate)) return rental.returnedDate;
  if (remainingQuantity(rental) > 0) return today;

  const dates = (rental.returns ?? []).map((item) => item.returnedDate).filter(Boolean);
  if (dates.length === 0) return today;
  return dates.reduce((last, date) => (date > last ? date : last));
};

/**
 * Ko'rsatish uchun kun soni: ijara boshidan hisob to'xtagan kungacha.
 *
 * Qisman qaytarishda bu raqam PULNI bermaydi (har partiya o'z kunigacha
 * hisoblanadi) — u faqat "bu ijara qancha davom etdi" degan ma'noda.
 */
export const billedDays = (rental: RentalResponseDTO, today = todayString()): number =>
  billedDaysBetween(rental.startDate, effectiveEndDate(rental, today));

/** Muddatdan keyin o'tgan kunlar. Muddat kunining o'zida hali 0. */
export const overdueDays = (rental: RentalResponseDTO, today = todayString()): number => {
  const diff = daysBetween(rental.dueDate, effectiveEndDate(rental, today));
  if (diff === null) return 0;
  return Math.max(0, diff);
};

/**
 * Holat sanalardan va qaytgan miqdordan chiqariladi.
 *
 * RETURNED faqat HAMMA buyum qaytganda — qisman qaytarishdan keyin ijara
 * ochiq qoladi va qolgani uchun hisob davom etadi.
 */
export const rentalStatus = (rental: RentalResponseDTO, today = todayString()): RentalStatus => {
  if (remainingQuantity(rental) === 0) return 'RETURNED';
  return overdueDays(rental, today) > 0 ? 'OVERDUE' : 'ACTIVE';
};

// ---------------------------------------------------------------- pul

/**
 * Yig'ilgan ijara haqi: kunlik narx × buyum-kunlar yig'indisi.
 *
 * Har qaytarish partiyasi o'z kunigacha, qaytmagan qism esa hisob
 * to'xtagan kungacha hisoblanadi.
 */
export const accruedAmount = (rental: RentalResponseDTO, today = todayString()): number => {
  const price = toAmount(rental.dailyPrice);
  const end = effectiveEndDate(rental, today);

  let itemDays = 0;
  for (const item of rental.returns ?? []) {
    itemDays += toAmount(item.quantity) * billedDaysBetween(rental.startDate, item.returnedDate);
  }

  const remaining = remainingQuantity(rental);
  if (remaining > 0) {
    itemDays += remaining * billedDaysBetween(rental.startDate, end);
  } else if ((rental.returns ?? []).length === 0) {
    // Partiyasiz yopilgan eski yozuv: butun miqdor `returnedDate` gacha.
    itemDays += totalQuantity(rental) * billedDaysBetween(rental.startDate, end);
  }

  return price * itemDays;
};

/**
 * Mijozning shu ijara bo'yicha qarzi: yig'ilgan − to'langan.
 *
 * Manfiy qiymat KESILMAYDI: oldindan ko'proq to'lab qo'ygan bo'lsa bu
 * haqiqat va ekranda "ortiqcha to'lov" bo'lib ko'rinishi kerak.
 */
export const unpaidAmount = (rental: RentalResponseDTO, today = todayString()): number =>
  accruedAmount(rental, today) - toAmount(rental.paidAmount);

// ---------------------------------------------------------------- sanalar

/**
 * Boshlanish sanasi + kun soni = muddat sanasi (YYYY-MM-DD).
 *
 * Sana LOKAL vaqtda quriladi. `dayNumber` dagi UTC tartib raqamidan
 * timestamp yasab bo'lmaydi: UTC yarim tuni manfiy ofsetli mintaqalarda
 * (masalan UTC−5) oldingi kunga tushadi va muddat bir kun oldin
 * ko'rinardi. `new Date(y, m, d + n)` oy va yil chegarasini o'zi hal qiladi.
 */
export const dueDateFrom = (startDate: string, days: number): string | null => {
  if (!isValidDateInput(startDate) || !Number.isFinite(days) || days < 1) return null;
  const [y, m, d] = startDate.split('-').map(Number);
  return formatDateFromDate(new Date(y, m - 1, d + Math.floor(days)));
};

/** Teskari amal — tahrirlash formasida kun maydonini to'ldirish uchun. */
export const daysFromDueDate = (startDate: string, dueDate: string): number | null => {
  const diff = daysBetween(startDate, dueDate);
  if (diff === null || diff < 1) return null;
  return diff;
};
