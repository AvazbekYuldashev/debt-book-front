import type { GapUnit } from '../types/gap';

/**
 * Backend LocalDate ("2026-08-05") ni "05.08.2026" ko'rinishiga o'giradi.
 * Deterministik — `toLocaleDateString` ishlatilmaydi, chunki u qurilma
 * lokaliga qarab har xil natija beradi.
 */
export const formatGapDate = (value?: string | null): string => {
  if (!value) return '—';
  const parts = value.slice(0, 10).split('-');
  if (parts.length !== 3) return value;
  const [year, month, day] = parts;
  return `${day}.${month}.${year}`;
};

/**
 * Birlikka qarab kasr xonalari:
 *  so'm — butun (yirik nominal)
 *  boshqa pul (dollar, rubl) — 2 xonagacha
 *  mahsulot — 2 xonagacha (2.5 kg, 0.5 litr real holat)
 * Ortiqcha nollar tushiriladi: "5 kg go'sht", "2.5 kg go'sht".
 */
const decimalsFor = (unit: GapUnit): number =>
  unit.type === 'MONEY' && unit.code === 'UZS' ? 0 : 2;

/**
 * Miqdorni birlik nomi bilan formatlaydi: "1 900 000 so'm", "100 $", "35 kg go'sht".
 * Minglar bo'sh joy bilan ajratiladi (loyihadagi formatCurrency bilan bir xil).
 */
export const formatGapAmount = (value: number, unit: GapUnit): string => {
  const safe = Number.isFinite(value) ? value : 0;
  const sign = safe < 0 ? '-' : '';
  const abs = Math.abs(safe);
  const digits = decimalsFor(unit);

  let text: string;
  if (digits === 0) {
    text = Math.round(abs).toLocaleString('ru-RU');
  } else {
    const factor = 10 ** digits;
    const rounded = Math.round(abs * factor) / factor;
    const intPart = Math.floor(rounded);
    const intText = intPart.toLocaleString('ru-RU');
    const decValue = Math.round((rounded - intPart) * factor);
    const decText = String(decValue).padStart(digits, '0').replace(/0+$/, '');
    text = decText ? `${intText}.${decText}` : intText;
  }

  return `${sign}${text} ${unit.label}`;
};

/**
 * Kiritilayotgan miqdorni formatlaydi: butun qismi minglar bo'yicha ajratiladi,
 * kasr qismi saqlanadi — "1 500", "1.5", "0.25".
 *
 * Loyihadagi `formatAmountInput` faqat pulga mo'ljallangan va raqamdan boshqa
 * hamma narsani o'chiradi. Gap kassada esa birlik kg yoki litr bo'lishi mumkin,
 * u yerda "1.5 litr" mutlaqo normal — shuning uchun alohida formatter kerak.
 */
export const formatGapAmountInput = (raw: string): string => {
  // Vergul ham nuqta ham qabul qilinadi, birinchi ajratuvchidan keyingilari tashlanadi.
  const cleaned = raw.replace(/,/g, '.').replace(/[^\d.]/g, '');
  const firstDot = cleaned.indexOf('.');
  const intRaw = firstDot === -1 ? cleaned : cleaned.slice(0, firstDot);
  const decRaw = firstDot === -1 ? null : cleaned.slice(firstDot + 1).replace(/\./g, '').slice(0, 3);

  const intText = intRaw.replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  if (decRaw === null) return intText;
  return `${intText || '0'}.${decRaw}`;
};

/** Formatlangan matnni musbat songa o'giradi; noto'g'ri qiymatda null. */
export const parseGapAmountInput = (raw: string): number | null => {
  const normalized = raw.replace(/\s/g, '').replace(',', '.');
  if (!normalized || normalized === '.') return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};
