import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Modal from '../../../shared/ui/AppModal';
import Button from '../../../shared/ui/Button';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import { modalCardLayout } from '../../../shared/ui/modalLayout';
import { formatMoney } from '../../../shared/lib/money';
import { formatQuantity } from '../../../shared/lib/quantity';
import { normalizeCurrency } from '../../../shared/lib/currency';
import { confirmAction } from '../../../shared/lib/confirm';
import { useDeleteRentalItem, useMyRentals } from '../hooks/useRentals';
import { remainingQuantity, unpaidAmount } from '../model/rentalMath';
import { busyQuantity, freeQuantity } from '../model/rentalStock';
import { perPeriodLabel, unitLabel } from '../model/rentalLabels';
import type { RentalResponseDTO } from '../types/rental';
import type { RentalItemResponseDTO } from '../types/rentalItem';
import RentalRow from './RentalRow';

interface RentalItemDetailModalProps {
  item: RentalItemResponseDTO | null;
  onClose: () => void;
  onEdit: (item: RentalItemResponseDTO) => void;
  /** Shu buyumni ijaraga berish — forma ota-ekranda turadi. */
  onGiveOut: (item: RentalItemResponseDTO) => void;
  /** Ro'yxatdagi ijarani ochish — karta ota-ekranda turadi. */
  onOpenRental: (rental: RentalResponseDTO) => void;
  allowWrite?: boolean;
  allowDelete?: boolean;
}

/**
 * Ombordagi bitta buyumning kartasi: nechtasi bo'sh va KIMLARDA.
 *
 * "Kimlarda" ro'yxati ijarachining eng ko'p beradigan savoliga javob:
 * 100 ta lesadan 50 tasi qaysi obyektda, kimda, qachondan beri va
 * undan qancha pul olinishi kerak. Biznes hisobida bu ro'yxat hamma
 * adminlarda bir xil ko'rinadi.
 */
