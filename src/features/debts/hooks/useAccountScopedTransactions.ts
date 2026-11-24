import { useCallback, useEffect, useMemo, useState } from 'react';
import { useIsRestoring, useQueryClient } from '@tanstack/react-query';
import { getProfileByPhone } from '../../profile/services/profileService';
import { createCredit, createDebt } from '../services/moneyService';
import { newIdempotencyKey } from '../../../shared/lib/idempotency';
import {
  addPendingToCache,
  applyPendingToTotals,
  loadMoneyDetail,
  moneyDetailKey,
  type MoneyDetailCache,
  type PendingMoneyInput,
} from '../model/moneyDetailCache';
import { isQueuedOffline } from '../../../shared/api/apiClient';
import {
  Currency,
  MoneyActionType,
  MoneyItemCreateDTO,
  MoneyPriceDTO,
  MoneyResponseDTO,
  PartyType,
} from '../../../shared/types/money';
import { extractCurrencyTotals, extractMoneyTotals } from '../../../shared/lib/money';
import { useAccountContext } from '../../../shared/hooks/useAccountContext';
import { accountTypeFromParty, flowFor } from '../model/resolveMoneyFlow';

interface FetchMoneyInput {
  partyType: PartyType;
  partyId?: string;
  phoneFallback?: string;
}

interface CreateMoneyInput {
  amount: number;
  currency: Currency;
  targetPartyType: PartyType;
  targetPartyId?: string;
  targetPhone?: string;
  description: string;
  /** Summa kalkulyatorda hisoblangan bo'lsa — o'sha ifoda; alohida ustunda saqlanadi. */
  calcNote?: string;
  // Counterparty business bo'lsa: tanlangan a'zo (profileId)
  targetBusinessProfileId?: string;
  /** Mahsulot buyurtmasi — berilsa summani server narxnomadan hisoblaydi. */
  items?: MoneyItemCreateDTO[];
}

interface UseAccountScopedTransactionsParams {
  token?: string;
}

