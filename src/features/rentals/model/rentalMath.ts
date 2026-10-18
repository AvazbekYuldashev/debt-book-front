import { formatDateFromDate, isValidDateInput } from '../../../shared/lib/date';
import {
  RentalPeriod,
  RentalResponseDTO,
  RentalReturnItemDTO,
  RentalStage,
  RentalStatus,
  normalizeRentalPeriod,
  toAmount,
} from '../types/rental';

/**
 * Ijara hisobining YAGONA joyi. Ekranlar hisobni o'zi qilmaydi.
 *
 * Narx ikki xil davrda bo'ladi: KUNLIK (lesa, opalubka, to'y stullari)
 * va SOATLIK. Hisob ikkalasida ham bir xil: davr narxi × buyum-davrlar
 * yig'indisi. Farq faqat "davr qanday sanaladi" degan joyda.
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
 * =========================== SOAT QOIDASI ============================
 * Boshlangan soat — TO'LIQ soat: 14:00 da berilib 17:10 da qaytgan buyum
 * uchun 4 soat olinadi. Eng kami bir soat. Kechikish ham shunday:
 * muddatdan bir daqiqa o'tsa — 1 soat kechikdi.
 *
 * Kunlik ijarada soat HISOBGA KIRMAYDI (faqat sana), aks holda kechqurun
 * berilgan buyum ertasi ertalab "1 kun" emas, "0.5 kun" bo'lib qolardi.
 *
 * MUDDATDAN KEYIN HISOB TO'XTAMAYDI: buyum qaytmaguncha har davr
 * ustiga qo'shilib boradi.
 *
 * ========================= QISMAN QAYTARISH =========================
 * Buyum PARTIYALAB qaytishi mumkin va har partiya O'Z kunigacha
 * hisoblanadi:
 *
 *   10 stul, 1-oktyabr:  3 tasi 3-oktyabrda qaytdi  -> 3 × 2 kun
 *                        7 tasi hali mijozda        -> 7 × (bugungacha)
 *
 * Shuning uchun summa BUYUM-DAVRLAR yig'indisidan chiqariladi, oddiy
 * "miqdor × davr" dan emas.
 *
 * Server ham AYNAN shu qoidani bajaradi
 * (Debt-Book: rental/service/RentalCalculator.java, docs/rental-api.md) —
 * aks holda telefondagi summa bilan serverdagi summa farq qiladi.
 * =====================================================================
 *
 * VAQT NUQTASI ("moment") — `YYYY-MM-DD` yoki `YYYY-MM-DDTHH:mm` satri,
 * MINTAQASIZ (devor soati). Hisob kalendar va soat bo'yicha boradi;
 * mintaqa qo'shilsa telefon bilan server orasida bir kun/soat surilardi.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;
const HOUR_MINUTES = 60;

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** HH:mm formatini tekshiradi (00:00 — 23:59). */
export const isValidTimeInput = (value: string | null | undefined): value is string =>
  typeof value === 'string' && TIME_RE.test(value);

/** Foydalanuvchi kiritayotgan raqamlarni progressiv HH:mm ga formatlaydi. */
export const formatTimeInputValue = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
};

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

/** Vaqt nuqtasini sana va soatga ajratadi. Soat yo'q yoki buzuq bo'lsa 00:00. */
const splitMoment = (value: string): { date: string; time: string } => {
  const [date = '', rawTime = ''] = (value ?? '').split('T');
  const time = rawTime.slice(0, 5);
  return { date, time: isValidTimeInput(time) ? time : '00:00' };
};

/** Daqiqaning tartib raqami — devor soati bo'yicha, mintaqasiz. */
const minuteNumber = (value: string): number | null => {
  const { date, time } = splitMoment(value);
  if (!isValidDateInput(date)) return null;
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  return Date.UTC(y, m - 1, d, hh, mm) / MINUTE_MS;
};

const pad2 = (value: number): string => String(value).padStart(2, '0');

/** Sana va (bo'lsa) soatdan vaqt nuqtasi. */
export const joinMoment = (date: string, time?: string | null): string =>
  isValidTimeInput(time) ? `${date}T${time}` : date;

/** Ekranda ko'rsatish uchun: "2026-10-13" yoki "2026-10-13 14:00". */
export const formatMoment = (date: string, time?: string | null): string =>
  isValidTimeInput(time) ? `${date} ${time}` : date;

