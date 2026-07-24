/**
 * Auth formalarida klaviatura hisob-kitoblari.
 *
 * Android'da edge-to-edge yoqilganda ilova oynasi klaviatura ochilganda
 * kichraymaydi — klaviatura kontent ustiga chiqadi. Shuning uchun yopilgan
 * balandlikni va fokusdagi maydonni ko'rinadigan zonaga surish ofsetini
 * o'zimiz hisoblaymiz.
 */

/** Fokusdagi maydon bilan klaviatura tepasi orasida qoladigan bo'shliq (px). */
export const FOCUS_GAP = 24;

/**
 * Klaviatura ekranning pastki qismini qanchaga yopganini qaytaradi.
 *
 * @param viewBottom konteyner pastki chekkasi (oyna koordinatasida)
 * @param keyboardTop klaviatura tepasi (oyna koordinatasida)
 */
export const keyboardOverlap = (viewBottom: number, keyboardTop: number): number =>
  Math.max(0, viewBottom - keyboardTop);

interface FocusScrollInput {
  /** Joriy skroll ofseti. */
  offset: number;
  /** Maydon tepasi — ScrollView oynasiga nisbatan (skroll hisobga olingan). */
  top: number;
  /** Maydon balandligi. */
  height: number;
  /** Klaviatura yopmagan ko'rinadigan balandlik. */
  visibleHeight: number;
  /** Maydon atrofidagi bo'shliq. */
  gap?: number;
}

/**
 * Fokusdagi maydonni ko'rinadigan zonaga chiqarish uchun yangi skroll ofseti.
 * Maydon allaqachon ko'rinib turgan bo'lsa — `null` (surish shart emas).
 */
export const focusScrollTarget = ({
  offset,
  top,
  height,
  visibleHeight,
  gap = FOCUS_GAP,
}: FocusScrollInput): number | null => {
  if (visibleHeight <= 0) return null;

  // Maydon pasti klaviatura (yoki oyna) ostida qolgan — pastga suramiz.
  if (top + height + gap > visibleHeight) {
    return offset + top + height + gap - visibleHeight;
  }

  // Maydon oyna tepasidan chiqib ketgan — yuqoriga suramiz.
  if (top < gap) {
    return Math.max(0, offset + top - gap);
  }

  return null;
};
