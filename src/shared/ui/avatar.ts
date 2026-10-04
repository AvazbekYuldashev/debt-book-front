// ============================================================
//  Avatar (initial doiracha) yordamchilari — ekranlar bo'ylab yagona manba.
//  Ismdan deterministik tus va bosh harflar.
// ============================================================

import { withAlpha } from '../theme/accent';
import type { ColorTokens } from '../theme/colors';

/**
 * Tus kuchlari: bitta rangning yetti darajasi.
 *
 * NEGA BITTA RANG: ilgari bu yerda yetti xil TUS bor edi - ko'k,
 * yashil, sariq, pushti, binafsha, to'q sariq. Ro'yxatda o'nlab qator
 * bo'lgani uchun ekran svetaforga aylanardi va ko'z nimaga qarashni
 * bilmasdi. Ustiga ular qarz qizili va haq yashili bilan aralashib,
 * ma'noli rangni bezakdan ajratib bo'lmay qolgandi.
 *
 * Farq esa YO'QOLMAYDI: har ism o'z kuchini oladi, ya'ni qatorlar
 * baribir bir-biridan ajralib turadi - faqat endi bitta oilada.
 */
const TINTS = [0.10, 0.14, 0.18, 0.22, 0.26, 0.30, 0.34];

export interface AvatarColor {
  bg: string;
  fg: string;
}

export const getInitials = (name: string): string => {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

/** Ismdan barqaror indeks: bir xil ism doim bir xil tusni oladi. */
const hashOf = (seed: string): number => {
  let hash = 0;
  for (let i = 0; i < (seed || '').length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return hash;
};

/**
 * Ismga mos tus.
 *
 * Rang MAVZUDAN keladi, shuning uchun foydalanuvchi ilova rangini
 * almashtirsa, belgilar ham ergashadi - ilgari ular qat'iy yozilgan
 * va tanlovdan qat'i nazar o'sha-o'sha qolardi.
 */
export const pickAvatarColor = (seed: string, colors: ColorTokens): AvatarColor => ({
  bg: withAlpha(colors.primary, TINTS[hashOf(seed) % TINTS.length]),
  fg: colors.primary,
});
