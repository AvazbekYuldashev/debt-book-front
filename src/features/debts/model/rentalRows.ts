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
 * Qaysi biri BO'LISHI esa OMBORGA qarab: berish uchun ombor menda
 * bo'lishi kerak (ombor biznesning bo'limi), olish uchun esa qarshi
 * tomonda bo'lishi kerak (`canRentIn` shuni aytadi).
 *
 * Hisob turi OLISHGA to'siq emas: biznes ham boshqa do'kondan lesa
 * ijaraga olib, buni daftariga yozishi kerak. Bir vaqtda ikkala qator
 * chiqmaydi — ular turli yo'nalishdagi oynalarda.
 */
export const rentalRowsFor = ({ actionType, business, canRentIn }: RentalRowsInput): RentalRows => ({
  rentIn: canRentIn && actionType === 'TAKE',
  rentOut: business && actionType === 'GIVE',
});
