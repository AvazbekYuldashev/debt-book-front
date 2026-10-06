import type { ColorTokens } from './colors';

/**
 * Native'da brauzer yo'q: autofill foni, fokus halqasi va manzil satri
 * rangi bu yerda mavjud emas (status bar App.tsx'da activeTheme bilan
 * boshqariladi). Web varianti - applyWebTheme.web.ts.
 */
export function applyWebTheme(_colors: ColorTokens): void {
  // no-op on native
}
