import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Modal from '../../../shared/ui/AppModal';
import Input from '../../../shared/ui/Input';
import Button from '../../../shared/ui/Button';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import { modalCardLayout } from '../../../shared/ui/modalLayout';
import { useKeyboardInset } from '../../../shared/lib/useKeyboardInset';
import { formatMoney } from '../../../shared/lib/money';
import { formatDateInputValue, isValidDateInput } from '../../../shared/lib/date';
import { useRequestRental } from '../hooks/useRentals';
import { currentTimeString, formatTimeInputValue, isValidTimeInput, todayString } from '../model/rentalMath';
import { perPeriodLabel, periodLabel } from '../model/rentalLabels';
import { freeQuantity } from '../model/rentalStock';
import type { RentalItemResponseDTO } from '../types/rentalItem';

interface RentalRequestModalProps {
  /** Ijara beruvchi biznes. */
  businessId: string;
  /** Qaysi buyum so'ralmoqda. null = oyna yopiq. */
  item: RentalItemResponseDTO | null;
  onClose: () => void;
}

/**
 * MIJOZ tomonidan yoziladigan ijara: "men shu do'kondan shuni oldim".
 *
 * Egasining formasidan ATAYLAB sodda: mijoz tanlaydigan narsa faqat
 * NECHTA va QANCHA MUDDATGA. Narx ombordagi narx bo'yicha olinadi —
 * chegirma egasining ishi va uni mijoz o'zi yozib qo'ya olmaydi.
 *
 * Yozuv do'konning daftariga tushadi, lekin TASDIQ KUTIB turadi va
 * ombordan hech narsa band qilmaydi: ombor birovning mulki.
 */
const RentalRequestModal: React.FC<RentalRequestModalProps> = ({ businessId, item, onClose }) => {
  const theme = useAppTheme();
  const { colors } = theme;
  const keyboardInset = useKeyboardInset();
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const requestMutation = useRequestRental();

  const [quantity, setQuantity] = useState('1');
  const [startDate, setStartDate] = useState(todayString());
  const [startTime, setStartTime] = useState(currentTimeString());
  const [duration, setDuration] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!item) return;
    setQuantity('1');
    setStartDate(todayString());
    setStartTime(currentTimeString());
    setDuration('');
    setNote('');
    setError('');
  }, [item]);

  const hourly = item?.period === 'HOUR';
  const free = item ? freeQuantity(item) : 0;

  const handleSubmit = useCallback(() => {
    if (!item) return;
    setError('');

    const count = Number(quantity.replace(',', '.'));
    if (!Number.isFinite(count) || count <= 0) return setError(t('rentals.errQuantity'));
    // Bo'shidan ko'p so'rash ma'nosiz: server ham tasdiqlash paytida rad etadi.
    if (count > free) return setError(t('rentals.errNotEnough', { count: String(free) }));

    const length = Number(duration);
    if (!Number.isFinite(length) || length < 1) return setError(t('rentals.errDays'));
    if (!isValidDateInput(startDate)) return setError(t('rentals.errStartDate'));
    if (hourly && !isValidTimeInput(startTime)) return setError(t('rentals.errTime'));

    requestMutation.mutate(
      {
        businessId,
        lines: [{ rentalItemId: item.id, quantity: count }],
        startDate,
        ...(hourly ? { startTime } : {}),
        duration: Math.floor(length),
        note: note.trim() || undefined,
      },
      { onSuccess: onClose, onError: (err) => setError((err as Error).message) },
    );
  }, [item, quantity, free, duration, startDate, startTime, hourly, note, businessId, requestMutation, onClose, t]);

  if (!item) return null;

  const total = Number(quantity.replace(',', '.')) * Number(duration) * item.price;
  const showTotal = Number.isFinite(total) && total > 0;

  return (
    <Modal transparent visible={Boolean(item)} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: theme.spacing.lg + keyboardInset }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <Text style={styles.title} accessibilityRole="header" numberOfLines={2}>
              {t('rentals.requestTitle', { item: item.name })}
            </Text>

            <View style={styles.priceRow}>
              <Ionicons name="pricetag-outline" size={15} color={colors.textSecondary} />
              <Text style={styles.priceText}>
                {`${formatMoney(item.price, item.currency)} ${perPeriodLabel(t, item.period)}`}
                {' · '}
                {t('rentals.freeCount', { count: String(free) })}
              </Text>
            </View>

            <View style={styles.pairRow}>
              <Input
                label={t('rentals.fieldQuantity')}
                value={quantity}
                onChangeText={(value) => setQuantity(value.replace(/[^\d.]/g, '').slice(0, 7))}
                keyboardType="decimal-pad"
                containerStyle={styles.pairItem}
              />
              <Input
                label={periodLabel(t, item.period)}
                value={duration}
                onChangeText={(value) => setDuration(value.replace(/\D/g, '').slice(0, 4))}
                keyboardType="number-pad"
                containerStyle={styles.pairItem}
              />
            </View>

            <Input
              label={t('rentals.fieldStartDate')}
              value={startDate}
              onChangeText={(value) => setStartDate(formatDateInputValue(value))}
              keyboardType="number-pad"
              placeholder="2026-10-13"
            />

            {hourly ? (
              <Input
                label={t('rentals.fieldStartTime')}
                value={startTime}
                onChangeText={(value) => setStartTime(formatTimeInputValue(value))}
                keyboardType="number-pad"
                placeholder="14:00"
              />
            ) : null}

            <Input label={t('rentals.fieldNote')} value={note} onChangeText={setNote} />

            {showTotal ? (
              <View style={styles.preview}>
                <Text style={styles.previewTotal}>{formatMoney(total, item.currency)}</Text>
                <Text style={styles.previewHint}>{t('rentals.requestHint')}</Text>
              </View>
            ) : (
              <Text style={styles.note}>{t('rentals.requestHint')}</Text>
            )}

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <View style={styles.actions}>
              <Button
                title={t('common.cancel')}
                variant="secondary"
                onPress={onClose}
                style={styles.actionBtn}
              />
              <Button
                title={t('rentals.requestSubmit')}
                onPress={handleSubmit}
                loading={requestMutation.isPending}
                style={styles.actionBtn}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const createStyles = ({ colors, spacing, radius, typography, glass }: ThemeValue) =>
  StyleSheet.create({
    backdrop: { flex: 1, ...glass.scrim },
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
    title: {
      ...typography.heading2,
      fontSize: 18,
      color: colors.textPrimary,
    },
    priceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    priceText: {
      ...typography.caption,
      fontSize: 12,
      color: colors.textSecondary,
      flexShrink: 1,
    },
    pairRow: {
      flexDirection: 'row',
      gap: spacing.xs,
    },
    pairItem: { flex: 1 },
    preview: {
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.md,
      padding: spacing.sm,
      gap: 2,
    },
    previewTotal: {
      ...typography.body,
      fontSize: 17,
      fontWeight: '800',
      color: colors.textPrimary,
      fontVariant: ['tabular-nums'],
    },
    previewHint: {
      ...typography.caption,
      fontSize: 12,
      color: colors.textSecondary,
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
    actions: {
      flexDirection: 'row',
      gap: spacing.xs,
    },
    actionBtn: { flex: 1 },
  });

export default RentalRequestModal;
