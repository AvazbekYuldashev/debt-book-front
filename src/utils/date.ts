import { translate } from '../i18n';

export type DateRangeResult =
  | { ok: true; fromDate?: string; endDate?: string }
  | { ok: false; error: string };

/** YYYY-MM-DD formatini va haqiqiy kalendar sanasini tekshiradi. */
export function isValidDateInput(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

/**
 * Sana oralig'ini tekshiradi va normalizatsiya qiladi.
 * Xato xabarlari joriy til bo'yicha (expenses.date* kalitlari).
 */
export function resolveDateRange(fromDate: string, endDate: string): DateRangeResult {
  const normalizedFrom = fromDate?.trim() || '';
  const normalizedEnd = endDate?.trim() || '';

  if (normalizedFrom && !isValidDateInput(normalizedFrom)) {
    return { ok: false, error: translate('expenses.dateFromInvalid') };
  }
  if (normalizedEnd && !isValidDateInput(normalizedEnd)) {
    return { ok: false, error: translate('expenses.dateToInvalid') };
  }
  if (normalizedFrom && normalizedEnd) {
    const fromValue = new Date(normalizedFrom);
    const endValue = new Date(normalizedEnd);
    if (Number.isNaN(fromValue.getTime()) || Number.isNaN(endValue.getTime())) {
      return { ok: false, error: translate('expenses.dateInvalid') };
    }
    if (endValue < fromValue) {
      return { ok: false, error: translate('expenses.dateOrder') };
    }
  }

  return {
    ok: true,
    fromDate: normalizedFrom || undefined,
    endDate: normalizedEnd || undefined,
  };
}

// ============================================================
//  YYYY-MM-DD sana oralig'i bilan ishlash uchun sof yordamchilar.
//  (Avval ExpensesScreen ichida edi — testable qilish uchun ko'chirildi.)
// ============================================================

/** Foydalanuvchi kiritayotgan raqamlarni progressiv YYYY-MM-DD ga formatlaydi. */
export function formatDateInputValue(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
}

/** Date obyektini YYYY-MM-DD (lokal vaqt) satriga aylantiradi. */
export function formatDateFromDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Standart oraliq: joriy oyning 1-sanasidan bugungacha. */
export function getDefaultMonthRange(): { fromDate: string; endDate: string } {
  const now = new Date();
  return {
    fromDate: formatDateFromDate(new Date(now.getFullYear(), now.getMonth(), 1)),
    endDate: formatDateFromDate(now),
  };
}

/** Joriy hafta oralig'i (dushanbadan bugungacha). */
export function getCurrentWeekRange(today: Date): { fromDate: string; endDate: string } {
  const weekStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const day = weekStart.getDay();
  const deltaToMonday = day === 0 ? 6 : day - 1;
  weekStart.setDate(weekStart.getDate() - deltaToMonday);
  return {
    fromDate: formatDateFromDate(weekStart),
    endDate: formatDateFromDate(today),
  };
}

function parseInputDate(value: string): Date | null {
  if (!isValidDateInput(value)) return null;
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function addMonthsSafe(date: Date, months: number): Date {
  const y = date.getFullYear();
  const m = date.getMonth() + months;
  const d = date.getDate();
  const first = new Date(y, m, 1);
  const lastDay = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  return new Date(first.getFullYear(), first.getMonth(), Math.min(d, lastDay));
}

function diffYmd(from: Date, to: Date): { years: number; months: number; days: number } {
  if (to < from) return { years: 0, months: 0, days: 0 };

  let years = 0;
  let months = 0;
  let cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate());

  while (true) {
    const next = addMonthsSafe(cursor, 12);
    if (next <= to) {
      years += 1;
      cursor = next;
    } else {
      break;
    }
  }

  while (true) {
    const next = addMonthsSafe(cursor, 1);
    if (next <= to) {
      months += 1;
      cursor = next;
    } else {
      break;
    }
  }

  const dayMs = 24 * 60 * 60 * 1000;
  const days = Math.floor((to.getTime() - cursor.getTime()) / dayMs);
  return { years, months, days };
}

/** Oraliq davomiyligini o'qiladigan yorliqqa aylantiradi ("2 oy 3 kunlik"). */
export function buildDurationLabel(fromDate: string, endDate: string): string {
  const from = parseInputDate(fromDate);
  const to = parseInputDate(endDate);
  if (!from || !to || to < from) return '';

  const { years, months, days } = diffYmd(from, to);
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} yil`);
  if (months > 0) parts.push(`${months} oy`);
  if (days > 0) parts.push(`${days} kun`);
  if (parts.length === 0) return '0 kunlik';
  return `${parts.join(' ')}lik`;
}

/** Date-picker uchun boshlang'ich qiymat (noto'g'ri satr bo'lsa — bugun). */
export function getPickerDate(value: string): Date {
  if (isValidDateInput(value)) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

/** YYYY-MM-DD satrini yil/oy/kun qismlariga ajratadi. */
export function splitDateParts(value: string): { year: string; month: string; day: string } {
  if (!value) return { year: '', month: '', day: '' };
  const [year = '', month = '', day = ''] = value.split('-');
  return { year, month, day };
}

/** Sananing bitta qismini (yil/oy/kun) yangilab, YYYY-MM-DD satrini qaytaradi. */
export function updateDatePart(value: string, part: 'year' | 'month' | 'day', next: string): string {
  const current = splitDateParts(value);
  const updated = {
    year: part === 'year' ? next : current.year,
    month: part === 'month' ? next : current.month,
    day: part === 'day' ? next : current.day,
  };

  if (!updated.year && !updated.month && !updated.day) return '';
  return `${updated.year}-${updated.month}-${updated.day}`;
}
