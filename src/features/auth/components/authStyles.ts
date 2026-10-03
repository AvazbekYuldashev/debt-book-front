import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useAppTheme } from '../../../shared/theme';
import { ColorTokens } from '../../../shared/theme/colors';

// Auth ekranlari uchun umumiy maydon/tugma/link stillari (theme-aware).
export const createAuthStyles = (colors: ColorTokens) => StyleSheet.create({
  field: {
    marginBottom: 18,
  },
  // Yorliq maydon USTIDA: ichidagi placeholder yozila boshlashi bilan
  // yo'qolardi va odam "bu qaysi maydon edi" deb qolardi.
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
  },
  phonePrefix: {
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: '700',
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.textPrimary,
    height: '100%',
  },
  codeInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 6,
    textAlign: 'center',
    color: colors.textPrimary,
    height: '100%',
  },
  eyeBtn: {
    paddingLeft: 8,
    paddingVertical: 6,
  },
  errorText: {
    marginTop: 2,
    marginBottom: 10,
    color: colors.danger,
    fontSize: 14,
  },
  /**
   * Maydonlar ostidagi yordamchi qator: "Meni eslab qol" va "Parolni
   * unutdingizmi" yonma-yon.
   */
  assistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
    marginBottom: 24,
  },
  link: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  /** Ekran tagidagi qator: "Hisobingiz yo'qmi? Ro'yxatdan o'ting". */
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 28,
  },
  footerText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
    textDecorationLine: 'underline',
  },
});

/** Auth ekranlari uchun theme-aware stillar hooki. */
export const useAuthStyles = () => {
  const { colors } = useAppTheme();
  return useMemo(() => createAuthStyles(colors), [colors]);
};
