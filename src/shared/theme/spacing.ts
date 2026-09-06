export interface SpacingTokens {
  xxs: number;
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
}

export const spacing: SpacingTokens = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
};

// Zamonaviy (2026) mobil UI: kartalar uchun yumshoq, katta radiuslar.
// `xxl` — asosiy sirt/karta radiusi (18–24px oralig'ining yuqori chegarasi).
export const radius = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 28,
  pill: 999,
} as const;
