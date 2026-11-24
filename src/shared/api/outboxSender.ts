import apiClient from './apiClient';
import { withIdempotencyKey } from '../lib/idempotency';
import { outbox, startOutboxAutoFlush } from '../lib/outbox';
import { queryClient } from '../lib/queryClient';
import { dropPendingEverywhere } from '../lib/pendingWrites';

/**
 * Oflayn navbatni API klientiga ulaydi.
 *
 * Navbat moduli `apiClient` ni O'ZI import qilmaydi: u sof mantiq bo'lib
 * qolishi va testda tarmoqsiz ishlashi kerak. Ulanish shu yerda — bitta
 * joyda va dastur ishga tushganda bir marta.
 *
 * Yuborishda kalit ALBATTA qo'shiladi: navbatdagi amal qayta yuborilishi
 * mumkin va server uni aynan kalitdan taniydi.
 */
export const connectOutbox = (): (() => void) => {
  outbox.setSender(async (item) => {
    await apiClient.request({
      method: item.method,
      url: item.url,
      data: item.body,
      ...withIdempotencyKey(undefined, item.key),
    });
  });

  /*
   * Amal navbatdan chiqqach vaqtinchalik yozuv olib tashlanadi.
   *
   * Yuborilgan bo'lsa — server bergan haqiqiy yozuv keladi va ikkisi
   * yonma-yon turib qolmasligi kerak (odam bitta amalni ikkita bo'lib
   * ko'rardi). Rad etilgan bo'lsa ham olib tashlanadi: aks holda yozuv
   * ekranda abadiy soat belgisi bilan qolib, yuborilishini bir umr
   * kutib turardi.
   */
  const stopSettledWatch = outbox.subscribeSettled((item, outcome) => {
    dropPendingEverywhere(queryClient, item.key);
    if (outcome === 'sent') scheduleRefresh();
  });

  void outbox.init();
  const stopAutoFlush = startOutboxAutoFlush();
  return () => {
    stopSettledWatch();
    stopAutoFlush();
  };
};

/**
 * Navbat bo'shagandan keyin ma'lumotni BIR MARTA qayta so'raydi.
 *
 * Har amal uchun alohida so'rash navbatda yigirmata amal turgan paytda
 * yigirma to'lqin so'rov yasardi — aniq internet qaytgan, ya'ni eng
 * nozik payt. Shuning uchun yangilash keyingi navbatga suriladi va
 * barcha amallar uchun bittaga birlashadi.
 *
 * Nima uchun HAMMASI yangilanadi: oflaynda qarz ham, xarajat ham,
 * mahsulot ham, kontakt ham kiritilgan bo'lishi mumkin. Ro'yxatni
 * qo'lda sanab chiqish esa yangi bo'lim qo'shilganda jimgina
 * eskirardi.
 */
let refreshScheduled = false;

const scheduleRefresh = (): void => {
  if (refreshScheduled) return;
  refreshScheduled = true;
  setTimeout(() => {
    refreshScheduled = false;
    void queryClient.invalidateQueries();
  }, 0);
};
