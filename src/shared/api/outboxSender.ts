import apiClient from './apiClient';
import { withIdempotencyKey } from '../lib/idempotency';
import { outbox, startOutboxAutoFlush } from '../lib/outbox';
import { queryClient } from '../lib/queryClient';
import { dropPendingFromCache } from '../../features/debts/model/moneyDetailCache';

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
   * Amal serverga yetgach VAQTINCHALIK yozuv olib tashlanadi va
   * ma'lumot qayta so'raladi.
   *
   * Aks holda server bergan haqiqiy yozuv keshdagi vaqtinchalik yozuv
   * YONIDA turib qolar va odam bitta qarzni ikkita bo'lib ko'rardi.
   */
  const stopSentWatch = outbox.subscribeSent((item) => {
    dropPendingFromCache(queryClient, item.key);
    void queryClient.invalidateQueries({ queryKey: ['money-detail'] });
    void queryClient.invalidateQueries({ queryKey: ['contact-balances'] });
  });

  void outbox.init();
  const stopAutoFlush = startOutboxAutoFlush();
  return () => {
    stopSentWatch();
    stopAutoFlush();
  };
};
