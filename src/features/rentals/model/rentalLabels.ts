import type { TranslateFn } from '../../../shared/lib/date';
import { formatQuantity } from '../../../shared/lib/quantity';
import { normalizeProductUnit, type ProductUnit } from '../../products/types/product';
import type { RentalPeriod } from '../types/rental';

/**
 * Ijara ekranlaridagi takrorlanadigan matnlar BIR joyda: "3 kun" /
 * "3 soat", "kuniga" / "soatiga", "50 m²". Har ekran o'zi yig'sa, bir
 * joyda "kun" ikkinchisida "kunlik" bo'lib ketishi oson edi.
 */

/** "3 kun" yoki "3 soat". */
export const unitCountLabel = (t: TranslateFn, period: RentalPeriod, count: number): string =>
  t(period === 'HOUR' ? 'rentals.hourCount' : 'rentals.dayCount', { count: String(count) });

/** "kuniga" yoki "soatiga" — narx yonida. */
export const perPeriodLabel = (t: TranslateFn, period: RentalPeriod): string =>
  t(period === 'HOUR' ? 'rentals.perHour' : 'rentals.perDay');

/** "Kunlik" yoki "Soatlik" — tanlagich va belgi uchun. */
export const periodLabel = (t: TranslateFn, period: RentalPeriod): string =>
  t(period === 'HOUR' ? 'rentals.periodHour' : 'rentals.periodDay');

/** O'lchov birligi: "dona", "m²". Yo'q bo'lsa dona. */
export const unitLabel = (t: TranslateFn, unit?: ProductUnit | null): string =>
  t(`products.unit.${normalizeProductUnit(unit)}`);

/** "50 m²", "12 dona". */
export const quantityLabel = (
  t: TranslateFn,
  quantity: number,
  unit?: ProductUnit | null,
): string => `${formatQuantity(quantity)} ${unitLabel(t, unit)}`;

/** "3 kun kechikdi" yoki "2 soat kechikdi". */
export const lateLabel = (t: TranslateFn, period: RentalPeriod, count: number): string =>
  t(period === 'HOUR' ? 'rentals.lateByHours' : 'rentals.lateByDays', { count: String(count) });

/**
 * "5 kundan oshdi" yoki "7 soatdan oshdi" — MUDDATSIZ ijara uchun.
 *
 * `lateLabel` dan farqi bor va u ataylab: muddatsiz ijarada kelishilgan
 * sana yo'q, demak "kechikdi" deb bo'lmaydi. Lekin buyum odamda turgan
 * vaqt baribir ko'rinishi kerak — aks holda u oylab yotib, hech qayerda
 * belgi chiqmasdi.
 */
export const elapsedLabel = (t: TranslateFn, period: RentalPeriod, count: number): string =>
  t(period === 'HOUR' ? 'rentals.elapsedHours' : 'rentals.elapsedDays', { count: String(count) });
