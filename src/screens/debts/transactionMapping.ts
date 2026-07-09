import { MoneyResponseDTO, PartyType } from '../../types/money';
import { translate } from '../../i18n';

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

export function formatDateShort(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

export function formatDateLong(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString();
}
