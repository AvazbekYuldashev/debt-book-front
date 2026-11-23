import type { OutboxItem } from './outbox';

/**
 * Navbatdagi amalni ODAM TUSHUNADIGAN tilga o'giradi.
 *
 * Navbat HTTP darajasida yashaydi (`POST /core/debt/give`), foydalanuvchi
 * esa "qarz berdim" deb o'ylaydi. Ro'yxatda yo'l ko'rsatilsa, u hech
 * narsa anglatmasdi.
 *
 * Tanilmagan yo'l uchun ham xabar bor: ro'yxat bo'sh qator bilan emas,
 * halol "boshqa amal" bilan to'ldiriladi — shunda yangi endpoint
 * qo'shilganda ham ekran buzilmaydi.
 */
const RULES: ReadonlyArray<{ test: RegExp; key: string }> = [
  { test: /^\/core\/debt\/give/, key: 'outbox.debtGive' },
  { test: /^\/core\/debt\/take/, key: 'outbox.debtTake' },
  { test: /^\/client/, key: 'outbox.contact' },
  { test: /^\/expense/, key: 'outbox.expense' },
  { test: /^\/category/, key: 'outbox.category' },
  { test: /^\/product/, key: 'outbox.product' },
  { test: /^\/rental-item/, key: 'outbox.rentalItem' },
  { test: /^\/rental/, key: 'outbox.rental' },
  { test: /^\/gap/, key: 'outbox.gap' },
  { test: /^\/business/, key: 'outbox.business' },
  { test: /^\/profile/, key: 'outbox.profile' },
];

/** Amal turini bildiruvchi tarjima kaliti. */
export const outboxLabelKey = (item: OutboxItem): string =>
  RULES.find((rule) => rule.test.test(item.url))?.key ?? 'outbox.other';

/** O'chirish amali alohida belgilanadi: ro'yxatda farqi ko'rinsin. */
export const isDeleteAction = (item: OutboxItem): boolean => item.method === 'DELETE';

/** `HH:MM` — sanasiz: navbat bir necha kundan ortiq yashamaydi. */
export const outboxTime = (item: OutboxItem): string => {
  const d = new Date(item.createdAt);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
