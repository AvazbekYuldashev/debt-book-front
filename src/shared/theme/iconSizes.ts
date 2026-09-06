// ============================================================
//  Ikonka o'lchamlari — yagona shkala (16 / 18 / 20 / 24 / 28).
//  Qoida: bir ekranda 2 tadan ortiq o'lcham ishlatilmaydi.
//  Stroke qalinligi bir xil bo'lishi uchun BARCHA ikonka Ionicons
//  ("-outline" varianti) oilasidan olinadi.
// ============================================================
export const iconSize = {
  xs: 16,
  sm: 18,
  md: 20,
  lg: 24,
  xl: 28,
} as const;

export type IconSizeTokens = typeof iconSize;
