import React, { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../theme';
import type { ThemeValue } from '../theme/ThemeProvider';
import { formatSignedMoney } from '../lib/money';
import type { Currency } from '../lib/currency';

interface BalanceBadgeProps {
  amount: number;
  currency: Currency;
  /** Matn o'lchami — qator eniga qarab tashqaridan hisoblanadi (responsive). */
  fontSize: number;
}

/**
 * Bitta valyutadagi sof balans "pill"i.
 *
 * A11Y: ma'no FAQAT rang bilan berilmaydi — yo'nalish ikonkasi (yuqoriga/pastga)
 * va matndagi +/− belgisi ham bor. Rangni ajrata olmaydigan foydalanuvchi ham
 * qarz/haqni farqlaydi.
 */
const BalanceBadge: React.FC<BalanceBadgeProps> = ({ amount, currency, fontSize }) => {
  const theme = useAppTheme();
  const { colors, iconSize } = theme;
  const styles = useMemo(() => createStyles(theme), [theme]);

  const isCredit = amount > 0;
  const color = isCredit ? colors.positive : colors.negative;
  const background = isCredit ? colors.positiveSoft : colors.negativeSoft;

  return (
    <View style={[styles.badge, { backgroundColor: background }]}>
      <Ionicons
        name={isCredit ? 'arrow-up' : 'arrow-down'}
        size={iconSize.xs - 4}
        color={color}
      />
      <Text style={[styles.text, { color, fontSize }]} numberOfLines={1}>
        {formatSignedMoney(amount, currency)}
      </Text>
    </View>
  );
};

const createStyles = ({ spacing, radius, typography }: ThemeValue) =>
  StyleSheet.create({
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingVertical: 5,
      paddingHorizontal: spacing.xs,
      borderRadius: radius.pill,
      minWidth: 0,
      flexShrink: 1,
    },
    text: {
      ...typography.caption,
      lineHeight: 17,
      fontWeight: '800',
      letterSpacing: -0.2,
      fontVariant: ['tabular-nums'],
      flexShrink: 1,
    },
  });

export default memo(BalanceBadge);
