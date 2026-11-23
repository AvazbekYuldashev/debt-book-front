import type { QueryClient } from '@tanstack/react-query';
import { getMoneyHistory, getTotalPriceByPartyId } from '../services/moneyService';
import type {
  AccountType,
  Currency,
  MoneyPriceDTO,
  MoneyResponseDTO,
  PartyType,
} from '../../../shared/types/money';

// ============================================================
//  KONTAKT TAFSILOTI — yuklash va keshlash.
//
//  Bu ekran React Query ni ishlatmaydi (bir nechta so'rov qo'lda
//  birlashtiriladi), shuning uchun natija keshga QO'LDA yoziladi. Kesh
//  esa diskka saqlanadi — ya'ni ilova tarmoqsiz ochilganda ham
//  kontaktning oldi-berdi tarixi va summalari ko'rinadi.
//
//  Yuklash mantig'i shu yerda, hook ichida emas: uni FONDA ham
//  chaqirish kerak. Ro'yxat ochilganda ilova barcha kontaktlarning
//  tafsilotini oldindan yuklab qo'yadi, shunda internet uzilganda
//  odam istalgan kontaktni ocha oladi — faqat o'zi kirib ko'rganini
//  emas.
// ============================================================

/** Kontakt tafsiloti keshda shu ko'rinishda yotadi. */
export interface MoneyDetailCache {
  content: MoneyResponseDTO[];
  totals: MoneyPriceDTO | null;
}

export const moneyDetailKey = (
  partyType: PartyType,
  partyId: string,
  accountType?: AccountType,
): unknown[] => ['money-detail', partyType, partyId, accountType ?? 'all'];

interface LoadParams {
  partyId: string;
  partyType: PartyType;
  token: string;
  accountType?: AccountType;
}

/**
 * Tarix va summalarni yuklaydi.
 *
 * Biznes hisobida ikki yo'nalish birlashtiriladi: backend
 * `accountType=business` bilan ba'zan faqat biznes KREDITOR bo'lgan
 * yozuvlarni qaytaradi va mijoz bergan tomoni tushib qolardi. Shuning
 * uchun ikkinchi so'rov `accountType` siz yuboriladi va natijalar id
 * bo'yicha birlashtiriladi.
 */
