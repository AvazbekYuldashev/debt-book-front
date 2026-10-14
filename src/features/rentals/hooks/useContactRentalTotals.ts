import { useMemo } from 'react';
import type { CurrencyTotals } from '../../debts/model/computeContactBalance';
import { rentalTotalsByContact } from '../model/rentalBalance';
import { useMyRentals, useRentalsWithBusiness } from './useRentals';

const EMPTY: CurrencyTotals = { credit: {}, debt: {} };

/**
 * BITTA kontaktning ijara qoldig'i — kartaning balans sarlavhasi uchun.
 *
 * Kontakt kartasidagi "Hozirgi haq / Hozirgi qarz" raqami pul tarixidan
 * (`useMoney`) chiqadi va ijarani umuman ko'rmasdi: odam darhol ostida
 * "Qarz 23 333" deb turgan qatorni ko'rar, tepada esa o'sha pul yo'q
 * edi. Ro'yxatdagi balans (`useContactBalances`) allaqachon ijarani
 * qo'shardi — ya'ni bitta mijozning raqami ikki ekranda ikki xil
 * chiqardi.
 *
 * So'rov `ClientRentalPane` ishlatadigan hooklarning AYNI O'ZI:
 * React Query kalitlari bir xil, shuning uchun ijara sahifasi ochilganda
 * ikkinchi marta so'ralmaydi — javob keshdan keladi.
 */
export function useContactRentalTotals(
  contactId: string,
  /** Qarshi tomon biznes bo'lsa uning id'si — ombor o'shaniki. */
  ownerBusinessId: string | null,
): CurrencyTotals {
  const clientMode = Boolean(ownerBusinessId);
  const filter = useMemo(() => ({ clientId: contactId }), [contactId]);

  const ownRentals = useMyRentals(filter, { enabled: !clientMode });
  const theirRentals = useRentalsWithBusiness(ownerBusinessId ?? '', { enabled: clientMode });

  const data = clientMode ? theirRentals.data : ownRentals.data;

  return useMemo(() => {
    if (!data) return EMPTY;
    // Mijoz rejimida endpoint massiv, egasinikida sahifa qaytaradi.
    const rentals = Array.isArray(data) ? data : data.content ?? [];
    return rentalTotalsByContact(rentals)[contactId] ?? EMPTY;
  }, [data, contactId]);
}
