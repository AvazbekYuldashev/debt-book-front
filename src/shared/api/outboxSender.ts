import apiClient from './apiClient';
import { withIdempotencyKey } from '../lib/idempotency';
import { outbox, startOutboxAutoFlush } from '../lib/outbox';

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
  void outbox.init();
  return startOutboxAutoFlush();
};
