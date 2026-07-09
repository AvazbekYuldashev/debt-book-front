import React, { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../theme';
import type { ThemeValue } from '../../theme/ThemeProvider';
import { useI18n } from '../../i18n';
import { formatMoney } from '../../utils/money';
import type { Currency } from '../../types/money';

interface BalanceSummaryProps {
  totalDebt: number;
  totalCredit: number;
  currency: Currency;
}

/**
 * Umumiy qarz/haq balansini ikki plitada ko'rsatadigan xulosa kartasi.
 * Faqat prezentatsion — barcha hisob-kitob yuqorida (ekran) qilinadi.
 */
const BalanceSummary: React.FC<BalanceSummaryProps> = ({ totalDebt, totalCredit, currency }) => {
  const theme = useAppTheme();
  const { colors } = theme;
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.card}>
      <View style={styles.tile}>
        <View style={[styles.icon, { backgroundColor: colors.negativeSoft }]}>
          <Ionicons name="arrow-down" size={18} color={colors.negative} />
        </View>
        <View style={styles.textWrap}>
          <Text style={styles.label}>{t('debts.currentDebt')}</Text>
          <Text
            style={[styles.value, { color: colors.negative }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
          >
            {formatMoney(totalDebt, currency)}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.tile}>
        <View style={[styles.icon, { backgroundColor: colors.positiveSoft }]}>
          <Ionicons name="arrow-up" size={18} color={colors.positive} />
        </View>
        <View style={styles.textWrap}>
          <Text style={styles.label}>{t('debts.currentCredit')}</Text>
          <Text
            style={[styles.value, { color: colors.positive }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
          >
            {formatMoney(totalCredit, currency)}
          </Text>
        </View>
      </View>
    </View>
  );
};

const createStyles = ({ colors, spacing, radius, typography }: ThemeValue) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      padding: spacing.md,
      marginBottom: spacing.xs,
      marginHorizontal: spacing.md,
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 20,
      elevation: 6,
    },
    tile: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    icon: {
      width: 38,
      height: 38,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    textWrap: {
      flex: 1,
    },
    label: {
      ...typography.caption,
      color: colors.textSecondary,
      marginBottom: spacing.xxs,
    },
    value: {
      ...typography.button,
      fontWeight: '800',
      letterSpacing: -0.3,
      flexShrink: 1,
    },
    divider: {
      width: 1,
      alignSelf: 'stretch',
      backgroundColor: colors.border,
      marginHorizontal: spacing.sm,
    },
  });

export default memo(BalanceSummary);
