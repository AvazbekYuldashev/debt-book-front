import { ColorTokens } from './colors';

// Native platformalarda brauzer autofill'i yo'q — noop.
// Web varianti (.web.ts) `:-webkit-autofill` CSS'ini theme rangi bilan inject qiladi.
export function applyAutofillStyle(_colors: ColorTokens): void {
  // no-op on native
}
