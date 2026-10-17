import type { MoneyActionType } from '../../../shared/types/money';

interface RentalRowsInput {
  /** Oyna qaysi yo'nalishda ochilgan: "Oldim" yoki "Berdim". */
  actionType: MoneyActionType;
  /** Hisob biznesmi — ya'ni mening omborim bormi. */
  business: boolean;
  /** Qarshi tomon biznes va ombor UNIKI — undan olish mumkin. */
  canRentIn: boolean;
}

interface RentalRows {
  rentIn: boolean;
  rentOut: boolean;
}

/**
 * Pul oynasida IJARA qatori ko'rinadimi.
 *
 * YO'NALISH QAT'IY. Ijaraga olsam puli menga QARZ bo'ladi — bu
 * "Oldim"; ijaraga bersam puli menga HAQ bo'ladi — bu "Berdim".
 * Ilgari ikkala qator ikkala oynada ham chiqardi va summani teskari
 * tomonga yozib qo'yish hech gap emas edi.
 *
 * Qaysi biri BO'LISHI esa hisobga bog'liq: shaxsiyda ombor yo'q —
 * faqat olish; biznesda ombor bor — berish.
 */
export const rentalRowsFor = ({ actionType, business, canRentIn }: RentalRowsInput): RentalRows => ({
  rentIn: canRentIn && !business && actionType === 'TAKE',
  rentOut: business && actionType === 'GIVE',
});
