import { translate } from '../../../shared/i18n';
import { parseBackendDate } from '../../../shared/lib/date';
import { toAmount, type RentalResponseDTO } from '../../rentals/types/rental';
import type { MappedTransaction } from './transactionMapping';

/**
 * Ijara to'lovlari mijoz kartasidagi TARIX ro'yxatida ko'rinadi.
 *
 * To'lov pul yozuvi EMAS — u ijara yozuvining ichida yashaydi
 * (`paidAmount` + `payments[]` tarixi) va qarz balansini ijara qoldig'i
 * orqali kamaytiradi. Lekin odam uchun u ODDIY pul voqeasi: "falon kuni
 * shuncha berdim". Tarix sahifasi shu voqeani ko'rsatmasa, odam to'lov
 * yo'qolgan deb o'ylardi — aynan shu savol tug'ilgan edi.
 *
 * Shuning uchun to'lovlar KO'RSATISH uchun tarix qatoriga aylantiriladi:
 * pul yozuvlarining yoniga qo'shilib, sana bo'yicha aralash tartiblanadi.
 * Bular sintetik qatorlar — bosilganda pul kartasi emas, IJARA kartasi
 * ochilishi kerak (`rentalIdOfPaymentRow`).
 */

/** Sintetik qator id'sining boshi — bosishda ijara kartasiga yo'naltiradi. */
export const RENTAL_PAYMENT_ROW_PREFIX = 'rental-pay:';

/** Qator ijara to'lovi bo'lsa — ijara id'si, aks holda null. */
export const rentalIdOfPaymentRow = (rowId: string): string | null => {
  if (!rowId.startsWith(RENTAL_PAYMENT_ROW_PREFIX)) return null;
  const rest = rowId.slice(RENTAL_PAYMENT_ROW_PREFIX.length);
  const cut = rest.indexOf(':');
  return cut === -1 ? rest : rest.slice(0, cut);
};

/**
 * Ijara ro'yxatidan tarix qatorlari.
 *
 * YO'NALISH egalikdan: ombor meniki bo'lsa pul MENGA KELDI — bu
 * "oldim" ko'rinishi (`debt`, qizil); men mijoz bo'lsam pul MENDAN
 * KETDI — "berdim" (`credit`, yashil). Pul yozuvlaridagi rang tili
 * bilan bir xil, aks holda tarix ikki tilda gapirardi.
 */
export function rentalPaymentRows(rentals: RentalResponseDTO[]): MappedTransaction[] {
  const rows: MappedTransaction[] = [];
  const label = translate('rentals.paymentRow');

  for (const rental of rentals) {
    const mine = rental.owner !== false;
    for (const [index, payment] of (rental.payments ?? []).entries()) {
      const amount = toAmount(payment.amount);
      if (amount <= 0) continue;
      rows.push({
        id: `${RENTAL_PAYMENT_ROW_PREFIX}${rental.id}:${payment.id ?? index}`,
        amount,
        currency: rental.currency,
        visible: true,
        // Tartiblash uchun aniq payt; eski yozuvda faqat kun bo'lsa —
        // yarim tun (o'sha kunning boshqa yozuvlaridan pastroq tushadi).
        createdDate: payment.createdDate ?? (payment.paidDate ? `${payment.paidDate}T00:00` : ''),
        kind: mine ? 'debt' : 'credit',
        label,
        description: `${label} — ${rental.itemName}`,
      });
    }
  }
  return rows;
}

/**
 * Pul yozuvlari va sintetik qatorlar BITTA lentada, yangisi tepada.
 *
 * Sana o'qilmasa qator oxiriga tushadi — yo'qolib qolgani yomonroq.
 */
export function mergeHistoryRows(
  money: MappedTransaction[],
  extra: MappedTransaction[],
): MappedTransaction[] {
  if (extra.length === 0) return money;
  const ts = (row: MappedTransaction): number =>
    parseBackendDate(row.createdDate)?.getTime() ?? 0;
  return [...money, ...extra].sort((a, b) => ts(b) - ts(a));
}