const RentalItemDetailModal: React.FC<RentalItemDetailModalProps> = ({
  item,
  onClose,
  onEdit,
  onGiveOut,
  onOpenRental,
  allowWrite = true,
  allowDelete = true,
}) => {
  const theme = useAppTheme();
  const { colors } = theme;
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const deleteMutation = useDeleteRentalItem();
  const [error, setError] = useState('');

  useEffect(() => {
    setError('');
  }, [item]);

  const filter = useMemo(
    () => ({ rentalItemId: item?.id ?? '', status: 'OUT' as const }),
    [item?.id],
  );
  const holdersQuery = useMyRentals(filter, { enabled: Boolean(item) });

  // Server filtri bilan bir qatorda telefonda ham tekshiriladi: qaytib
  // bo'lgan yozuv "kimlarda" ro'yxatida turib qolmasin.
  const holders = useMemo(
    () => (holdersQuery.data?.content ?? []).filter((rental) => remainingQuantity(rental) > 0),
    [holdersQuery.data],
  );

  /** Shu buyumdan olinishi kerak bo'lgan pul — valyuta bo'yicha. */
  const toCollect = useMemo(() => {
    const sums = new Map<string, number>();
    for (const rental of holders) {
      const unpaid = unpaidAmount(rental);
      if (unpaid <= 0) continue;
      const code = normalizeCurrency(rental.currency);
      sums.set(code, (sums.get(code) ?? 0) + unpaid);
    }
    return [...sums.entries()];
  }, [holders]);

  const handleDelete = useCallback(() => {
    if (!item) return;
    if (busyQuantity(item) > 0) return setError(t('rentals.itemInUse'));
    confirmAction(t('rentals.itemDeleteConfirm', { item: item.name }), () => {
      deleteMutation.mutate(item.id, {
        onSuccess: onClose,
        onError: (err) => setError((err as Error).message),
      });
    });
  }, [item, deleteMutation, onClose, t]);

  if (!item) return null;

  const free = freeQuantity(item);
  const busy = busyQuantity(item);
  const unit = unitLabel(t, item.unit);

  return (
    <Modal transparent visible={Boolean(item)} animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <View style={styles.head}>
              <View style={styles.icon}>
                <Ionicons name="cube-outline" size={20} color={colors.primary} />
              </View>
              <View style={styles.headText}>
                <Text style={styles.title} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={styles.subtitle} numberOfLines={1}>
                  {item.category ? `${item.category} · ` : ''}
                  {formatMoney(item.price, item.currency)} / {unit} · {perPeriodLabel(t, item.period)}
                </Text>
              </View>
            </View>

            {/* ---- Uch raqam: bo'sh, band, jami ---- */}
            <View style={styles.stats}>
              <Stat label={t('rentals.stockFreeTitle')} value={formatQuantity(free)} tone={free > 0 ? colors.positive : colors.negative} styles={styles} />
              <View style={styles.statDivider} />
              <Stat label={t('rentals.stockBusyTitle')} value={formatQuantity(busy)} tone={colors.textPrimary} styles={styles} />
              <View style={styles.statDivider} />
              <Stat label={t('rentals.stockTotalTitle')} value={formatQuantity(item.totalQuantity)} tone={colors.textSecondary} styles={styles} />
            </View>

            {toCollect.length > 0 ? (
              <View style={styles.collect}>
                <Text style={styles.collectLabel}>{t('rentals.itemToCollect')}</Text>
                {toCollect.map(([code, amount]) => (
                  <Text key={code} style={styles.collectValue} numberOfLines={1}>
                    {formatMoney(amount, normalizeCurrency(code))}
                  </Text>
                ))}
              </View>
            ) : null}

            {/* ---- Kimlarda ---- */}
            <Text style={styles.sectionTitle}>{t('rentals.whoHas')}</Text>
            {holdersQuery.isLoading ? (
              <ActivityIndicator color={colors.primary} />
            ) : holders.length === 0 ? (
              <Text style={styles.note}>{t('rentals.nobodyHas')}</Text>
            ) : (
              <View style={styles.holders}>
                {holders.map((rental, index) => (
                  <RentalRow
                    key={rental.id}
                    item={rental}
                    isLast={index === holders.length - 1}
                    onPress={onOpenRental}
                  />
                ))}
              </View>
            )}

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <View style={styles.actionsColumn}>
              {allowWrite && free > 0 ? (
                <Button title={t('rentals.giveOut')} onPress={() => onGiveOut(item)} />
              ) : null}
              <View style={styles.actionsRow}>
                {allowWrite ? (
                  <Button
                    title={t('common.edit')}
                    variant="secondary"
                    onPress={() => onEdit(item)}
                    style={styles.actionBtn}
                  />
                ) : null}
                {allowDelete ? (
                  <Button
                    title={t('common.delete')}
                    variant="secondary"
                    onPress={handleDelete}
                    loading={deleteMutation.isPending}
                    style={styles.actionBtn}
                  />
                ) : null}
              </View>
              <Button title={t('common.close')} variant="secondary" onPress={onClose} />
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

interface StatProps {
  label: string;
  value: string;
  tone: string;
  styles: ReturnType<typeof createStyles>;
}

const Stat: React.FC<StatProps> = ({ label, value, tone, styles }) => (
  <View style={styles.stat}>
    <Text style={[styles.statValue, { color: tone }]} numberOfLines={1}>
      {value}
    </Text>
    <Text style={styles.statLabel} numberOfLines={1}>
      {label}
    </Text>
  </View>
);

const createStyles = ({ colors, spacing, radius, typography, glass }: ThemeValue) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      ...glass.scrim,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.lg,
    },
    card: {
      ...modalCardLayout,
      ...glass.modal,
      borderRadius: radius.lg,
      padding: spacing.md,
      gap: spacing.sm,
    },
    head: {
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
      backgroundColor: colors.primarySoft,
    },
    headText: {
      flex: 1,
      minWidth: 0,
      gap: 1,
    },
    title: {
      ...typography.heading2,
      fontSize: 18,
      color: colors.textPrimary,
    },
    subtitle: {
      ...typography.caption,
      fontSize: 12,
      color: colors.textSecondary,
      fontVariant: ['tabular-nums'],
    },
    stats: {
      flexDirection: 'row',
      alignItems: 'stretch',
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.md,
      paddingVertical: spacing.sm,
    },
    stat: {
      flex: 1,
      alignItems: 'center',
      gap: 1,
    },
    statDivider: {
      width: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
    },
    statValue: {
      ...typography.amount,
      fontSize: 22,
      lineHeight: 28,
      fontVariant: ['tabular-nums'],
    },
    statLabel: {
      ...typography.caption,
      fontSize: 11,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    collect: {
      backgroundColor: colors.negativeSoft,
      borderRadius: radius.md,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
      gap: 1,
    },
    collectLabel: {
      ...typography.caption,
      fontSize: 11,
      fontWeight: '700',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    collectValue: {
      ...typography.body,
      fontSize: 16,
      fontWeight: '800',
      color: colors.negative,
      fontVariant: ['tabular-nums'],
    },
    sectionTitle: {
      ...typography.label,
      color: colors.textSecondary,
    },
    holders: {
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.md,
      overflow: 'hidden',
    },
    note: {
      ...typography.caption,
      fontSize: 12,
      color: colors.textSecondary,
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.md,
      padding: spacing.sm,
    },
    error: {
      ...typography.caption,
      color: colors.danger,
      textAlign: 'center',
    },
    actionsColumn: {
      gap: spacing.xs,
    },
    actionsRow: {
      flexDirection: 'row',
      gap: spacing.xs,
    },
    actionBtn: {
      flex: 1,
    },
  });

export default RentalItemDetailModal;
