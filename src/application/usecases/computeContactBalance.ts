import { MoneyResponseDTO, PartyType } from '../../types/money';

// ============================================================
//  Domain use-case: tranzaksiya tarixidan kontakt balansini hisoblash.
//  Avval DebtListScreen ichida (UI bilan aralashgan) edi — endi sof funksiya:
//  test qilinadigan, qayta ishlatiladigan, UI'ga bog'liq emas.
// ============================================================

export interface Actor {
  type: PartyType;
  id: string;
}

export interface MoneyTotals {
  totalDebt: number;
  totalCredit: number;
  balance: number;
}

export function computeTotalsFromHistory(
  history: MoneyResponseDTO[],
  actor: Actor,
  counterpartyId: string,
  counterpartyType: PartyType
): MoneyTotals {
  let totalDebt = 0;
  let totalCredit = 0;

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

    if (isCreditor) totalCredit += item.amount;
    if (isDebtor) totalDebt += item.amount;
  }

  return { totalDebt, totalCredit, balance: totalCredit - totalDebt };
}
