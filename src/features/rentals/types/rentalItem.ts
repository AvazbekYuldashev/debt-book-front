import { Currency } from '../../../shared/types/money';
import type { ProductUnit } from '../../products/types/product';
import type { RentalPeriod } from './rental';

/**
 * Ijara OMBORI: ijarachining qo'lidagi buyumlar ro'yxati.
 *
 * Opalubka, lesa, arava, beton aralashtirgich; to'y uchun stul, stol,
 * chodir, idish — har biri bir qator: nechtasi BOR va bir kun (yoki
 * bir soat) qanchadan beriladi.
 *
 * BAND va BO'SH soni saqlanmaydi — server ochiq ijaralardan hisoblaydi:
 * buyum berilganda band bo'ladi, qaytganda o'zi bo'shaydi. Saqlanganda
 * qo'lda tuzatishga to'g'ri kelardi va ertami-kechmi haqiqatdan ajralib
 * qolardi.
 */
export interface RentalItemResponseDTO {
  id: string;
  /** Biznes hisobida — biznes id'si; shaxsiy hisobda null. */
  businessId?: string | null;
  name: string;
  /**
   * Guruh: "Opalubka", "Lesa", "To'y jihozlari". Ixtiyoriy — ro'yxat
   * uzayganda buyumni tez topish uchun.
   */
  category?: string | null;
  /** Narx kunlikmi yoki soatlik. */
  period: RentalPeriod;
  /** BITTA buyumning BIR DAVRLIK narxi. */
  price: number;
  currency?: Currency;
  /** O'lchov birligi: dona, m², metr. */
  unit?: ProductUnit | null;
  /** Ombordagi jami soni — ham bo'sh, ham mijozdagilar. */
  totalQuantity: number;
  /** Server hisoblagan: hozir mijozlarda turgani. */
  busyQuantity: number;
  note?: string | null;
  createdDate?: string;
}

export interface RentalItemCreateDTO {
  name: string;
  category?: string;
  period: RentalPeriod;
  price: number;
  currency: Currency;
  unit?: ProductUnit;
  totalQuantity: number;
  note?: string;
}

export interface RentalItemUpdateDTO extends RentalItemCreateDTO {
  id: string;
}
