import { MoneyResponseDTO, PartyType } from '../../types/money';
import { CurrencyAmounts, normalizeCurrency } from '../../utils/currency';

// ============================================================
//  Domain use-case: tranzaksiya tarixidan kontakt balansini hisoblash.
//  Ko'p valyutali: har bir valyuta bo'yicha alohida credit/debt yig'iladi.
//  Asosiy valyutaga aylantirish UI qatlamida (kurs bilan) qilinadi.
// ============================================================

export interface Actor {
  type: PartyType;
  id: string;
}

export interface CurrencyTotals {
  credit: CurrencyAmounts;
  debt: CurrencyAmounts;
}

const add = (map: CurrencyAmounts, currency: keyof CurrencyAmounts, amount: number) => {
  map[currency] = (map[currency] ?? 0) + amount;
};

export function computeTotalsFromHistory(
  history: MoneyResponseDTO[],
  actor: Actor,
  counterpartyId: string,
  counterpartyType: PartyType
): CurrencyTotals {
  const credit: CurrencyAmounts = {};
  const debt: CurrencyAmounts = {};

  for (const item of history) {
    let isCreditor = false;
    let isDebtor = false;

    if (actor.type === 'BUSINESS_ACCOUNT') {
      isCreditor =
        (item.creditorType === 'BUSINESS_ACCOUNT' || !!item.creditorBusinessId) &&
        item.creditorBusinessId === actor.id;
      isDebtor =
        (item.debtorType === 'BUSINESS_ACCOUNT' || !!item.debtorBusinessId) &&
        item.debtorBusinessId === actor.id;
    } else {
      isCreditor = (!item.creditorType || item.creditorType === 'PROFILE') && item.creditorId === actor.id;
      isDebtor = (!item.debtorType || item.debtorType === 'PROFILE') && item.debtorId === actor.id;
    }

    // Aktyor tomoni aniqlanmasa, qarama-qarshi tomon (counterparty) bo'yicha aniqlaymiz.
    if (!isCreditor && !isDebtor && counterpartyId) {
      if (counterpartyType === 'BUSINESS_ACCOUNT') {
        if (item.debtorBusinessId === counterpartyId) isCreditor = true;
        if (item.creditorBusinessId === counterpartyId) isDebtor = true;
      } else {
        if (item.debtorId === counterpartyId) isCreditor = true;
        if (item.creditorId === counterpartyId) isDebtor = true;
      }
    }

    const currency = normalizeCurrency(item.currency);
    if (isCreditor) add(credit, currency, item.amount);
    if (isDebtor) add(debt, currency, item.amount);
  }

  return { credit, debt };
}

// Valyuta bo'yicha ajratilgan yig'indi bo'sh (hammasi 0) ekanini tekshiradi.
export function isEmptyTotals(totals: CurrencyTotals): boolean {
  const anyPositive = (map: CurrencyAmounts) => Object.values(map).some((v) => (v ?? 0) !== 0);
  return !anyPositive(totals.credit) && !anyPositive(totals.debt);
}
