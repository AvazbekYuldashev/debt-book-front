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
 * ustiga qo'shilib boradi. Shuning uchun sana YO'Q (`returnedDate`
 * null) bo'lsa hisob "bugun"ga nisbatan chiqariladi.
 *
 * Server ham AYNAN shu qoidani bajarishi shart (docs/rental-api.md) —
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

/** Ijara tugagan (yoki hozircha to'xtagan) kun: qaytarilgan sana yoki bugun. */
export const effectiveEndDate = (rental: RentalResponseDTO, today = todayString()): string =>
  rental.returnedDate && isValidDateInput(rental.returnedDate) ? rental.returnedDate : today;

/**
 * Hisobga kiradigan kunlar soni — kamida 1.
 *
 * Buyum qaytmagan bo'lsa bugungacha, qaytgan bo'lsa qaytgan kungacha.
 */
export const billedDays = (rental: RentalResponseDTO, today = todayString()): number => {
  const diff = daysBetween(rental.startDate, effectiveEndDate(rental, today));
  if (diff === null) return 1;
  return Math.max(1, diff);
};

/** Muddatdan keyin o'tgan kunlar. Muddat o'tmagan bo'lsa 0. */
export const overdueDays = (rental: RentalResponseDTO, today = todayString()): number => {
  const diff = daysBetween(rental.dueDate, effectiveEndDate(rental, today));
  if (diff === null) return 0;
  return Math.max(0, diff);
};

/**
 * Holat sanalardan chiqariladi.
 *
 * Qaytarilgan sana bor — RETURNED, muddatidan keyin qaytarilgan bo'lsa ham:
 * ish tugagan, ro'yxatda qizil bo'lib qolishi noto'g'ri bo'lardi.
 */
export const rentalStatus = (rental: RentalResponseDTO, today = todayString()): RentalStatus => {
  if (rental.returnedDate) return 'RETURNED';
  return overdueDays(rental, today) > 0 ? 'OVERDUE' : 'ACTIVE';
};

/** Shu paytgacha yig'ilgan ijara haqi: kunlik narx × nechta buyum × kun. */
export const accruedAmount = (rental: RentalResponseDTO, today = todayString()): number => {
  const quantity = toAmount(rental.quantity) || 1;
  return toAmount(rental.dailyPrice) * quantity * billedDays(rental, today);
};

/**
 * Mijozning shu ijara bo'yicha qarzi: yig'ilgan − to'langan.
 *
 * Manfiy qiymat KESILMAYDI: oldindan ko'proq to'lab qo'ygan bo'lsa bu
 * haqiqat va ekranda "haqdor" bo'lib ko'rinishi kerak.
 */
export const unpaidAmount = (rental: RentalResponseDTO, today = todayString()): number =>
  accruedAmount(rental, today) - toAmount(rental.paidAmount);

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
