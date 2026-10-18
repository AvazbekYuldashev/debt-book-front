import { Currency } from '../../../shared/types/money';
import type { ProductUnit } from '../../products/types/product';

/**
 * Ijara: buyum OMBORDAN beriladi, kelishilgan muddat o'tadi, puli olinadi.
 *
 * Qarzdan farqi — summa VAQT bilan o'sadi. Shuning uchun yozuvda summa
 * emas, BIR DAVR (kun yoki soat) NARXI saqlanadi: hisob har ko'rishda
 * qaytadan chiqariladi (`model/rentalMath.ts`). Server ham AYNAN shu
 * qoida bo'yicha hisoblaydi, aks holda telefondagi raqam bilan serverdagi
 * raqam farq qilardi.
 *
 * Pul buyum qaytganda olinadi, ya'ni ijara yopilmaguncha mijozda QARZ
 * bo'lib turadi. Buyumning qaytishi va pulning kelishi ALOHIDA voqea:
 * buyum qaytib, puli keyin ham to'lanishi mumkin — shunday yozuv
 * "NASIYA" bo'lib qoladi.
 */

/**
 * Narx qaysi davr uchun: kunlik (lesa, opalubka, to'y stullari) yoki
 * soatlik (ba'zi asbob, texnika).
 *
 * Eski yozuvlarda maydon yo'q — ular hammasi kunlik edi.
 */
export type RentalPeriod = 'DAY' | 'HOUR';

export const RENTAL_PERIODS: readonly RentalPeriod[] = ['DAY', 'HOUR'];

export const normalizeRentalPeriod = (value: unknown): RentalPeriod =>
  value === 'HOUR' ? 'HOUR' : 'DAY';

/**
 * Buyumning holati — sanalardan chiqariladi, SAQLANMAYDI.
 *
 * ACTIVE   — buyum mijozda, muddat hali o'tmagan.
 * OVERDUE  — buyum mijozda, muddat o'tib ketgan (hisob o'sib boradi).
 * RETURNED — hamma buyum qaytdi, hisob to'xtadi (puli qolgan bo'lishi mumkin).
 *
 * Saqlanganda "bugun" o'zgarishi bilan yozuv yolg'on holatda qolib ketardi:
 * kecha ACTIVE yozilgani bugun ham ACTIVE turardi.
 */
export type RentalStatus = 'ACTIVE' | 'OVERDUE' | 'RETURNED';

/**
 * Ijaraning HISOB bosqichi — holat + pul birgalikda.
 *
 * RETURNED ikkiga bo'linadi, chunki ijarachi uchun ular butunlay boshqa
 * narsa: buyum qaytib puli ham olingan bo'lsa ish tugagan (CLOSED), puli
 * olinmagan bo'lsa bu NASIYA (DEBT) — uni alohida ro'yxatda kuzatadi.
 */
/**
 * Buyum QAYERDA: mijozda, kechikkan yoki qaytgan.
 *
 * `DEBT` (nasiya) olib tashlandi — izohi `rentalMath.rentalStage` da.
 * Pul bosqichga ta'sir qilmaydi, u Qarzlar daftarida yuradi.
 */
export type RentalStage = 'ACTIVE' | 'OVERDUE' | 'CLOSED';

/**
 * Ro'yxat filtridagi holat.
 *
 * OUT    — buyum mijozda (ACTIVE + OVERDUE).
 * DEBT   — buyum qaytgan, puli to'liq olinmagan (nasiya).
 * CLOSED — buyum qaytgan va puli olingan.
 * ACTIVE / RETURNED — eski ilova versiyalari uchun saqlanib qolgan.
 */
export type RentalFilterStatus = 'OUT' | 'OVERDUE' | 'DEBT' | 'CLOSED' | 'ACTIVE' | 'RETURNED';

/**
 * Bitta qaytarish partiyasi: NECHTA buyum QAYSI kuni (soatlikda — soati
 * bilan) qaytdi.
 *
 * Alohida ro'yxat bo'lgani sababi: 10 stuldan 3 tasi uchinchi kuni,
 * qolgan 7 tasi o'ninchi kuni qaytishi mumkin va har partiya o'z
 * kunigacha hisoblanadi. Bitta sana bilan buni ifodalab bo'lmaydi.
 */
export interface RentalReturnItemDTO {
  id?: string;
  quantity: number | string;
  /** YYYY-MM-DD. */
  returnedDate: string;
  /** HH:mm — faqat soatlik ijarada. */
  returnedTime?: string | null;
}

/** Ro'yxat filtri. Bo'sh yuborilsa hammasi qaytadi. */
export interface RentalFilterDTO {
  clientId?: string;
  /** Ombordagi bitta buyum — "bu buyum kimlarda" degan ro'yxat uchun. */
  rentalItemId?: string;
  status?: RentalFilterStatus;
  /** Buyum nomi yoki mijoz ismi bo'yicha qidiruv. */
  search?: string;
}

