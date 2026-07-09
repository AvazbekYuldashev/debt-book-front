import { useContext, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AuthContext } from '../context/AuthContext';
import { useAccountContext } from './useAccountContext';
import type { Contact } from '../context/ContactsContext';
import { getMoneyHistory, getTotalPriceByPartyId } from '../services/moneyService';
import {
  Actor,
  computeTotalsFromHistory,
  CurrencyTotals,
  isEmptyTotals,
} from '../application/usecases/computeContactBalance';
import { extractCurrencyTotals } from '../utils/money';
import { AccountType, MoneyPriceDTO, MoneyResponseDTO, PartyType } from '../types/money';

// Har kontaktning valyuta bo'yicha credit/debt yig'indisi va oxirgi amal vaqti.
export interface ContactBalances {
  totalsByContact: Record<string, CurrencyTotals>;
  latestDateByContact: Record<string, number>;
}

// Bir vaqtda ko'pi bilan shuncha kontakt paralel yuklanadi (backendni bosmaslik uchun).
const MAX_CONCURRENCY = 5;
// Bitta kontaktning tarixi uchun sahifalash chegarasi (cheksiz siklga qarshi himoya).
const MAX_HISTORY_PAGES = 20;
const HISTORY_PAGE_SIZE = 100;

// Har render'da bir xil bo'sh havola qaytarish — keraksiz re-render/effekt qo'zg'atmaslik uchun.
const EMPTY_TOTALS: ContactBalances['totalsByContact'] = {};
const EMPTY_DATES: ContactBalances['latestDateByContact'] = {};

const maxCreatedDate = (items: MoneyResponseDTO[]): number => {
  let max = 0;
  for (const item of items) {
    const ts = new Date(item.createdDate).getTime();
    if (!Number.isNaN(ts) && ts > max) max = ts;
  }
  return max;
};

// Bir kontaktning butun tarixini sahifalab yuklaydi. accountType bilan so'rovda backend
// faqat bir tomonni ko'rsatishi mumkin — shuning uchun accountType'siz ham so'rab, merge qilamiz.
async function loadAllHistory(
  id: string,
  partyType: PartyType,
  token: string,
  accountType: AccountType | undefined,
): Promise<MoneyResponseDTO[]> {
  const fetchPages = async (overrideAccountType: AccountType | undefined): Promise<MoneyResponseDTO[]> => {
    const items: MoneyResponseDTO[] = [];
    let page = 0;
    let safety = 0;
    while (safety < MAX_HISTORY_PAGES) {
      const historyPage = await getMoneyHistory({
        id,
        partyType,
        page,
        size: HISTORY_PAGE_SIZE,
        token,
        accountType: overrideAccountType,
      });
      items.push(...(historyPage.content ?? []));
      if (historyPage.last || page >= historyPage.totalPages - 1) break;
      page += 1;
      safety += 1;
    }
    return items;
  };

  const primary = await fetchPages(accountType);

  if (accountType) {
    try {
      const reverse = await fetchPages(undefined);
      if (reverse.length > 0) {
        const seen = new Set(primary.map((item) => item.id));
        const extra = reverse.filter((item) => !seen.has(item.id));
        if (extra.length > 0) return [...primary, ...extra];
      }
    } catch {
      // Teskari yo'nalish ixtiyoriy — xatosini yutamiz, asosiy natija yetarli.
    }
  }

  return primary;
}

