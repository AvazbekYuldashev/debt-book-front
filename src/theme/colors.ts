export interface ColorTokens {
  gray50: string;
  gray100: string;
  primary: string;
  primaryPressed: string;
  primarySoft: string;
  secondary: string;
  secondaryPressed: string;
  outline: string;
  background: string;
  surface: string;
  surfaceMuted: string;
  textPrimary: string;
  textSecondary: string;
  textOnPrimary: string;
  textOnSecondary: string;
  // primary fon USTIDAGI yumshoq overlay (badge/chip) — textOnPrimary bilan uyg'un.
  onPrimarySoft: string;
  border: string;
  danger: string;
  dangerMuted: string;
  success: string;
  warning: string;
  overlay: string;
  // Moliyaviy balans semantikasi: "haq/kredit" (musbat) va "qarz" (manfiy).
  // Brand 'primary' dan ATAYIN ajratilgan — ma'no boshqacha bo'lsa mustaqil o'zgaradi.
  positive: string;
  positiveSoft: string;
  negative: string;
  negativeSoft: string;
}

export const lightColors: ColorTokens = {
  gray50: '#F8FAFC',
  gray100: '#F1F5F9',
  primary: '#0D9488',
  primaryPressed: '#0F766E',
  primarySoft: '#CCFBF1',
  secondary: '#F59E0B',
  secondaryPressed: '#D97706',
  outline: '#CBD5E1',
  background: '#F1F5F9',
  surface: '#FFFFFF',
  surfaceMuted: '#F1F5F9',
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  textOnPrimary: '#FFFFFF',
  textOnSecondary: '#FFFFFF',
  onPrimarySoft: 'rgba(255, 255, 255, 0.22)',
  border: '#E2E8F0',
  danger: '#EF4444',
  dangerMuted: '#FEF2F2',
  success: '#10B981',
  warning: '#F59E0B',
  overlay: 'rgba(15, 23, 42, 0.45)',
  positive: '#0D9488',
  positiveSoft: '#CCFBF1',
  negative: '#EF4444',
  negativeSoft: '#FEF2F2',
};

export const darkColors: ColorTokens = {
  gray50: '#1E293B',
  gray100: '#273247',
  primary: '#2DD4BF',
  primaryPressed: '#14B8A6',
  primarySoft: '#134E4A',
  secondary: '#FBBF24',
  secondaryPressed: '#F59E0B',
  outline: '#334155',
  background: '#0B1120',
  surface: '#162032',
  surfaceMuted: '#1E293B',
  textPrimary: '#E2E8F0',
  textSecondary: '#94A3B8',
  textOnPrimary: '#06241F',
  textOnSecondary: '#3A2A06',
  onPrimarySoft: 'rgba(6, 36, 31, 0.22)',
  border: '#2A3A52',
  danger: '#F87171',
  dangerMuted: '#3A2121',
  success: '#34D399',
  warning: '#FBBF24',
  overlay: 'rgba(2, 6, 23, 0.70)',
  positive: '#2DD4BF',
  positiveSoft: '#134E4A',
  negative: '#F87171',
  negativeSoft: '#3A2121',
};