/**
 * Tasdiq holati.
 *
 * Yozuvni ikki tomon ham yaratadi: ombor egasi va mijoz. Egasi yozsa
 * darhol CONFIRMED, mijoz yozsa WAITING bo'lib egasini kutadi.
 *
 * WAITING yozuv ombordan HECH NARSA band qilmaydi — aks holda begona
 * odam ijarachining omborini qog'ozda band qilib qo'ya olardi.
 */
export type RentalApproval = 'WAITING' | 'CONFIRMED';

/** Eski server bu maydonni yubormaydi — u holda yozuv tasdiqlangan. */
export const normalizeApproval = (value?: RentalApproval | null): RentalApproval =>
  value === 'WAITING' ? 'WAITING' : 'CONFIRMED';

export interface RentalResponseDTO {
  id: string;
  /** Mijoz — qarz daftaridagi kontakt (`ClientDTO.id`). */
  clientId: string;
  clientName: string;
  clientPhone?: string | null;
  /** Ombordagi buyum. Ombor joriy qilinishidan oldingi yozuvlarda null. */
  rentalItemId?: string | null;
  /** Eski: narxnomadan tanlangan mahsulot. Yangi yozuvlar omborga bog'lanadi. */
  productId?: string | null;
  /** Buyum nomi NUSXA qilib saqlanadi: ombordagi nom keyin o'zgarsa ham yozuv o'z nomini saqlaydi. */
  itemName: string;
  /** Nechta buyum berildi (10 stol, 50 stul, 120 m² opalubka). Berilmasa 1. */
  quantity: number;
  unit?: ProductUnit | null;
  /** Narx davri. Normallashtirilgandan keyin doim bor. */
  period?: RentalPeriod;
  /** BITTA buyumning BIR DAVRLIK (kun yoki soat) narxi. Umumiy summa shundan hisoblanadi. */
  price: number;
  /** Eski maydon: server o'tish davrida `price` bilan birga yuboradi. */
  dailyPrice?: number | string | null;
  currency?: Currency;
  /** Buyum berilgan kun — YYYY-MM-DD. */
  startDate: string;
  /** Berilgan soat — HH:mm, faqat soatlik ijarada. */
  startTime?: string | null;
  /** Qaytarilishi kerak bo'lgan kun — YYYY-MM-DD. */
  dueDate: string;
  /**
   * MUDDAT KELISHILMAGAN: buyum berildi, qaytish sanasi aytilmadi.
   *
   * Bunday yozuvda `dueDate` to'ldirilgan bo'lsa ham u kelishuv emas —
   * kechikish hisoblanmaydi va summa ma'lum bo'lmaguncha ijara qarz
   * balansiga qo'shilmaydi. Lesa yoki opalubka odatda shunday beriladi.
   */
  openEnded?: boolean;
  /**
   * Shu ijara qarz balansiga qo'shiladimi — QOIDANI SERVER aytadi.
   *
   * Ilova ham o'zi hisoblay oladi (`countsInBalance`), lekin server
   * javobi ustun: aks holda ikki joyda ikki xil raqam chiqardi.
   */
  inBalance?: boolean;
  /** Qaytarish soati — HH:mm, faqat soatlik ijarada. */
  dueTime?: string | null;
  /**
   * HAMMA buyum qaytgan kun. null = kamida bittasi hali mijozda.
   *
   * Yopilganlik belgisi: ro'yxat so'rovlari ham shunga tayanadi.
   */
  returnedDate?: string | null;
  returnedTime?: string | null;
  /** Qaytarish partiyalari — summa shular bo'yicha qayta hisoblanadi. */
  returns?: RentalReturnItemDTO[];
  /**
   * MIJOZ YOZGAN, EGASI TASDIQLAMAGAN to'lov. null = yo'q.
   *
   * Hisobga kirmaydi: `paidAmount` o'zgarmaydi va qarz qoldig'i ham
   * kamaymaydi. Tasdiqlangach backend uni `paidAmount` ga qo'shadi.
   */
  pendingPayment?: number | null;
  /** Egasiga: kutayotgan to'lovni tasdiqlash/rad etish tugmalari. */
  canConfirmPayment?: boolean;
  /** Mijozga: "pul berdim" tugmasi chiqadimi. */
  canPay?: boolean;
  /** Mijozga: o'z tasdiqlanmagan so'rovini qaytarib olish mumkinmi. */
  canWithdraw?: boolean;
  /** Tasdiq holati: mijoz yozgan yozuv egasi tasdiqlaguncha WAITING. */
  approval?: RentalApproval | null;
  /** Yozuv MENING daftarimdami (ombor egasimanmi). */
  owner?: boolean;
  /** Men tasdiqlay olamanmi: egasiman va yozuv kutib turibdi. */
  canConfirm?: boolean;
  /** Server hisoblagan: shu paytgacha qaytgan buyumlar soni. */
  returnedQuantity?: number | string | null;
  /** Server hisoblagan: hali mijozda turgan buyumlar soni. */
  remainingQuantity?: number | string | null;
  /** Shu ijara uchun jami olingan pul. */
  paidAmount: number;
  note?: string | null;
  /**
   * Kim bergan — biznesda bir nechta admin bo'lsa "buni kim yozgan"
   * degan savolga javob. Shaxsiy hisobda ko'rsatilmaydi.
   */
  creatorName?: string | null;
  createdDate?: string;
}