export const loadMoneyDetail = async ({
  partyId,
  partyType,
  token,
  accountType,
}: LoadParams): Promise<MoneyDetailCache> => {
  const baseParams = { id: partyId, partyType, page: 0, size: 50, token, accountType };

  const [historyPage, totals] = await Promise.all([
    getMoneyHistory(baseParams),
    getTotalPriceByPartyId(partyId, partyType, token, accountType),
  ]);

  let content = historyPage.content ?? [];

  if (accountType) {
    try {
      const reversePage = await getMoneyHistory({ ...baseParams, accountType: undefined });
      const reverseContent = reversePage.content ?? [];
      if (reverseContent.length > 0) {
        const seen = new Set(content.map((item) => item.id));
        const extra = reverseContent.filter((item) => !seen.has(item.id));
        if (extra.length > 0) {
          content = [...content, ...extra].sort(
            (a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime(),
          );
        }
      }
    } catch {
      // Qo'shimcha so'rov yiqilsa asosiy natija saqlanadi.
    }
  }

  return { content, totals: totals ?? null };
};

/**
 * Kontaktlar tafsilotini FONDA, navbat bilan yuklab qo'yadi.
 *
 * NAVBAT BILAN va cheklangan sonda: ro'yxatda yuzlab kontakt bo'lishi
 * mumkin va hammasini bir vaqtda so'rash telefonni ham, serverni ham
 * bo'g'ib qo'yardi. Ekranda turgan ish (ro'yxatning o'zi) birinchi
 * bo'lishi kerak.
 *
 * Keshda bor kontakt QAYTA yuklanmaydi: maqsad — oflaynda ochib
 * ko'rish imkoni, eng yangi raqam emas. Yangisi kontakt ochilganda
 * baribir so'raladi.
 */
export const prefetchMoneyDetails = async (
  queryClient: QueryClient,
  contacts: ReadonlyArray<{ id: string; partyType: PartyType }>,
  token: string,
  accountType?: AccountType,
  limit = 60,
): Promise<void> => {
  const queue = contacts
    .filter((c) => c.id && !queryClient.getQueryData(moneyDetailKey(c.partyType, c.id, accountType)))
    .slice(0, limit);

  for (const contact of queue) {
    try {
      const detail = await loadMoneyDetail({
        partyId: contact.id,
        partyType: contact.partyType,
        token,
        accountType,
      });
      queryClient.setQueryData(moneyDetailKey(contact.partyType, contact.id, accountType), detail);
    } catch {
      /*
       * Bitta kontakt yuklanmasa qolganlari davom etadi — lekin tarmoq
       * umuman yo'q bo'lsa bu halqa behuda aylanardi. `apiClient`
       * oflayn holatni biladi, shuning uchun navbatni shu yerda
       * to'xtatamiz: keyingi urinish tarmoq qaytganda bo'ladi.
       */
      break;
    }
  }
};


// ============================================================
//  OFLAYNDA KIRITILGAN YOZUV — DARHOL KO'RINADI.
//
//  Odam qarz yozdi, internet yo'q. Amal navbatga tushadi, lekin ekranda
//  hech narsa o'zgarmasa, u "yozilmadi shekilli" deb o'ylab qayta
//  kiritardi. Shuning uchun yozuv ro'yxatga DARHOL qo'shiladi va soat
//  belgisi bilan turadi — xuddi yuborilmagan xabar kabi.
//
//  Summalar ham shu yerda to'g'rilanadi: aks holda tarixda yozuv turib,
//  tepadagi balans eski qolar va ikkisi bir-biriga zid ko'rinardi.
//  Server yuborilgandan keyin baribir aniq raqamni qaytaradi.
// ============================================================

export interface PendingMoneyInput {
  partyType: PartyType;
  partyId: string;
  accountType?: AccountType;
  /** `true` — men berdim (haq), `false` — men oldim (qarz). */
  isGive: boolean;
  amount: number;
  currency?: Currency;
  description?: string;
  calcNote?: string;
  /** Navbatdagi amalning kaliti — yozuv o'sha amalga tegishli ekani bilinadi. */
  key: string;
}

/** Oflayn yozuv uchun vaqtinchalik id — server bergani bilan adashmasin. */
export const pendingMoneyId = (key: string): string => `pending:${key}`;

/**
 * Oflayn yozuvdan vaqtinchalik tranzaksiya yasaydi.
 *
 * Yo'nalish QARAMA-QARSHI TOMON orqali beriladi: `mapTransaction` aynan
 * shu bo'yicha ham aniqlay oladi va bu yerda o'z hisobimizning id'si
 * kerak emas.
 */
export const buildPendingMoney = (input: PendingMoneyInput): MoneyResponseDTO => {
  const isBusiness = input.partyType === 'BUSINESS_ACCOUNT';
  const side = input.isGive
    ? // Men berdim: qarama-qarshi tomon QARZDOR.
      isBusiness
      ? { debtorBusinessId: input.partyId, debtorType: 'BUSINESS_ACCOUNT' as PartyType }
      : { debtorId: input.partyId, debtorType: 'PROFILE' as PartyType }
    : // Men oldim: qarama-qarshi tomon HAQDOR.
      isBusiness
      ? { creditorBusinessId: input.partyId, creditorType: 'BUSINESS_ACCOUNT' as PartyType }
      : { creditorId: input.partyId, creditorType: 'PROFILE' as PartyType };

  return {
    id: pendingMoneyId(input.key),
    amount: input.amount,
    currency: input.currency,
    visible: true,
    createdDate: new Date().toISOString(),
    description: input.description ?? '',
    calcNote: input.calcNote,
    pending: true,
    ...side,
  };
};

/** Valyuta bo'yicha yig'indiga qo'shadi (satr bo'lsa ham songa aylantiradi). */
const addTo = (
  map: Record<string, number | string> | undefined,
  currency: string,
  amount: number,
): Record<string, number | string> => {
  const next = { ...(map ?? {}) };
  const current = Number(next[currency] ?? 0);
  next[currency] = (Number.isFinite(current) ? current : 0) + amount;
  return next;
};

/** Summalarni oflayn yozuv hisobiga to'g'rilaydi. */
export const applyPendingToTotals = (
  totals: MoneyPriceDTO | null,
  input: PendingMoneyInput,
): MoneyPriceDTO => {
  const currency = input.currency ?? 'UZS';
  const base: MoneyPriceDTO = { ...(totals ?? {}) };
  if (input.isGive) {
    base.creditByCurrency = addTo(base.creditByCurrency, currency, input.amount);
    base.totalCredit = Number(base.totalCredit ?? 0) + input.amount;
  } else {
    base.debtByCurrency = addTo(base.debtByCurrency, currency, input.amount);
    base.totalDebt = Number(base.totalDebt ?? 0) + input.amount;
  }
  return base;
};

/**
 * Oflayn yozuvni keshga qo'shadi.
 *
 * Keshga ham yoziladi, faqat ekran holatiga emas: odam boshqa ekranga
 * o'tib qaytsa yoki ilovani yopib ochsa ham yozuv joyida turishi kerak.
 */
export const addPendingToCache = (
  queryClient: QueryClient,
  input: PendingMoneyInput,
): MoneyResponseDTO => {
  const record = buildPendingMoney(input);
  const key = moneyDetailKey(input.partyType, input.partyId, input.accountType);
  const current = queryClient.getQueryData<MoneyDetailCache>(key);
  queryClient.setQueryData<MoneyDetailCache>(key, {
    content: [record, ...(current?.content ?? [])],
    totals: applyPendingToTotals(current?.totals ?? null, input),
  });
  return record;
};

/**
 * Yuborilgan oflayn yozuvni keshdan olib tashlaydi.
 *
 * Server o'z yozuvini qaytaradi va ikkisi yonma-yon turib qolmasligi
 * kerak — odam bitta qarzni ikkita bo'lib ko'rardi.
 */
export const dropPendingFromCache = (queryClient: QueryClient, key: string): void => {
  const id = pendingMoneyId(key);
  queryClient
    .getQueryCache()
    .findAll({ queryKey: ['money-detail'] })
    .forEach((query) => {
      const data = query.state.data as MoneyDetailCache | undefined;
      if (!data?.content?.some((item) => item.id === id)) return;
      queryClient.setQueryData<MoneyDetailCache>(query.queryKey, {
        ...data,
        content: data.content.filter((item) => item.id !== id),
      });
    });
};
