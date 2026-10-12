import React, { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import { formatMoney } from '../../../shared/lib/money';
import { FOCUS_INSET } from '../../../shared/ui/focusRing';
import type { RentalResponseDTO } from '../types/rental';
import { accruedAmount, billedDays, overdueDays, rentalStatus, unpaidAmount } from '../model/rentalMath';

interface RentalRowProps {
  item: RentalResponseDTO;
  isLast?: boolean;
  /**
   * Mijoz ismi qatorda ko'rinsinmi.
   *
   * MIJOZ EKRANIDA o'chiriladi: u yerda butun sahifa bitta odamniki va
   * ismni har qatorda takrorlash qatorni behuda to'ldirardi.
   */
  showClient?: boolean;
  onPress?: (item: RentalResponseDTO) => void;
}

/**
 * Ro'yxatdagi bitta ijara.
 *
 * Chapda buyum nomi va kimdaligi; o'ngda yig'ilgan summa va uning ostida
 * hali olinmagan qoldiq. Eng muhim raqam — QOLDIQ, shuning uchun u
 * rangli: olinmagan bo'lsa qizil, hisob yopilgan bo'lsa ko'rinmaydi.
 *
 * Kun soni va kechikish bitta qatorda belgi ("chip") bo'lib turadi:
 * odam ro'yxatni ko'zdan kechirganda avval KECHIKKANLARNI qidiradi.
 */
const RentalRow: React.FC<RentalRowProps> = ({ item, isLast = false, showClient = true, onPress }) => {
  const theme = useAppTheme();
  const { colors } = theme;
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // Summa VAQTGA bog'liq, shuning uchun har render'da qaytadan hisoblanadi.
  const status = rentalStatus(item);
  const days = billedDays(item);
  const late = overdueDays(item);
  const accrued = accruedAmount(item);
  const unpaid = unpaidAmount(item);
  const quantity = item.quantity > 1 ? ` × ${item.quantity}` : '';

  const statusTone =
    status === 'OVERDUE' ? colors.negative : status === 'RETURNED' ? colors.textSecondary : colors.positive;

  return (
    <Pressable
      onPress={() => onPress?.(item)}
      style={({ pressed }) => [styles.row, !isLast && styles.rowBorder, pressed && styles.rowPressed]}
      accessibilityRole="button"
      accessibilityLabel={`${item.itemName} — ${item.clientName}`}
      dataSet={FOCUS_INSET}
    >
      {/* Holat ustuni: ro'yxatni ko'zdan kechirishda rang birinchi ko'rinadi. */}
      <View style={[styles.statusBar, { backgroundColor: statusTone }]} />

      <View style={styles.main}>
        <Text style={styles.name} numberOfLines={1}>
          {item.itemName}
          {quantity}
        </Text>

        <View style={styles.metaRow}>
          {showClient ? (
            <View style={styles.meta}>
              <Ionicons name="person-outline" size={13} color={colors.textSecondary} />
              <Text style={styles.metaText} numberOfLines={1}>
                {item.clientName}
              </Text>
            </View>
          ) : null}

          <View style={styles.meta}>
            <Ionicons name="time-outline" size={13} color={colors.textSecondary} />
            <Text style={styles.metaText}>{t('rentals.dayCount', { count: String(days) })}</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          {status === 'RETURNED' ? (
            <View style={[styles.badge, { backgroundColor: colors.surfaceMuted }]}>
              <Text style={[styles.badgeText, { color: colors.textSecondary }]}>
                {t('rentals.returned')}
              </Text>
            </View>
          ) : late > 0 ? (
            <View style={[styles.badge, { backgroundColor: colors.negativeSoft }]}>
              <Text style={[styles.badgeText, { color: colors.negative }]}>
                {t('rentals.lateByDays', { count: String(late) })}
              </Text>
            </View>
          ) : (
            <View style={[styles.badge, { backgroundColor: colors.positiveSoft }]}>
              <Text style={[styles.badgeText, { color: colors.positive }]}>
                {t('rentals.dueOn', { date: item.dueDate })}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.side}>
        <Text style={styles.accrued} numberOfLines={1}>
          {formatMoney(accrued, item.currency)}
        </Text>
        {/* Qoldiq nolga teng bo'lsa qator chizilmaydi: hisob toza bo'lsa
            ekranda "0" turishi odamni ortiqcha o'ylantiradi. */}
        {unpaid !== 0 ? (
          <Text
            style={[styles.unpaid, { color: unpaid > 0 ? colors.negative : colors.positive }]}
            numberOfLines={1}
          >
            {unpaid > 0
              ? t('rentals.unpaidShort', { value: formatMoney(unpaid, item.currency) })
              : t('rentals.advanceShort', { value: formatMoney(Math.abs(unpaid), item.currency) })}
          </Text>
        ) : (
          <Text style={styles.settled} numberOfLines={1}>
            {t('rentals.settled')}
          </Text>
        )}
      </View>
    </Pressable>
  );
};

const createStyles = ({ colors, spacing, radius, typography }: ThemeValue) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    rowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    rowPressed: {
      backgroundColor: colors.surfaceMuted,
    },
    statusBar: {
      width: 3,
      alignSelf: 'stretch',
      borderRadius: radius.pill,
    },
    main: {
      flex: 1,
      minWidth: 0,
      gap: spacing.xxs,
    },
    side: {
      alignItems: 'flex-end',
      maxWidth: '42%',
      flexShrink: 1,
      gap: 1,
    },
    name: {
      ...typography.body,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      flexWrap: 'wrap',
    },
    meta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      flexShrink: 1,
      minWidth: 0,
    },
    metaText: {
      ...typography.caption,
      fontSize: 12,
      color: colors.textSecondary,
      flexShrink: 1,
    },
    badge: {
      paddingVertical: 2,
      paddingHorizontal: spacing.xs,
      borderRadius: radius.pill,
    },
    badgeText: {
      ...typography.caption,
      fontSize: 11,
      fontWeight: '700',
    },
    accrued: {
      ...typography.body,
      fontSize: 15,
      fontWeight: '800',
      color: colors.textPrimary,
      fontVariant: ['tabular-nums'],
    },
    unpaid: {
      ...typography.caption,
      fontSize: 12,
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
    },
    settled: {
      ...typography.caption,
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
  });

export default memo(RentalRow);