/**
 * Bitta ijarani tahrirlash.
 *
 * PUT semantikasi: hamma maydon yuboriladi. Mijoz va ombordagi buyum
 * O'ZGARMAYDI — boshqa odamga yoki boshqa buyumga berilgan narsa uchun
 * yangi ijara ochiladi, aks holda to'lov tarixi begona yozuvda qolardi.
 */
export interface RentalUpdateDTO {
  id: string;
  itemName: string;
  quantity: number;
  period: RentalPeriod;
  price: number;
  currency: Currency;
  startDate: string;
  startTime?: string;
  /**
   * Necha kun (yoki soat); null = muddat kelishilmagan.
   *
   * `dueDate`ni SERVER hisoblaydi — ikkisini ham
   * yuborib bir-biriga mos kelmaydigan juftlik qoldirmaslik uchun.
   */
  duration: number | null;
  note?: string;
}

/** Bitta mijozga bir vaqtda berilgan buyumlardan biri. */
export interface RentalBatchLineDTO {
  rentalItemId: string;
  quantity: number;
  /**
   * Ombordagi narxdan farq qilishi mumkin (chegirma, doimiy mijoz).
   *
   * Berilmasa server OMBORDAGI narxni oladi. Nol YUBORILMASIN: server
   * uni haqiqiy narx deb qabul qiladi va ijara bepul bo'lib qolardi.
   */
  price?: number;
}

/**
 * Bir mijozga bir nechta buyumni BIRDANIGA berish.
 *
 * To'y uchun 200 stul, 20 stol va 1 chodir, qurilishga 150 m² opalubka
 * va 40 ta lesa — hayotda buyurtma shunday keladi. Har birini alohida
 * forma bilan kiritish mijoz, sana va muddatni qayta-qayta yozdirardi.
 *
 * Server buni BITTA tranzaksiyada bajaradi: biror buyum omborda yetmasa
 * hech biri yozilmaydi (yarim berilgan buyurtma qolmasin).
 */
export interface RentalBatchCreateDTO {
  clientId: string;
  period: RentalPeriod;
  startDate: string;
  /** HH:mm — faqat soatlik ijarada. */
  startTime?: string;
  /** Necha kun yoki necha soat (davrga qarab). */
  duration: number | null;
  note?: string;
  lines: RentalBatchLineDTO[];
}

/**
 * Buyum qaytdi — qaytgan QISM uchun hisob shu paytda to'xtaydi va u
 * omborga BO'SH bo'lib qaytadi.
 *
 * Sana berilmasa server bugunni, miqdor berilmasa qolganining hammasini
 * oladi: bitta buyumli ijarada bu savol umuman berilmaydi.
 */
export interface RentalReturnDTO {
  returnedDate?: string;
  /** HH:mm — faqat soatlik ijarada. */
  returnedTime?: string;
  quantity?: number;
}

/** Pul olindi — buyum qaytishidan MUSTAQIL yoziladi. */
export interface RentalPaymentDTO {
  amount: number;
  date?: string;
}

/**
 * Yuqoridagi panel. Valyutalar QO'SHILMAYDI: har biri alohida qator
 * (gap kassadagi kabi — so'm bilan dollarni jamlab bo'lmaydi).
 */
export interface RentalSummaryDTO {
  /** Buyumi mijozda turgan ijaralar soni. */
  activeCount: number;
  /** Muddati o'tganlar soni — ekranda qizil raqam. */
  overdueCount: number;
  /** Mijozlardagi buyumlar SONI (dona/m² aralash bo'lsa ham — taxminiy ko'rsatkich). */
  outQuantity?: number | string | null;
  /** Buyum qaytgan, lekin puli olinmagan ijaralar soni (nasiya). */
  debtCount?: number | null;
  /** Shu paytgacha yig'ilgan ijara haqi, valyuta bo'yicha. */
  accruedByCurrency?: Record<string, number | string>;
  /** Hali olinmagan pul (yig'ilgan − to'langan), valyuta bo'yicha. */
  unpaidByCurrency?: Record<string, number | string>;
  /** Mijozlardagi buyumlardan olinishi kerak bo'lgan pul (ijara davom etmoqda). */
  outUnpaidByCurrency?: Record<string, number | string>;
  /** Nasiya: buyum qaytgan, puli olinmagan. */
  debtByCurrency?: Record<string, number | string>;
}

/** Backend BigDecimal'ni ba'zan satr qilib yuboradi — chegarada normallashtiramiz. */
export const toAmount = (value: number | string | null | undefined): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

/** Mijoz yuboradigan so'rov: qaysi do'kondan, qaysi buyumdan nechta. */
export interface RentalRequestLineDTO {
  rentalItemId: string;
  quantity: number;
}

export interface RentalRequestDTO {
  /** Ijara beruvchi biznes. */
  businessId: string;
  lines: RentalRequestLineDTO[];
  startDate: string;
  /** Soatlik ijarada majburiy. */
  startTime?: string;
  duration: number | null;
  note?: string;
}
