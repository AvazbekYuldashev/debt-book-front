import React, { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import { formatMoney } from '../../../shared/lib/money';
import { formatQuantity } from '../../../shared/lib/quantity';
import { FOCUS_INSET } from '../../../shared/ui/focusRing';
import { busyQuantity, busyShare, freeQuantity, isFullyBusy } from '../model/rentalStock';
import { perPeriodLabel, unitLabel } from '../model/rentalLabels';
import type { RentalItemResponseDTO } from '../types/rentalItem';

interface RentalItemRowProps {
  item: RentalItemResponseDTO;
  isLast?: boolean;
  onPress?: (item: RentalItemResponseDTO) => void;
}

/**
 * Ombordagi bitta buyum.
 *
 * Ijarachi omborga bitta savol bilan qaraydi: "nechtasi BO'SH, bera
 * olamanmi?". Shuning uchun o'ngdagi katta raqam — BO'SH soni (tugagan
 * bo'lsa qizil), chapda esa chiziq: qanchasi mijozlarda ekani ko'z
 * bilan bir qarashda bilinadi. Aniq raqamlar chiziq ostida.
 */
const RentalItemRow: React.FC<RentalItemRowProps> = ({ item, isLast = false, onPress }) => {
  const theme = useAppTheme();
  const { colors } = theme;
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const free = freeQuantity(item);
  const busy = busyQuantity(item);
  const share = busyShare(item);
  const full = isFullyBusy(item);
  const unit = unitLabel(t, item.unit);

  return (
    <Pressable
      onPress={() => onPress?.(item)}
      style={({ pressed }) => [styles.row, !isLast && styles.rowBorder, pressed && styles.rowPressed]}
      accessibilityRole="button"
      accessibilityLabel={t('rentals.stockA11y', {
        item: item.name,
        free: formatQuantity(free),
        total: formatQuantity(item.totalQuantity),
      })}
      dataSet={FOCUS_INSET}
    >
      <View style={styles.main}>
        <Text style={styles.name} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.price} numberOfLines={1}>
          {formatMoney(item.price, item.currency)} / {unit} · {perPeriodLabel(t, item.period)}
        </Text>

        {/* Band ulushi. Rang holatga qarab: hammasi band — qizil. */}
        <View style={styles.track}>
          <View
            style={[
              styles.fill,
              { width: `${Math.round(share * 100)}%`, backgroundColor: full ? colors.negative : colors.secondary },
            ]}
          />
        </View>
        <Text style={styles.stockLine} numberOfLines={1}>
          {t('rentals.stockLine', {
            busy: formatQuantity(busy),
            total: formatQuantity(item.totalQuantity),
            unit,
          })}
        </Text>
      </View>

      <View style={styles.side}>
        <Text style={[styles.free, { color: full ? colors.negative : colors.positive }]} numberOfLines={1}>
          {formatQuantity(free)}
        </Text>
        <Text style={styles.freeLabel} numberOfLines={1}>
          {full ? t('rentals.stockAllBusy') : t('rentals.stockFree')}
        </Text>
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
    main: {
      flex: 1,
      minWidth: 0,
      gap: 3,
    },
    name: {
      ...typography.body,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    price: {
      ...typography.caption,
      fontSize: 12,
      color: colors.textSecondary,
      fontVariant: ['tabular-nums'],
    },
    track: {
      height: 6,
      borderRadius: radius.pill,
      backgroundColor: colors.positiveSoft,
      overflow: 'hidden',
      marginTop: 2,
    },
    fill: {
      height: '100%',
      borderRadius: radius.pill,
    },
    stockLine: {
      ...typography.caption,
      fontSize: 11,
      color: colors.textSecondary,
      fontVariant: ['tabular-nums'],
    },
    side: {
      alignItems: 'flex-end',
      minWidth: 56,
      gap: 0,
    },
    free: {
      ...typography.body,
      fontSize: 22,
      fontWeight: '800',
      fontVariant: ['tabular-nums'],
    },
    freeLabel: {
      ...typography.caption,
      fontSize: 11,
      fontWeight: '600',
      color: colors.textSecondary,
    },
  });

export default memo(RentalItemRow);