export function useAccountScopedTransactions({ token }: UseAccountScopedTransactionsParams) {
  const queryClient = useQueryClient();
  const isRestoring = useIsRestoring();
  const { accountKey, accountType, partyType: ownerPartyType } = useAccountContext();
  const [history, setHistory] = useState<MoneyResponseDTO[]>([]);
  const [totalPrice, setTotalPrice] = useState<MoneyPriceDTO | null>(null);
  const [selectedCounterparty, setSelectedCounterparty] = useState<{ id: string; partyType: PartyType } | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setHistory([]);
    setTotalPrice(null);
    setSelectedCounterparty(null);
    setError('');
  }, [accountKey]);

  const resolveCounterpartyId = useCallback(
    async (input?: FetchMoneyInput): Promise<string> => {
      if (!input) return '';
      if (input.partyId?.trim()) return input.partyId.trim();
      if (input.partyType === 'PROFILE' && input.phoneFallback) {
        const profile = await getProfileByPhone(input.phoneFallback, token);
        return profile.id;
      }
      return '';
    },
    [token]
  );

  const fetchData = useCallback(async (input?: FetchMoneyInput) => {
    if (!token || !input) {
      setHistory([]);
      setTotalPrice(null);
      return;
    }

    /*
     * Kontakt id'si odatda ro'yxatdan keladi va tarmoq talab qilmaydi.
     * Faqat telefon bo'yicha qidirishda so'rov ketadi — oflaynda u
     * yiqilar va butun ekran bo'sh qolardi. Endi bunday holatda ham
     * keshga yetib boramiz.
     */
    /*
     * KESH DISKDAN TIKLANMAGUNCHA kutamiz.
     *
     * Tiklash asinxron: ilova ochilgan zahoti kesh bo'sh bo'ladi va
     * shu paytda o'qilsa "keshda yo'q" degan xulosa chiqar, oflaynda
     * esa tarix bo'sh qolardi — aynan ma'lumot qurilmada yotgan
     * holda. Tiklash tugagach bu funksiya o'zi qayta chaqiriladi.
     */
    if (isRestoring) {
      setLoading(true);
      return;
    }

    let resolvedCounterpartyId = '';
    try {
      resolvedCounterpartyId = await resolveCounterpartyId(input);
    } catch {
      resolvedCounterpartyId = input.partyId?.trim() ?? '';
    }
    if (!resolvedCounterpartyId) {
      setHistory([]);
      setTotalPrice(null);
      return;
    }

    /*
     * TARIX KESHDAN DARHOL CHIQADI.
     *
     * Kesh diskka saqlanadi, ya'ni ilova tarmoqsiz ochilganda ham
     * kontaktning oldi-berdi tarixi va summalari ko'rinadi. Ilgari bu
     * ekran hech narsa saqlamasdi: oflaynda kontakt ochilganda u bo'sh
     * qolar, tafsilotni ko'rishning iloji yo'q edi.
     */
    const cacheKey = moneyDetailKey(input.partyType, resolvedCounterpartyId, accountType);
    const cached = queryClient.getQueryData<MoneyDetailCache>(cacheKey);
    if (cached) {
      setHistory(cached.content);
      setTotalPrice(cached.totals);
    }

    setLoading(true);
    setError('');
    setSelectedCounterparty({ id: resolvedCounterpartyId, partyType: input.partyType });
    try {
      const detail = await loadMoneyDetail({
        partyId: resolvedCounterpartyId,
        partyType: input.partyType,
        token,
        accountType,
      });
      setHistory(detail.content);
      setTotalPrice(detail.totals);
      queryClient.setQueryData<MoneyDetailCache>(cacheKey, detail);
    } catch (e) {
      /*
       * Keshdan ko'rsatilayotgan bo'lsa XATO CHIQARMAYMIZ: ekranda
       * ma'lumot turibdi va ustiga qizil xabar qo'yish "hech narsa
       * yo'q" degan taassurot berardi. Oflayn ekani tepadagi umumiy
       * qatorda allaqachon aytilgan.
       */
      if (!cached) {
        setError(e instanceof Error ? e.message : "Ma'lumotlarni yuklab bo'lmadi");
      }
    } finally {
      setLoading(false);
    }
  }, [accountType, isRestoring, queryClient, resolveCounterpartyId, token]);

  const createMoney = useCallback(
    async (type: MoneyActionType, payload: CreateMoneyInput): Promise<boolean> => {
      if (!token) {
        setError('Token topilmadi. Qayta login qiling');
        return false;
      }

      setCreating(true);
      setError('');
      /*
       * Bu uchtasi `try` dan TASHQARIDA: oflayn yozuvni darhol
       * ko'rsatish uchun ular `catch` da ham kerak.
       */
      let resolvedCounterpartyId = '';
      let isGive = false;
      let idemKey = '';
      try {
        resolvedCounterpartyId = payload.targetPartyId?.trim()
          ? payload.targetPartyId.trim()
          : payload.targetPartyType === 'PROFILE' && payload.targetPhone
            ? (await getProfileByPhone(payload.targetPhone, token)).id
            : '';

        if (!resolvedCounterpartyId) {
          throw new Error("Foydalanuvchi ID topilmadi");
        }

        /*
         * "Bir amal — bitta yozuv" kaliti SHU YERDA, bir marta.
         *
         * Pastda `createCredit`/`createDebt` dan bittasi chaqiriladi va
         * ikkalasi ham ayni shu kalitni oladi. Server o'sha kalit bilan
         * kelgan ikkinchi so'rovni BAJARMAYDI — javob yo'lda yo'qolib,
         * so'rov qayta yuborilsa ham pul ikki marta yozilmaydi.
         *
         * Kalit servis ichida yaratilmaydi: u yerda har urinishda
         * yangisi chiqib, himoya ishlamay qolardi.
         */
        idemKey = newIdempotencyKey();

        isGive = type === 'GIVE';
        const fromPartyType = isGive ? ownerPartyType : payload.targetPartyType;
        const toPartyType = isGive ? payload.targetPartyType : ownerPartyType;
        const fromAccountType = accountTypeFromParty(fromPartyType);
        const toAccountType = accountTypeFromParty(toPartyType);
        const moneyFlowType = flowFor(fromPartyType, toPartyType);

        const commonPayload = {
          amount: payload.amount,
          currency: payload.currency,
          // Izoh bo'sh bo'lsa bo'sh qoladi: ilgari bu yerga 'Transaction'
          // yozilardi va foydalanuvchi tafsilotda o'z izohi o'rnida
          // o'sha inglizcha so'zni ko'rardi.
          description: payload.description,
          calcNote: payload.calcNote || undefined,
          items: payload.items?.length ? payload.items : undefined,
          fromAccountType,
          toAccountType,
          moneyFlowType,
        };

        if (isGive) {
          await createCredit(
            payload.targetPartyType === 'BUSINESS_ACCOUNT'
              ? {
                  ...commonPayload,
                  targetType: 'BUSINESS_ACCOUNT',
                  targetBusinessId: resolvedCounterpartyId,
                  targetBusinessProfileId: payload.targetBusinessProfileId,
                }
              : {
                  ...commonPayload,
                  debtorId: resolvedCounterpartyId,
                },
            token,
            idemKey
          );
        } else {
          await createDebt(
            payload.targetPartyType === 'BUSINESS_ACCOUNT'
              ? {
                  ...commonPayload,
                  targetType: 'BUSINESS_ACCOUNT',
                  targetBusinessId: resolvedCounterpartyId,
                  targetBusinessProfileId: payload.targetBusinessProfileId,
                }
              : {
                  ...commonPayload,
                  creditorId: resolvedCounterpartyId,
                },
            token,
            idemKey
          );
        }

        // Yaratish tugashi bilan `true` qaytaramiz — chaqiruvchi modalni DARHOL yopadi.
        // Tarixni qayta yuklashni KUTMAYMIZ (`void`): avval `await fetchData` modal
        // spinnerini yana 2-3 ketma-ket so'rov davomida ushlab turardi va "qotish"
        // hissini berardi. Endi ekran fonda o'z `loading` holati bilan yangilanadi.
        if (selectedCounterparty?.id && selectedCounterparty.partyType) {
          void fetchData({ partyType: selectedCounterparty.partyType, partyId: selectedCounterparty.id });
        }

        // Mijozlar ro'yxatidagi balanslar (React Query) alohida cache — bu yerdan
        // invalidatsiya qilmasak, ro'yxat faqat fokus/refetch vaqtida yangilanadi va
        // yangi qo'shilgan yozuv (ayniqsa yangi valyuta) darhol ko'rinmay qolishi mumkin.
        queryClient.invalidateQueries({ queryKey: ['contact-balances'] });

        return true;
      } catch (e) {
        /*
         * OFLAYNDA AMAL YO'QOLMADI — navbatga tushdi.
         *
         * Buni xato deb ko'rsatish noto'g'ri bo'lardi: odam qayta
         * kiritishga urinar va internet qaytganda ikkita yozuv paydo
         * bo'lardi. Shuning uchun muvaffaqiyat deb qaytaramiz — modal
         * yopiladi, yuborilmagani esa tepadagi umumiy qatorda sanalib
         * turadi.
         */
        if (isQueuedOffline(e)) {
          /*
           * OFLAYN YOZUV DARHOL KO'RINADI.
           *
           * Amal navbatga tushdi, lekin ekranda hech narsa o'zgarmasa
           * odam "yozilmadi shekilli" deb qayta kiritardi — internet
           * qaytganda ikkita yozuv paydo bo'lardi. Shuning uchun yozuv
           * ro'yxatga shu zahoti qo'shiladi va soat belgisi bilan
           * turadi; navbat yuborilgach haqiqiysi bilan almashadi.
           */
          const pendingInput: PendingMoneyInput = {
            partyType: payload.targetPartyType,
            partyId: resolvedCounterpartyId,
            accountType,
            isGive,
            amount: payload.amount,
            currency: payload.currency,
            description: payload.description,
            calcNote: payload.calcNote || undefined,
            /*
             * Chek satrlari vaqtinchalik yozuvga KIRMAYDI: formadagi
             * satrlar server qaytaradigan ko'rinishdan boshqa (narx va
             * yakuniy summa serverda hisoblanadi). Ularni taxmin qilib
             * ko'rsatish noto'g'ri raqam berardi — yuborilgach aniq
             * ko'rinishda keladi.
             */
            key: idemKey,
          };
          const record = addPendingToCache(queryClient, pendingInput);
          setHistory((prev) => [record, ...prev]);
          setTotalPrice((prev) => applyPendingToTotals(prev, pendingInput));
          return true;
        }
        setError(e instanceof Error ? e.message : 'Amaliyot bajarilmadi');
        return false;
      } finally {
        setCreating(false);
      }
    },
    [fetchData, ownerPartyType, queryClient, selectedCounterparty?.id, selectedCounterparty?.partyType, token]
  );

  const totals = useMemo(() => extractMoneyTotals(totalPrice), [totalPrice]);
  const currencyTotals = useMemo(() => extractCurrencyTotals(totalPrice), [totalPrice]);

  return {
    history,
    totalPrice,
    totals,
    currencyTotals,
    selectedCounterparty,
    loading,
    creating,
    error,
    fetchData,
    createMoney,
  };
}
