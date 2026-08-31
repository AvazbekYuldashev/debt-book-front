import type { GapUnit } from '../types/gap';

/**
 * Tayyor o'lchov birliklari.
 *
 * Birlik faqat O'LCHOVni bildiradi — nima o'lchanayotgani emas:
 * "kg", "litr", "metr" — "kg go'sht" yoki "litr yog'" EMAS.
 * Nima yig'ilayotgani guruh nomida turadi ("Go'sht kassasi").
 *
 * Shu sababli bir xil o'lchovdagi guruhlar statistikada qo'shilib ketadi:
 * go'sht kassasi va guruch kassasi ikkalasi ham "kg" ustuniga tushadi.
 *
 * Ro'yxat qat'iy emas — foydalanuvchi o'z birligini kiritishi mumkin.
 */
export const GAP_UNIT_PRESETS: GapUnit[] = [
  { code: 'UZS', label: "so'm", type: 'MONEY' },
  { code: 'USD', label: '$', type: 'MONEY' },
  { code: 'RUB', label: '₽', type: 'MONEY' },
  { code: 'KG', label: 'kg', type: 'GOODS' },
  { code: 'LITR', label: 'litr', type: 'GOODS' },
  { code: 'METR', label: 'metr', type: 'GOODS' },
  { code: 'DONA', label: 'dona', type: 'GOODS' },
];

/** Foydalanuvchi kiritgan matndan birlik yasaydi (kod — katta harfda, kalit sifatida). */
export const customUnit = (label: string): GapUnit => ({
  code: label.trim().toUpperCase().replace(/\s+/g, '_'),
  label: label.trim(),
  type: 'GOODS',
});
