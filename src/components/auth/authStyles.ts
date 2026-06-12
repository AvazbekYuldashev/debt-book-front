import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useAppTheme } from '../../theme';
import { ColorTokens } from '../../theme/colors';

// Auth ekranlari uchun umumiy maydon/tugma/link stillari (theme-aware).
export const createAuthStyles = (colors: ColorTokens) => StyleSheet.create({
  field: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 7,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
  },
  phonePrefix: {
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: '700',
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
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
  button: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 3,
  },
  buttonText: {
    color: colors.textOnPrimary,
    fontWeight: '700',
    fontSize: 16,
  },
  errorText: {
    marginTop: 2,
    marginBottom: 8,
    color: colors.danger,
    fontSize: 13,
    textAlign: 'center',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 22,
  },
  link: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  linkCenter: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 16,
  },
});

/** Auth ekranlari uchun theme-aware stillar hooki. */
export const useAuthStyles = () => {
  const { colors } = useAppTheme();
  return useMemo(() => createAuthStyles(colors), [colors]);
};
