import type { GapUnit } from '../types/gap';

/**
 * Tayyor o'lchov birliklari.
 *
 * Pul birliklari o'zicha to'liq: "so'm", "$", "₽" — boshqa hech narsa kerak
 * emas. Mahsulot birliklari esa YOLG'IZ O'ZI MA'NOSIZ: 1 kg go'sht bilan
 * 1 kg guruch bir xil narsa emas va ularni qo'shib bo'lmaydi. Shuning uchun
 * mahsulot tanlanganda nima o'lchanayotgani ham so'raladi va birlik
 * "kg go'sht" ko'rinishida saqlanadi.
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

/** Matnni barqaror kalitga aylantiradi: "go'sht" -> "GOSHT". */
const slug = (value: string): string =>
  value
    .trim()
    .toUpperCase()
    .replace(/[’'`]/g, '')
    .replace(/\s+/g, '_');

/**
 * O'lchov va mahsulotni bitta birlikka qo'shadi.
 *
 * Kod guruhlash kaliti bo'lgani uchun mahsulot ham unga kiradi — aks holda
 * "kg go'sht" va "kg guruch" bitta ustunga tushib, statistika yolg'on
 * ko'rsatardi.
 */
export const goodsUnit = (measure: GapUnit, substance: string): GapUnit => {
  const clean = substance.trim();
  if (!clean) return measure;
  return {
    code: `${measure.code}_${slug(clean)}`,
    label: `${measure.label} ${clean}`,
    type: 'GOODS',
  };
};

/** Foydalanuvchi kiritgan matndan birlik yasaydi (kod — katta harfda, kalit sifatida). */
export const customUnit = (label: string): GapUnit => ({
  code: slug(label),
  label: label.trim(),
  type: 'GOODS',
});

/**
 * Saqlangan birlikni qayta tahrirlash uchun bo'laklarga ajratadi.
 *
 * "KG_GOSHT" -> { measure: KG presets'dagi, substance: "go'sht" } — label'dan
 * o'qiymiz, chunki kalitda apostrof va bo'shliqlar yo'qolgan.
 */
export const splitUnit = (
  unit: GapUnit | null | undefined
): { measureCode: string | null; substance: string } => {
  if (!unit?.code) return { measureCode: null, substance: '' };

  const exact = GAP_UNIT_PRESETS.find((preset) => preset.code === unit.code);
  if (exact) return { measureCode: exact.code, substance: '' };

  const measure = GAP_UNIT_PRESETS.find((preset) => unit.code.startsWith(`${preset.code}_`));
  if (measure) {
    const label = unit.label ?? '';
    const substance = label.startsWith(`${measure.label} `)
      ? label.slice(measure.label.length + 1)
      : '';
    return { measureCode: measure.code, substance };
  }

  return { measureCode: null, substance: unit.label ?? '' };
};
