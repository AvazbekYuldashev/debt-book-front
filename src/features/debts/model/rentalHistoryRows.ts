import { translate } from '../../../shared/i18n';
import { parseBackendDate } from '../../../shared/lib/date';
import { formatQuantity } from '../../../shared/lib/quantity';
import {
  accruedAmount,
  countsInBalance,
  nowString,
} from '../../rentals/model/rentalMath';
import { toAmount, type RentalResponseDTO } from '../../rentals/types/rental';
import type { MappedTransaction } from './transactionMapping';

/**
 * Ijara mijoz kartasidagi TARIX ro'yxatida ko'rinadi.
 *
 * Qoida: TARIX BALANSNI TUSHUNTIRISHI SHART. Sarlavhadagi raqam pul
 * yozuvlari + ijara qoldig'idan yig'iladi, demak ijara ham tarixda
 * qator bo'lib turishi kerak — aks holda odam qatorlarni qo'shib
 * chiqib, sarlavhadagi boshqa raqamni ko'radi (aynan shu savol
 * tug'ilgan edi: "tarixdagi yozuvlar bilan umumiy bir xil emas-ku").
 *
 * Har ijara IKKI qator beradi:
 *   HAQ    — yig'ilgan summa (vaqt bilan o'sadi, balansdagi kabi);
 *   TO'LOV — har to'lov alohida, teskari yo'nalishda.
 * Ikkisining farqi = qoldiq = ijaraning balansga qo'shgan hissasi.
 *
 * Ayniqsa muhim: QAYTARILGAN, lekin puli to'lanmagan ijara Ijara
 * sahifasidan tushib qoladi ("hozir nima turibdi" degan savolga javob
 * emas), balansda esa qoladi. Tarixsiz u ko'rinmas qarzga aylanardi.
 *
 * Bular sintetik qatorlar — bosilganda pul kartasi emas, IJARA kartasi
 * ochilishi kerak (`rentalIdOfRow`).
 */

const ACCRUAL_PREFIX = 'rental:';
const PAYMENT_PREFIX = 'rental-pay:';

/** Qator ijaraga tegishli bo'lsa — ijara id'si, aks holda null. */
export const rentalIdOfRow = (rowId: string): string | null => {
  const prefix = rowId.startsWith(PAYMENT_PREFIX)
    ? PAYMENT_PREFIX
    : rowId.startsWith(ACCRUAL_PREFIX)
      ? ACCRUAL_PREFIX
      : null;
  if (!prefix) return null;
  const rest = rowId.slice(prefix.length);
  const cut = rest.indexOf(':');
  return cut === -1 ? rest : rest.slice(0, cut);
};

/** "Lesa × 2" — miqdor bitta bo'lsa shunchaki nomi. */
const itemLabel = (rental: RentalResponseDTO): string => {
  const quantity = toAmount(rental.quantity);
  return quantity > 1 ? `${rental.itemName} × ${formatQuantity(quantity)}` : rental.itemName;
};

/**
 * Ijara ro'yxatidan tarix qatorlari.
 *
 * YO'NALISH egalikdan: ombor meniki bo'lsa haq MENGA tegishli
 * (`credit`, yashil) va to'lov MENGA keladi (`debt`, qizil); mijoz
 * tomonida esa teskari. Pul yozuvlaridagi rang tili bilan bir xil,
 * aks holda tarix ikki tilda gapirardi.
 *
 * Balansga KIRMAYDIGAN ijara (muddatsiz va hali boshlanmagan) tarixda
 * ham chiqmaydi — u hali majburiyat emas va ikkala ro'yxat bitta
 * qoidaga bo'ysunishi kerak.
 */
export function rentalHistoryRows(
  rentals: RentalResponseDTO[],
  now = nowString(),
): MappedTransaction[] {
  const rows: MappedTransaction[] = [];
  const accrualLabel = translate('rentals.accrualRow');
  const paymentLabel = translate('rentals.paymentRow');
  const today = now.slice(0, 10);
  // Bir yozuv ikki yo'nalishdan kelishi mumkin — id bo'yicha bir marta.
  const seen = new Set<string>();

  for (const rental of rentals) {
    if (rental.id) {
      if (seen.has(rental.id)) continue;
      seen.add(rental.id);
    }
    if (!countsInBalance(rental, today)) continue;

    const mine = rental.owner !== false;
    const what = itemLabel(rental);

    const accrued = accruedAmount(rental, now);
    if (accrued > 0) {
      rows.push({
        id: `${ACCRUAL_PREFIX}${rental.id}`,
        amount: accrued,
        currency: rental.currency,
        visible: true,
        createdDate: rental.createdDate ?? `${rental.startDate}T00:00`,
        kind: mine ? 'credit' : 'debt',
        label: accrualLabel,
        description: `${accrualLabel} — ${what}`,
      });
    }

    for (const [index, payment] of (rental.payments ?? []).entries()) {
      const amount = toAmount(payment.amount);
      if (amount <= 0) continue;
      rows.push({
        id: `${PAYMENT_PREFIX}${rental.id}:${payment.id ?? index}`,
        amount,
        currency: rental.currency,
        visible: true,
        // Tartiblash uchun aniq payt; eski yozuvda faqat kun bo'lsa —
        // yarim tun (o'sha kunning boshqa yozuvlaridan pastroq tushadi).
        createdDate: payment.createdDate ?? (payment.paidDate ? `${payment.paidDate}T00:00` : ''),
        kind: mine ? 'debt' : 'credit',
        label: paymentLabel,
        description: `${paymentLabel} — ${what}`,
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
