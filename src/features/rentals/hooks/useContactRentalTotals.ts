import { useMemo } from 'react';
import type { CurrencyTotals } from '../../debts/model/computeContactBalance';
import { rentalTotalsByContact } from '../model/rentalBalance';
import { RENTAL_CLIENT_PAGE, useMyRentals, useRentalsWithBusiness } from './useRentals';
import type { RentalResponseDTO } from '../types/rental';

const EMPTY: CurrencyTotals = { credit: {}, debt: {} };
const NO_RENTALS: RentalResponseDTO[] = [];

/**
 * BITTA kontaktga tegishli BARCHA ijara yozuvlari — ikkala yo'nalishda.
 *
 * Balans sarlavhasi ham, Tarix sahifasidagi to'lov qatorlari ham shu
 * ro'yxatdan chiqadi: ikkisi bitta manbadan o'qisa, raqam bilan tarix
 * hech qachon bir-biriga qarshi gapirmaydi.
 *
 * IKKI YO'NALISH birdan bo'lishi mumkin: biznes hisobida men bu
 * do'konga o'z omborimdan beraman va o'zim ham undan olganman.
 * "Men olgan" yozuvlar do'konning daftarida turadi va `/rental/my` da
 * chiqmaydi — ular alohida so'rov bilan keladi.
 *
 * So'rovlar `ClientRentalPane` ishlatadigan hooklarning AYNI O'ZI:
 * React Query kalitlari bir xil, shuning uchun ijara sahifasi ochilganda
 * ikkinchi marta so'ralmaydi — javob keshdan keladi.
 */
export function useContactRentals(
  contactId: string,
  /** MIJOZ rejimi: ombor qarshi tomonniki — faqat `with-business` so'raladi. */
  ownerBusinessId: string | null,
  /** Biznes rejimida qarshi tomon do'koni — men ham undan olgan bo'lishim mumkin. */
  takenFromBusinessId: string | null = null,
): RentalResponseDTO[] {
  const clientMode = Boolean(ownerBusinessId);
  const filter = useMemo(() => ({ clientId: contactId }), [contactId]);

  const ownRentals = useMyRentals(filter, {
    enabled: !clientMode,
    size: RENTAL_CLIENT_PAGE,
  });
  const theirRentals = useRentalsWithBusiness(
    (clientMode ? ownerBusinessId : takenFromBusinessId) ?? '',
    { enabled: clientMode || Boolean(takenFromBusinessId) },
  );

  const ownData = clientMode ? undefined : ownRentals.data;
  const theirData = theirRentals.data;

  return useMemo(() => {
    const rentals: RentalResponseDTO[] = [];
    const seen = new Set<string>();
    const push = (list: RentalResponseDTO[]) => {
      for (const rental of list) {
        // Bir yozuv ikki ro'yxatda uchrashi mumkin — bir marta olinadi.
        if (rental.id && seen.has(rental.id)) continue;
        if (rental.id) seen.add(rental.id);
        rentals.push(rental);
      }
    };
    if (ownData) push(Array.isArray(ownData) ? ownData : ownData.content ?? []);
    if (theirData) push(theirData);
    return rentals.length > 0 ? rentals : NO_RENTALS;
  }, [ownData, theirData]);
}

/**
 * BITTA kontaktning ijara qoldig'i — kartaning balans sarlavhasi uchun.
 *
 * Kontakt kartasidagi "Hozirgi haq / Hozirgi qarz" raqami pul tarixidan
 * (`useMoney`) chiqadi va ijarani umuman ko'rmasdi: odam darhol ostida
 * "Qarz 23 333" deb turgan qatorni ko'rar, tepada esa o'sha pul yo'q
 * edi. Ro'yxatdagi balans (`useContactBalances`) allaqachon ijarani
 * qo'shardi — ya'ni bitta mijozning raqami ikki ekranda ikki xil
 * chiqardi.
 */
export function useContactRentalTotals(
  contactId: string,
  ownerBusinessId: string | null,
  takenFromBusinessId: string | null = null,
): CurrencyTotals {
  const rentals = useContactRentals(contactId, ownerBusinessId, takenFromBusinessId);

  return useMemo(() => {
    if (rentals.length === 0) return EMPTY;
    return rentalTotalsByContact(rentals)[contactId] ?? EMPTY;
  }, [rentals, contactId]);
}
