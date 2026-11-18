import { MoneyResponseDTO, PartyType } from '../../../shared/types/money';
import type { Contact } from '../context/ContactsContext';
import { translate } from '../../../shared/i18n';
import { formatBackendDateTime } from '../../../shared/lib/date';

// Tranzaksiyaning joriy hisob nuqtai nazaridan turi: haq bergan (credit) yoki qarz olgan (debt).
export type TransactionKind = 'credit' | 'debt';

export interface MappedTransaction extends MoneyResponseDTO {
  kind: TransactionKind;
  label: string;
}

interface Owner {
  partyType: PartyType;
  partyId: string;
}

interface Counterparty {
  id: string;
  partyType: PartyType;
}

/**
 * Bitta tranzaksiyani joriy hisob (owner) nuqtai nazaridan `credit`/`debt` ga ajratadi.
 * Owner tomoni aniqlanmasa, qarama-qarshi tomon (counterparty) bo'yicha aniqlaydi.
 */
export function mapTransaction(
  item: MoneyResponseDTO,
  owner: Owner,
  counterparty?: Counterparty,
): MappedTransaction {
  let isCredit = false;
  let isDebt = false;

  if (owner.partyType === 'BUSINESS_ACCOUNT') {
    isCredit =
      (item.creditorType === 'BUSINESS_ACCOUNT' || !!item.creditorBusinessId) &&
      item.creditorBusinessId === owner.partyId;
    isDebt =
      (item.debtorType === 'BUSINESS_ACCOUNT' || !!item.debtorBusinessId) &&
      item.debtorBusinessId === owner.partyId;
  } else {
    isCredit = (!item.creditorType || item.creditorType === 'PROFILE') && item.creditorId === owner.partyId;
    isDebt = (!item.debtorType || item.debtorType === 'PROFILE') && item.debtorId === owner.partyId;
  }

  if (!isCredit && !isDebt && counterparty?.id) {
    if (counterparty.partyType === 'BUSINESS_ACCOUNT') {
      if (item.debtorBusinessId === counterparty.id) isCredit = true;
      if (item.creditorBusinessId === counterparty.id) isDebt = true;
    } else {
      if (item.debtorId === counterparty.id) isCredit = true;
      if (item.creditorId === counterparty.id) isDebt = true;
    }
  }

  const kind: TransactionKind = isCredit ? 'credit' : 'debt';
  return {
    ...item,
    kind,
    label: kind === 'credit' ? translate('contact.creditGiven') : translate('contact.debtTaken'),
  };
}

// Locale'ga bog'liq emas — barcha qurilmalarda bir xil ko'rinadi (sana bug'i:
// bir telefonda "7-noyabr", boshqasida "11/07" chiqayotgan edi).
export function formatDateShort(value: string): string {
  return formatBackendDateTime(value);
}

export function formatDateLong(value: string): string {
  return formatBackendDateTime(value);
}

/** Tranzaksiyaning bir tomoni shu kontaktmi. */
const sideIsContact = (
  item: MoneyResponseDTO,
  contact: Contact,
  side: 'creditor' | 'debtor',
): boolean => {
  if (!contact.partyId) return false;
  if (contact.partyType === 'BUSINESS_ACCOUNT') {
    return item[`${side}BusinessId`] === contact.partyId;
  }
  // Eski yozuvlarda `type` yo'q — u holda tomon shaxsiy deb olinadi
  // (biznes tomonlar doim `businessId` bilan yoziladi).
  const type = item[`${side}Type`];
  return (!type || type === 'PROFILE') && item[`${side}Id`] === contact.partyId;
};

/**
 * Oldi-berdi QAYSI kontakt kartasida yotibdi.
 *
 * Bildirishnoma bosilganda kerak. Xabarning o'zidan buni bilib
 * bo'lmaydi: unda faqat `actorPhone` bor va u DOIM odamning shaxsiy
 * raqami — odam biznes nomidan ish ko'rgan bo'lsa ham. Yozuv esa
 * biznes kontaktida yotadi, biznesning telefoni esa yo'q.
 *
 * Shuning uchun raqam bo'yicha qidirish ikki xil xato berardi:
 * kontakt umuman topilmas, yoki o'sha odam alohida shaxsiy kontakt
 * sifatida ham saqlangan bo'lsa — NOTO'G'RI karta ochilardi, ya'ni
 * odam yozuvi yo'q daftarga tushardi.
 *
 * Tomonlar bo'yicha solishtirish buni aniq hal qiladi: yozuvning
 * o'zida ikkala tomonning kimligi yozilgan.
 */
export function contactForTransaction(
  item: MoneyResponseDTO,
  contacts: Contact[],
): Contact | undefined {
  return contacts.find(
    (contact) => sideIsContact(item, contact, 'creditor') || sideIsContact(item, contact, 'debtor'),
  );
}