/** Bugungi sana YYYY-MM-DD ko'rinishida (qurilmaning lokal kuni). */
export const todayString = (): string => formatDateFromDate(new Date());

/** Hozirgi soat HH:mm (qurilmaning lokal vaqti). */
export const currentTimeString = (): string => {
  const now = new Date();
  return `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
};

/** Hozirgi vaqt nuqtasi: YYYY-MM-DDTHH:mm. Hisobning "bugun"i shu. */
export const nowString = (): string => `${todayString()}T${currentTimeString()}`;

/**
 * `from` dan `to` gacha o'tgan kunlar soni. Sana noto'g'ri bo'lsa null.
 * Teskari oraliqda manfiy qiymat qaytadi — chegarani chaqiruvchi qo'yadi.
 * Vaqt nuqtasi berilsa soati tashlab yuboriladi.
 */
export const daysBetween = (from: string, to: string): number | null => {
  const start = dayNumber(splitMoment(from).date);
  const end = dayNumber(splitMoment(to).date);
  if (start === null || end === null) return null;
  return end - start;
};

/** Ikki vaqt nuqtasi orasidagi daqiqalar. Noto'g'ri bo'lsa null. */
export const minutesBetween = (from: string, to: string): number | null => {
  const start = minuteNumber(from);
  const end = minuteNumber(to);
  if (start === null || end === null) return null;
  return end - start;
};

/** Ikki sana orasidagi hisob kunlari — kamida 1. */
export const billedDaysBetween = (from: string, to: string): number => {
  const diff = daysBetween(from, to);
  if (diff === null) return 1;
  return Math.max(1, diff);
};

/** Ikki vaqt nuqtasi orasidagi hisob soatlari — boshlangan soat to'liq, kamida 1. */
export const billedHoursBetween = (from: string, to: string): number => {
  const diff = minutesBetween(from, to);
  if (diff === null) return 1;
  return Math.max(1, Math.ceil(diff / HOUR_MINUTES));
};

/** Davrga qarab hisob birliklari (kun yoki soat) — kamida 1. */
export const billedUnitsBetween = (period: RentalPeriod, from: string, to: string): number =>
  period === 'HOUR' ? billedHoursBetween(from, to) : billedDaysBetween(from, to);

// ---------------------------------------------------------------- vaqt nuqtalari

/** Ijara davri (eski yozuvlarda maydon yo'q — kunlik). */
/**
 * Muddat KELISHILGANMI.
 *
 * Kelishilmagan ijarada `dueDate` to'ldirilgan bo'lsa ham u taxmin —
 * hisobda muddat yo'q deb qaraladi.
 */
export const isOpenEnded = (rental: Pick<RentalResponseDTO, 'openEnded'>): boolean =>
  rental.openEnded === true;

/**
 * Shu ijara QARZ BALANSIGA qo'shiladimi.
 *
 * Qoida (egasi bilan kelishilgan):
 *
 *   muddat kelmagan + yakuniy sana kelishilmagan -> yo'q
 *   muddat kelgan (yoki o'tgan)                  -> ha
 *   muddat kelmagan, yakuniy sana kelishilgan    -> ha
 *
 * Mantiq: qarz — SUMMASI MA'LUM bo'lgan majburiyat. Ochiq muddatli
 * ijara hali boshlanmagan bo'lsa (ertangi kunga yozib qo'yilgan)
 * yakuniy summani aytib bo'lmaydi. Muddat kelishilgan bo'lsa summa
 * ma'lum, boshlangan bo'lsa esa hisob allaqachon yurib boryapti.
 *
 * Muddatdan keyingi kunlar alohida shart talab qilmaydi: kechikkan
 * ijara boshlangan bo'ladi va `accruedAmount` qaytmagan qismni
 * bugungacha hisoblaydi — qarz o'z-o'zidan o'sib boradi.
 *
 * SERVER javobidagi `inBalance` ustun: bu yerdagi hisob faqat server
 * maydonni yubormaganda (eski javob) ishlatiladi.
 */
export const countsInBalance = (rental: RentalResponseDTO, today = todayString()): boolean => {
  if (typeof rental.inBalance === 'boolean') return rental.inBalance;
  return !isOpenEnded(rental) || rental.startDate <= today;
};

export const rentalPeriod = (rental: Pick<RentalResponseDTO, 'period'>): RentalPeriod =>
  normalizeRentalPeriod(rental.period);

const isHourly = (rental: RentalResponseDTO): boolean => rentalPeriod(rental) === 'HOUR';

/** Berilgan payt. Soat faqat soatlik ijarada qo'shiladi. */
export const startMoment = (rental: RentalResponseDTO): string =>
  joinMoment(rental.startDate, isHourly(rental) ? rental.startTime : null);

/** Qaytarilishi kerak bo'lgan payt. */
export const dueMoment = (rental: RentalResponseDTO): string =>
  joinMoment(rental.dueDate, isHourly(rental) ? rental.dueTime : null);

const batchMoment = (rental: RentalResponseDTO, batch: RentalReturnItemDTO): string =>
  joinMoment(batch.returnedDate, isHourly(rental) ? batch.returnedTime : null);

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

// ---------------------------------------------------------------- davrlar

/** Hisob to'xtagan payt: yozuv yopilgan bo'lsa o'sha payt, aks holda hozir. */
export const effectiveEnd = (rental: RentalResponseDTO, now = nowString()): string => {
  // Yopilganlik belgisi birinchi: u yozuv qachon tugaganini aniq aytadi.
  if (rental.returnedDate && isValidDateInput(rental.returnedDate)) {
    return joinMoment(rental.returnedDate, isHourly(rental) ? rental.returnedTime : null);
  }
  if (remainingQuantity(rental) > 0) return now;

  const moments = (rental.returns ?? [])
    .filter((item) => Boolean(item.returnedDate))
    .map((item) => batchMoment(rental, item));
  if (moments.length === 0) return now;
  return moments.reduce((last, moment) =>
    (minutesBetween(last, moment) ?? 0) > 0 ? moment : last,
  );
};

/**
 * Ko'rsatish uchun davr soni (kun yoki soat): ijara boshidan hisob
 * to'xtagan paytgacha.
 *
 * Qisman qaytarishda bu raqam PULNI bermaydi (har partiya o'z kunigacha
 * hisoblanadi) — u faqat "bu ijara qancha davom etdi" degan ma'noda.
 */
export const billedUnits = (rental: RentalResponseDTO, now = nowString()): number =>
  billedUnitsBetween(rentalPeriod(rental), startMoment(rental), effectiveEnd(rental, now));

/**
 * Muddatdan keyin o'tgan davrlar. Muddat kunining (soatining) o'zida hali 0.
 * Soatlikda boshlangan soat to'liq: bir daqiqa kechiksa ham 1 soat.
 */
export const overdueUnits = (rental: RentalResponseDTO, now = nowString()): number => {
  // Kelishilmagan muddatni o'tkazib yuborish mumkin emas.
  if (isOpenEnded(rental)) return 0;
  const end = effectiveEnd(rental, now);
  if (isHourly(rental)) {
    const minutes = minutesBetween(dueMoment(rental), end);
    if (minutes === null || minutes <= 0) return 0;
    return Math.ceil(minutes / HOUR_MINUTES);
  }
  const diff = daysBetween(rental.dueDate, end);
  if (diff === null) return 0;
  return Math.max(0, diff);
};

/**
 * Holat sanalardan va qaytgan miqdordan chiqariladi.
 *
 * RETURNED faqat HAMMA buyum qaytganda — qisman qaytarishdan keyin ijara
 * ochiq qoladi va qolgani uchun hisob davom etadi.
 */
export const rentalStatus = (rental: RentalResponseDTO, now = nowString()): RentalStatus => {
  if (remainingQuantity(rental) === 0) return 'RETURNED';
  return overdueUnits(rental, now) > 0 ? 'OVERDUE' : 'ACTIVE';
};

// ---------------------------------------------------------------- pul

/**
 * Pulni tiyin aniqligiga keltiradi: 0.1 × 3 kabi kasrlar "0.30000000004"
 * bo'lib qolmasin va qoldiq nolga teng bo'lganda "nasiya" deb chiqmasin.
 */
const roundMoney = (value: number): number => Math.round(value * 100) / 100;

/**
 * Yig'ilgan ijara haqi: davr narxi × buyum-davrlar yig'indisi.
 *
 * Har qaytarish partiyasi o'z paytigacha, qaytmagan qism esa hisob
 * to'xtagan paytgacha hisoblanadi.
 */
export const accruedAmount = (rental: RentalResponseDTO, now = nowString()): number => {
  const period = rentalPeriod(rental);
  const price = toAmount(rental.price);
  const start = startMoment(rental);
  const end = effectiveEnd(rental, now);

  let itemUnits = 0;
  for (const item of rental.returns ?? []) {
    itemUnits +=
      toAmount(item.quantity) * billedUnitsBetween(period, start, batchMoment(rental, item));
  }

  const remaining = remainingQuantity(rental);
  if (remaining > 0) {
    itemUnits += remaining * billedUnitsBetween(period, start, end);
  } else if ((rental.returns ?? []).length === 0) {
    // Partiyasiz yopilgan eski yozuv: butun miqdor `returnedDate` gacha.
    itemUnits += totalQuantity(rental) * billedUnitsBetween(period, start, end);
  }

  return roundMoney(price * itemUnits);
};

/**
 * Mijozning shu ijara bo'yicha qarzi: yig'ilgan − to'langan.
 *
 * Manfiy qiymat KESILMAYDI: oldindan ko'proq to'lab qo'ygan bo'lsa bu
 * haqiqat va ekranda "ortiqcha to'lov" bo'lib ko'rinishi kerak.
 */
export const unpaidAmount = (rental: RentalResponseDTO, now = nowString()): number =>
  roundMoney(accruedAmount(rental, now) - toAmount(rental.paidAmount));

/**
 * Hisob bosqichi: buyum QAYERDA — mijozdami, kechikkanmi, qaytganmi.
 *
 * NASIYA (DEBT) bosqichi OLIB TASHLANDI. U "buyum qaytgan, lekin puli
 * olinmagan" degani edi va `paidAmount` ga tayanardi — ilovada esa
 * ijara to'lovi yozadigan yo'l qolmagan (`usePayRental` hech qayerda
 * chaqirilmaydi). Natijada `paidAmount` doim 0 bo'lib qolar va har
 * qaytgan ijara "Nasiya" bo'lib yopishib olardi, pul Qarzlar daftarida
 * allaqachon to'langan bo'lsa ham.
 *
 * Pulning yagona joyi — QARZLAR bo'limi. Ijara buyum va muddatni
 * kuzatadi.
 */
export const rentalStage = (rental: RentalResponseDTO, now = nowString()): RentalStage => {
  const status = rentalStatus(rental, now);
  return status === 'RETURNED' ? 'CLOSED' : status;
};

// ---------------------------------------------------------------- muddat

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

/**
 * Davrga qarab muddat: kunlikda sana, soatlikda sana va soat.
 *
 * Soatlik hisob UTC tartib raqamida bajariladi va yana o'sha raqamdan
 * o'qiladi — bu yerda timestamp lokal mintaqaga aylanmaydi, demak yozgi
 * vaqtga o'tish soati ham bir soatni yeb qo'ymaydi. Yarim tundan o'tsa
 * sana o'zi keyingi kunga suriladi.
 */
export const dueFrom = (
  period: RentalPeriod,
  startDate: string,
  startTime: string | null | undefined,
  duration: number,
): { date: string; time: string | null } | null => {
  if (!Number.isFinite(duration) || duration < 1) return null;
  if (period === 'DAY') {
    const date = dueDateFrom(startDate, duration);
    return date ? { date, time: null } : null;
  }
  if (!isValidDateInput(startDate) || !isValidTimeInput(startTime)) return null;
  const start = minuteNumber(joinMoment(startDate, startTime));
  if (start === null) return null;
  const due = new Date((start + Math.floor(duration) * HOUR_MINUTES) * MINUTE_MS);
  return {
    date: `${due.getUTCFullYear()}-${pad2(due.getUTCMonth() + 1)}-${pad2(due.getUTCDate())}`,
    time: `${pad2(due.getUTCHours())}:${pad2(due.getUTCMinutes())}`,
  };
};

/** Teskari amal — tahrirlash formasida kun maydonini to'ldirish uchun. */
export const daysFromDueDate = (startDate: string, dueDate: string): number | null => {
  const diff = daysBetween(startDate, dueDate);
  if (diff === null || diff < 1) return null;
  return diff;
};

/** Ijaraning kelishilgan muddati (kun yoki soat) — tahrirlash formasi uchun. */
export const durationOf = (rental: RentalResponseDTO): number | null => {
  // Kelishilmagan muddatda ko'rsatadigan son yo'q.
  if (isOpenEnded(rental)) return null;
  if (!isHourly(rental)) return daysFromDueDate(rental.startDate, rental.dueDate);
  const minutes = minutesBetween(startMoment(rental), dueMoment(rental));
  if (minutes === null || minutes < HOUR_MINUTES) return null;
  return Math.round(minutes / HOUR_MINUTES);
};
