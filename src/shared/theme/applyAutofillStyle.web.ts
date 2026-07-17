import { ColorTokens } from './colors';

const STYLE_ID = 'rn-autofill-fix';

/**
 * Brauzer autofill (Chrome/Safari `-webkit-autofill`) inputlarga o'z och fonini
 * majburan qo'yadi va uni `background-color` bilan bekor qilib bo'lmaydi — faqat
 * `box-shadow: inset` hiylasi ishlaydi. Bu funksiya joriy theme rangi bilan global
 * CSS'ni inject/yangilaydi, shunda autofill inputlar dark mode'da ham to'g'ri ko'rinadi.
 */
export function applyAutofillStyle(colors: ColorTokens): void {
  if (typeof document === 'undefined') return;

  let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement('style');
    el.id = STYLE_ID;
    document.head.appendChild(el);
  }

  el.textContent = `
    input:-webkit-autofill,
    input:-webkit-autofill:hover,
    input:-webkit-autofill:focus,
    input:-webkit-autofill:active {
      -webkit-box-shadow: 0 0 0 1000px ${colors.surfaceMuted} inset !important;
      box-shadow: 0 0 0 1000px ${colors.surfaceMuted} inset !important;
      -webkit-text-fill-color: ${colors.textPrimary} !important;
      caret-color: ${colors.textPrimary} !important;
      transition: background-color 9999s ease-in-out 0s !important;
    }
  `;
}
