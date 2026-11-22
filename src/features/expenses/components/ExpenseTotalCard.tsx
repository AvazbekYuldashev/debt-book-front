import React, { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import IconButton from '../../../shared/ui/IconButton';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import { formatMoney } from '../../../shared/lib/money';

interface ExpenseTotalCardProps {
  label: string;
  amount: number;
  onMenuPress: () => void;
}

// Summa uzun bo'lganda shriftni kichraytiramiz. `adjustsFontSizeToFit` web'da
// (react-native-web) ishlamaydi — shuning uchun matn uzunligiga qarab qo'lda
// moslaymiz. Katta summalar ("5 000 000 012 333 so'm") ham to'liq ko'rinadi.
//
// Yuqori chegara 27: Qarzlar va Gap ekranlaridagi hero raqami bilan bir xil.
const valueFontSize = (length: number): number => {
  if (length <= 16) return 27;
  if (length <= 22) return 22;
  if (length <= 28) return 18;
  return 15;
};

/**
 * Tanlangan oraliqdagi umumiy xarajat summasi + filtr menyusi tugmasi.
 *
 * Ko'rinishi Qarzlar va Gap to'yona ekranlaridagi balans kartasi
 * (`BalanceHero`) bilan bir xil: rangli sirt, chapda ikonka va izoh,
 * ostida yirik raqam. Ilgari bu shaffof shisha karta edi va uchta bosh
 * ekran uch xil boshlanardi.
 *
 * NUSXA OLINMADI, chunki `BalanceHero` qarz/haq uchun: unda yo'nalish
 * belgisi, valyuta jamlash va kurs izohi bor. Xarajatda yo'nalish degan
 * narsa yo'q — bitta yakuniy son. Shuning uchun bu yerda faqat
 * O'LCHAMLAR takrorlanadi.
 *
 * Rang `primary`: yashil/qizil yo'nalishni bildiradi va xarajatga
 * noto'g'ri ma'no berardi.
 */
const ExpenseTotalCard: React.FC<ExpenseTotalCardProps> = ({ label, amount, onMenuPress }) => {
  const theme = useAppTheme();
  const { colors } = theme;
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const valueText = formatMoney(amount);

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.labelRow}>
          <Ionicons name="wallet-outline" size={17} color={colors.textOnPrimary} />
          <Text style={styles.label} numberOfLines={1}>
            {label}
          </Text>
        </View>
        <IconButton
          name="ellipsis-horizontal"
          onPress={onMenuPress}
          accessibilityLabel={t('expenses.chooseFilter')}
          color={colors.textOnPrimary}
        />
      </View>

      <Text style={[styles.value, { fontSize: valueFontSize(valueText.length) }]} numberOfLines={1}>
        {valueText}
      </Text>
    </View>
  );
};

// O'lchamlar `BalanceHero` dagi bilan BIR XIL: radius, chekinish,
// yorliq va raqam o'lchami. Uchta bosh ekran bir xil boshlanishi kerak.
const createStyles = ({ colors, spacing, radius, typography, shadows }: ThemeValue) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.primary,
      borderRadius: radius.xxl,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      paddingBottom: spacing.md,
      marginHorizontal: spacing.md,
      marginBottom: spacing.sm,
      ...shadows.card,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    labelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      flexShrink: 1,
      minWidth: 0,
    },
    label: {
      ...typography.body,
      fontSize: 15,
      color: colors.textOnPrimary,
      opacity: 0.9,
      flexShrink: 1,
    },
    value: {
      ...typography.heading1,
      fontWeight: '800',
      color: colors.textOnPrimary,
      marginTop: spacing.xxs,
      fontVariant: ['tabular-nums'],
    },
  });

export default memo(ExpenseTotalCard);
