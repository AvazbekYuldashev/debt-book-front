import type { ColorTokens } from './colors';

const STYLE_ID = 'rn-web-theme';

/**
 * Odam Tab bilan yurayotgan paytda <html> da turadigan belgi.
 * Fokus halqasi faqat shu belgi bor paytda chiziladi.
 */
export const KEYBOARD_ATTR = 'data-kbd';

/**
 * Brauzer autofill (Chrome/Safari `-webkit-autofill`) inputlarga o'z och fonini
 * `!important` bilan majburan qo'yadi - uni `background-color` bilan bekor
 * qilib bo'lmaydi.
 *
 * Fonni `transition` ushlab turadi: o'tish qiymati kaskadda `!important`
 * dan ham ustun, 9999s davomida fon maydonning o'zinikicha qoladi. Shu
 * sababli inset soya YARIM SHAFFOF `surfaceMuted` - maydonning o'z tusi
 * kabi. To'liq qoplama (`surface`) shisha karta yoki kulrang maydon ichida
 * oq/to'q to'rtburchak bo'lib qolardi.
 */
const autofillCss = (colors: ColorTokens): string => `
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

/**
 * FOKUS HALQASI - faqat Tab bilan yurilganda va brand rangida.
 *
 * react-native-web fokusga hech qanday uslub bermaydi, shuning uchun
 * brauzerning o'z halqasi chiqardi: qora/oq, Android'da to'q sariq -
 * mavzuni bilmaydi. Bundan yomoni, Chromium'ning `:focus-visible` taxmini
 * halqani sichqoncha/barmoq bilan bosgandan keyin ham yoqadi: keyin istalgan
 * tugma (bo'sh joy, strelka) bosilsa, modal yopilib fokusni qaytarsa va
 * matn maydonida HAR DOIM. Teginib ishlaydigan odamda "qolib ketgan" halqa
 * ko'rinardi.
 *
 * Shu sabab taxminga tayanmaymiz: Tab bosilsa <html data-kbd>, ekranga
 * tegilsa (sichqoncha yoki barmoq) belgi olib tashlanadi.
 *
 * Hamma qoida `:where()` ichida - ustuvorligi NOL. Komponent o'z uslubida
 * halqani ataylab o'chirgan bo'lsa (AuthTextInput: fokusni butun qatorga
 * AuthField chizadi), uning sinfi bu yerdan ustun keladi. Qoidalar o'zaro
 * esa tartib bo'yicha ishlaydi - pastdagisi ustun.
 *
 * - data-focus="inset": overflow:hidden yumaloq kartaga to'liq eni bilan
 *   tekkan qator. Tashqi halqani karta kesib, 1px chiziq qoldirardi.
 *   Karta burchagidagi (birinchi/oxirgi) qator radiusni otasidan oladi:
 *   aks holda halqaning to'g'ri burchagi karta radiusida uzilib qolardi.
 * - data-focus="self": o'z fokus chegarasini chizadigan maydon (Input,
 *   SearchField) - ikkinchi halqa ortiqcha.
 * - tabindex="-1": dastur fokuslagan element (masalan modal o'ramasi).
 *   U Tab to'xtash joyi emas - halqa butun sheet'ni o'rab qolardi.
 */
const focusCss = (colors: ColorTokens): string => `
:where(:focus:not(:focus-visible)) { outline: none; }
:where(html:not([${KEYBOARD_ATTR}]) :focus-visible) { outline: none; }
:where(html[${KEYBOARD_ATTR}] :focus-visible) {
  outline: 2px solid ${colors.primary};
  outline-offset: 2px;
}
:where(html[${KEYBOARD_ATTR}] [data-focus="inset"]:focus-visible) { outline-offset: -2px; }
:where(html[${KEYBOARD_ATTR}] [data-focus="inset"]:focus-visible:first-child) {
  border-top-left-radius: inherit;
  border-top-right-radius: inherit;
}
:where(html[${KEYBOARD_ATTR}] [data-focus="inset"]:focus-visible:last-child) {
  border-bottom-left-radius: inherit;
  border-bottom-right-radius: inherit;
}
:where([data-focus="self"]:focus-visible, [tabindex="-1"]:focus-visible) { outline: none; }
`;

/**
 * Brauzerga beriladigan global CSS. Toza funksiya (DOM'ga tegmaydi) -
 * testda matn sifatida tekshiriladi.
 */
export function buildWebThemeCss(colors: ColorTokens): string {
  return autofillCss(colors) + focusCss(colors);
}

let modalityTracked = false;

/**
 * Kirish usulini kuzatish - BIR MARTA va capture fazasida: komponent
 * hodisani to'xtatsa (stopPropagation) ham belgi to'g'ri qoladi.
 */
function trackInputModality(doc: Document): void {
  if (modalityTracked) return;
  modalityTracked = true;
  const root = doc.documentElement;

  doc.addEventListener(
    'keydown',
    (event) => {
      // Faqat Tab. Bo'sh joy va strelkalar sahifani aylantirish uchun ham
      // bosiladi - ular halqani yoqsa, sichqonchadagi odamda yana "qolgan"
      // halqa chiqardi. Ctrl/Alt/Cmd+Tab - oyna almashtirish, sahifada yurish emas.
      if (event.key !== 'Tab' || event.altKey || event.ctrlKey || event.metaKey) return;
      root.setAttribute(KEYBOARD_ATTR, '');
    },
    true,
  );
  doc.addEventListener('pointerdown', () => root.removeAttribute(KEYBOARD_ATTR), true);
}

/**
 * Brauzer paneli (Android Chrome manzil satri) va sahifa chetdan tortilganda
 * ko'rinadigan fon - SAMARALI ko'rinish rangida.
 *
 * index.html'dagi qiymatlar faqat OS mavzusini biladi: yorug' rejimda fon
 * rasmi to'q bo'lsa ilova to'q, panel esa och qolardi.
 * Ikkala <meta> ga ham bir xil rang: media sharti endi ahamiyatsiz.
 */
function paintBrowserChrome(doc: Document, background: string): void {
  const metas = doc.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]');
  if (metas.length === 0) {
    const meta = doc.createElement('meta');
    meta.name = 'theme-color';
    meta.content = background;
    doc.head.appendChild(meta);
  } else {
    metas.forEach((meta) => meta.setAttribute('content', background));
  }
  if (doc.body) doc.body.style.backgroundColor = background;
}

/**
 * Web'da brauzerning o'zi chizadigan qismlarni joriy mavzuga moslaydi:
 * autofill foni, fokus halqasi, manzil satri va sahifa foni.
 *
 * `colors` - SAMARALI ranglar (asosiy rang va fon rasmiga moslangan),
 * foydalanuvchi tanlagan rejim emas.
 */
export function applyWebTheme(colors: ColorTokens): void {
  if (typeof document === 'undefined') return;

  trackInputModality(document);

  let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement('style');
    el.id = STYLE_ID;
    document.head.appendChild(el);
  }
  el.textContent = buildWebThemeCss(colors);

  paintBrowserChrome(document, colors.background);
}
