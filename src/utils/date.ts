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
