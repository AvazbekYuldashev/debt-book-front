import type { CurrencyTotals } from '../../debts/model/computeContactBalance';
import { normalizeCurrency } from '../../../shared/lib/currency';
import type { RentalResponseDTO } from '../types/rental';
import { countsInBalance, nowString, unpaidAmount } from './rentalMath';

/**
 * IJARA QOLDIG'INI QARZ BALANSIGA AYLANTIRISH.
 *
 * Ijara ham qarz: buyum odamda turgan har kun uchun haq yig'iladi va u
 * to'lanmaguncha majburiyat bo'lib qoladi. Shuning uchun mijoz
 * kartasidagi "qancha qarzi bor" degan raqam ijarani ham o'z ichiga
 * olishi kerak — aks holda odam ikki joyga qarab, ikki raqamni qo'shib
 * yurishga majbur bo'ladi.
 *
 * HAMMASI qo'shilmaydi. Qoida (egasi bilan kelishilgan, serverdagi
 * `RentalCalculator.countsInBalance` bilan bir xil):
 *
 *   muddat kelmagan + yakuniy sana kelishilmagan -> yo'q
 *   muddat kelgan (yoki o'tgan)                  -> ha
 *   muddat kelmagan, yakuniy sana kelishilgan    -> ha
 *
 * YO'NALISH yozuv kimning ekaniga qarab: ombor meniki bo'lsa mijoz
 * MENGA qarzdor (`credit`), men birovning do'konidan olgan bo'lsam
 * qarz MENDA (`debt`).
 *
 * TASDIQ KUTAYOTGAN yozuv ham kiradi. Avval chiqarib tashlangandi -
 * "kelishuv emas" degan mantiq bilan. Lekin ro'yxatda o'sha yozuv
 * "Qarz" bo'lib turadi, ya'ni sarlavha o'z ostidagi qatorga qarshi
 * gapirardi. Ikki tomon ham AYNI shu hisobni yuritadi (yozuv ikkalasiga
 * ham ko'rinadi), shuning uchun raqamlar baribir bir xil chiqadi;
 * tasdiqlanmaganini esa "Kutilmoqda" belgisi aytib turadi.
 *
 * To'langan pul chiqarib tashlangan (`unpaidAmount` = yig'ilgan −
 * to'langan), ya'ni "nechta buyumga necha kunning puli to'langan" shu
 * raqamda allaqachon hisobga olingan. Ortiqcha to'lov (manfiy qoldiq)
 * ham o'tadi: u teskari tomonga yozilib, balansda to'g'ri ko'rinadi.
 */
export function rentalTotalsByContact(
  rentals: RentalResponseDTO[],
  now = nowString(),
): Record<string, CurrencyTotals> {
  const result: Record<string, CurrencyTotals> = {};
  // Qoida KUN bo'yicha, hisob esa daqiqagacha — ikkisi bitta paytdan
  // olinadi, aks holda yarim tunda ikki xil javob chiqib qolardi.
  const today = now.slice(0, 10);
  // Ikki yo'nalishdan yig'ilgan ro'yxatda bir yozuv ikki marta uchrashi
  // mumkin — qarz ikki baravar ko'rinib ketmasligi uchun id bo'yicha
  // bir marta hisoblanadi.
  const seen = new Set<string>();

  for (const rental of rentals) {
    const contactId = rental.clientId;
    if (!contactId) continue;
    if (rental.id) {
      if (seen.has(rental.id)) continue;
      seen.add(rental.id);
    }
    if (!countsInBalance(rental, today)) continue;

    const unpaid = unpaidAmount(rental, now);
    if (unpaid === 0) continue;

    const currency = normalizeCurrency(rental.currency);
    const totals = (result[contactId] ??= { credit: {}, debt: {} });
    // Ombor egasi uchun bu olinadigan pul; mijoz tomonida — to'lanadigan.
    // Manfiy qoldiq (ortiqcha to'lov) teskari tomonga tushadi.
    const mine = rental.owner !== false;
    const side = unpaid > 0 === mine ? totals.credit : totals.debt;
    side[currency] = (side[currency] ?? 0) + Math.abs(unpaid);
  }

  return result;
}

/**
 * Pul tarixidan chiqqan balansga ijara qoldig'ini qo'shadi.
 *
 * Yangi obyekt qaytariladi: kirish qiymatlari React Query keshida
 * turadi va ularni joyida o'zgartirish keshni buzardi.
 */
export function mergeRentalTotals(
  base: Record<string, CurrencyTotals>,
  rental: Record<string, CurrencyTotals>,
): Record<string, CurrencyTotals> {
  if (Object.keys(rental).length === 0) return base;

  const merged: Record<string, CurrencyTotals> = {};
  const ids = new Set([...Object.keys(base), ...Object.keys(rental)]);

  for (const id of ids) {
    const money = base[id];
    const extra = rental[id];
    if (!extra) {
      merged[id] = money;
      continue;
    }
    const credit = { ...(money?.credit ?? {}) };
    const debt = { ...(money?.debt ?? {}) };
    for (const [currency, amount] of Object.entries(extra.credit)) {
      credit[currency as keyof typeof credit] =
        (credit[currency as keyof typeof credit] ?? 0) + (amount ?? 0);
    }
    for (const [currency, amount] of Object.entries(extra.debt)) {
      debt[currency as keyof typeof debt] =
        (debt[currency as keyof typeof debt] ?? 0) + (amount ?? 0);
    }
    merged[id] = { credit, debt };
  }

  return merged;
}
