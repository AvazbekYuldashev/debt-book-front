import { makeGlass } from '../glass';
import { darkColors, lightColors } from '../colors';
import { makeShadows } from '../elevation';

const themes = [
  ['yorug\'', lightColors],
  ['qorong\'i', darkColors],
] as const;

/** rgba(...) dagi alfa; alfasiz rang uchun 1. */
const alphaOf = (color?: string): number => {
  if (!color) return 1;
  const m = /rgba?\(([^)]+)\)/.exec(color);
  if (!m) return 1; // #RRGGBB — to'liq shaffofmas
  const parts = m[1].split(',').map((p) => p.trim());
  return parts.length < 4 ? 1 : Number(parts[3]);
};

describe('glass.modal', () => {
  /**
   * Dialoglar SHAFFOF BO'LMASLIGI shart.
   *
   * "Shisha" ko'rinishi `backdropFilter` blur'iga tayanadi, u esa faqat
   * web'da ishlaydi. Android/iOS'da blur yo'q — shaffof modal ortidagi
   * ro'yxat va summalar matn ustidan ko'rinib, o'qib bo'lmas darajada
   * aralashib ketardi. Shu sababli fon alfasi 1 bo'lishi kerak.
   */
  it.each(themes)('%s mavzuda modal foni shaffof emas', (_name, colors) => {
    const glass = makeGlass(colors, makeShadows(colors.shadow));
    expect(alphaOf(glass.modal.backgroundColor as string)).toBe(1);
  });

  it.each(themes)('%s mavzuda scrim shaffof — ort ko\'rinib tursin', (_name, colors) => {
    const glass = makeGlass(colors, makeShadows(colors.shadow));
    expect(alphaOf(glass.scrim.backgroundColor as string)).toBeLessThan(1);
  });
});
