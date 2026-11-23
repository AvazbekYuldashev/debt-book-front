import type { QueryClient } from '@tanstack/react-query';
import { getMoneyHistory, getTotalPriceByPartyId } from '../services/moneyService';
import type { AccountType, MoneyPriceDTO, MoneyResponseDTO, PartyType } from '../../../shared/types/money';

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