// Bitta kontaktning balansini aniqlaydi: avval tezkor "narx" endpointi, u bo'sh bo'lsa
// tarixdan hisoblash (ikki turli party bo'yicha fallback bilan).
async function resolveContactBalance(
  contact: Contact,
  token: string,
  accountType: AccountType | undefined,
  actor: Actor,
): Promise<{ totals: CurrencyTotals; latestTs: number } | null> {
  const counterpartyId = contact.partyId?.trim() || '';
  const counterpartyType = contact.partyType;
  if (!counterpartyId) return null;

  const price = (await getTotalPriceByPartyId(
    counterpartyId,
    counterpartyType,
    token,
    accountType,
  )) as MoneyPriceDTO;

  let totals: CurrencyTotals = extractCurrencyTotals(price ?? null);
  let latestTs = 0;

  if (isEmptyTotals(totals)) {
    const all = await loadAllHistory(counterpartyId, counterpartyType, token, accountType);
    totals = computeTotalsFromHistory(all, actor, counterpartyId, counterpartyType);
    latestTs = maxCreatedDate(all);
  }

  if (isEmptyTotals(totals) && contact.id) {
    const all = await loadAllHistory(contact.id, 'PROFILE', token, accountType);
    totals = computeTotalsFromHistory(all, actor, contact.id, 'PROFILE');
    latestTs = maxCreatedDate(all);
  }

  // Totals tezkor yo'l (price) orqali kelgan bo'lsa tarix yuklanmagan — saralash uchun
  // eng oxirgi yozuvning sanasini alohida (bitta yozim) olib kelamiz.
  if (!latestTs) {
    const head = await getMoneyHistory({
      id: counterpartyId,
      partyType: counterpartyType,
      page: 0,
      size: 1,
      token,
      accountType,
    });
    latestTs = maxCreatedDate(head.content ?? []);
  }

  return { totals, latestTs };
}

// Barcha kontaktlar balansini cheklangan paralellik (worker pool) bilan yuklaydi.
async function loadContactBalances(
  contacts: Contact[],
  token: string,
  accountType: AccountType | undefined,
  actor: Actor,
): Promise<ContactBalances> {
  const totalsByContact: Record<string, CurrencyTotals> = {};
  const latestDateByContact: Record<string, number> = {};
  const queue = [...contacts];

  const runWorker = async (): Promise<void> => {
    while (queue.length) {
      const contact = queue.shift();
      if (!contact) return;
      try {
        const result = await resolveContactBalance(contact, token, accountType, actor);
        if (!result) continue;
        totalsByContact[contact.id] = result.totals;
        if (result.latestTs) latestDateByContact[contact.id] = result.latestTs;
      } catch {
        // Bitta kontakt yuklanmasa butun ro'yxatni buzmaymiz — o'sha kontakt "--" ko'rinadi.
      }
    }
  };

  const workerCount = Math.min(MAX_CONCURRENCY, queue.length);
  await Promise.all(Array.from({ length: workerCount }, () => runWorker()));

  return { totalsByContact, latestDateByContact };
}

/**
 * Kontaktlar ro'yxati uchun balans va oxirgi amal sanalarini yuklaydi.
 *
 * Server-state to'liq React Query qo'lida: cache, dedup, `staleTime` va `refetch`.
 * Avval bu logika DebtListScreen ichida ~130 qatorli `useEffect` + qo'lda
 * `cancelled`/`loading`/`worker pool` bilan boshqarilardi — endi cache'lanadigan hook.
 */
export function useContactBalances(contacts: Contact[]) {
  const { profile } = useContext(AuthContext);
  const { accountType, partyType, accountId, accountKey } = useAccountContext();

  const actor = useMemo<Actor>(() => ({ type: partyType, id: accountId }), [partyType, accountId]);

  // Kontaktlar ro'yxati o'zgarganda (qo'shildi/o'chdi/party almashdi) qayta yuklansin.
  const contactsKey = useMemo(
    () => contacts.map((c) => `${c.id}:${c.partyId}:${c.partyType}`).join('|'),
    [contacts],
  );

  const query = useQuery<ContactBalances>({
    queryKey: ['contact-balances', accountKey, contactsKey],
    enabled: Boolean(profile?.jwt) && contacts.length > 0,
    staleTime: 15_000,
    // Real-time'ga yaqin: fonda muntazam qayta yuklanadi. Eski ma'lumot saqlangani
    // uchun spinner miltillamaydi — balanslar o'z-o'zidan yangilanadi.
    refetchInterval: 20_000,
    refetchOnWindowFocus: false,
    queryFn: () => loadContactBalances(contacts, profile!.jwt!, accountType, actor),
  });

  return {
    totalsByContact: query.data?.totalsByContact ?? EMPTY_TOTALS,
    latestDateByContact: query.data?.latestDateByContact ?? EMPTY_DATES,
    isFetching: query.isFetching,
    refetch: query.refetch,
  };
}
