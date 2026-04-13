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
  border: string;
  danger: string;
  dangerMuted: string;
  success: string;
  warning: string;
  overlay: string;
}

export const lightColors: ColorTokens = {
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  primary: '#4F46E5',
  primaryPressed: '#4338CA',
  primarySoft: '#EEF2FF',
  secondary: '#0EA5A4',
  secondaryPressed: '#0F8B89',
  outline: '#D1D5DB',
  background: '#F9FAFB',
  surface: '#F4F5F7',
  surfaceMuted: '#EEF0F3',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textOnPrimary: '#FFFFFF',
  textOnSecondary: '#FFFFFF',
  border: '#E5E7EB',
  danger: '#E26D6D',
  dangerMuted: '#FDF2F2',
  success: '#69B992',
  warning: '#E8B86D',
  overlay: 'rgba(17, 24, 39, 0.42)',
};

export const darkColors: ColorTokens = {
  gray50: '#1C2538',
  gray100: '#273247',
  primary: '#818CF8',
  primaryPressed: '#6366F1',
  primarySoft: '#312E81',
  secondary: '#2DD4BF',
  secondaryPressed: '#14B8A6',
  outline: '#334155',
  background: '#0B1020',
  surface: '#131A2A',
  surfaceMuted: '#1C2538',
  textPrimary: '#E5E7EB',
  textSecondary: '#9CA3AF',
  textOnPrimary: '#F8FAFC',
  textOnSecondary: '#062A27',
  border: '#334155',
  danger: '#F08A8A',
  dangerMuted: '#3A2121',
  success: '#86D3AE',
  warning: '#F2C685',
  overlay: 'rgba(2, 6, 23, 0.68)',
};
