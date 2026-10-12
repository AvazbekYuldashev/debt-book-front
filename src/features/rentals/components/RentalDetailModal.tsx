import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Modal from '../../../shared/ui/AppModal';
import Input from '../../../shared/ui/Input';
import Button from '../../../shared/ui/Button';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import { modalCardLayout } from '../../../shared/ui/modalLayout';
import { useKeyboardInset } from '../../../shared/lib/useKeyboardInset';
import { formatAmountInput, formatMoney, parseAmountInput } from '../../../shared/lib/money';
import { formatDateInputValue, isValidDateInput } from '../../../shared/lib/date';
import { confirmAction } from '../../../shared/lib/confirm';
import { useDeleteRental, usePayRental, useReturnRental } from '../hooks/useRentals';
import {
  accruedAmount,
  billedDays,
  overdueDays,
  rentalStatus,
  todayString,
  unpaidAmount,
} from '../model/rentalMath';
import { toAmount, type RentalResponseDTO } from '../types/rental';

interface RentalDetailModalProps {
  rental: RentalResponseDTO | null;
  onClose: () => void;
  /** Tahrirlash formasini ochish — forma ota-ekranda turadi. */
  onEdit: (rental: RentalResponseDTO) => void;
}

type Pane = 'info' | 'return' | 'payment';

/**
 * Bitta ijaraning kartasi va ikki amali.
 *
 * Buyumning qaytishi va pulning kelishi ALOHIDA tugma: hayotda ular bir
 * paytda bo'lmaydi — buyum qaytib, puli bir hafta keyin ham berilishi
 * mumkin. Bitta "yopish" tugmasi bo'lsa dastur ikkisini bir vaqtda
 * bo'ldi deb yozishga majbur qilardi, ya'ni yolg'on tarix.
 *
 * Amal tanlanganda forma AYNI KARTA ichida ochiladi (`Pane`): ustiga
 * yana bir modal qalashtirish telefonda orqaga qaytishni chalkashtiradi.
 */
const RentalDetailModal: React.FC<RentalDetailModalProps> = ({ rental, onClose, onEdit }) => {
  const theme = useAppTheme();
  const { colors } = theme;
  const keyboardInset = useKeyboardInset();
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const returnMutation = useReturnRental();
  const payMutation = usePayRental();
  const deleteMutation = useDeleteRental();

  const [pane, setPane] = useState<Pane>('info');
  const [returnDate, setReturnDate] = useState(todayString());
  const [payAmount, setPayAmount] = useState('');
  const [error, setError] = useState('');

  const unpaid = rental ? unpaidAmount(rental) : 0;

  /**
   * Oyna yangi yozuv bilan ochilganda doim ma'lumot ko'rinishidan boshlanadi.
   *
   * Qoldiq effekt ICHIDA hisoblanadi, tashqaridan bog'lanmaydi: aks holda
   * yarim tunda kun almashib qoldiq o'zgarganda effekt qaytadan ishlab,
   * odamning yozib qo'ygan summasini ustidan o'chirardi.
   */
  useEffect(() => {
    if (!rental) return;
    setPane('info');
    setError('');
    setReturnDate(todayString());
    // To'lov maydoni QOLDIQ bilan to'ldiriladi: ko'p holatda odam qolganini
    // to'liq beradi va hech narsa yozmasdan tasdiqlaydi.
    const remaining = unpaidAmount(rental);
    setPayAmount(remaining > 0 ? formatAmountInput(String(remaining)) : '');
  }, [rental]);

  const handleReturn = useCallback(() => {
    if (!rental) return;
    setError('');
    if (!isValidDateInput(returnDate)) return setError(t('rentals.errReturnDate'));
    // Buyum berilishidan OLDIN qaytarilgan bo'lishi mumkin emas.
    if (returnDate < rental.startDate) return setError(t('rentals.errReturnBeforeStart'));

    returnMutation.mutate(
      { id: rental.id, dto: { returnedDate: returnDate } },
      { onSuccess: onClose, onError: (err) => setError((err as Error).message) },
    );
  }, [rental, returnDate, returnMutation, onClose, t]);

  const handlePay = useCallback(() => {
    if (!rental) return;
    setError('');
    const amount = parseAmountInput(payAmount);
    if (!amount) return setError(t('rentals.errPayAmount'));

    payMutation.mutate(
      { id: rental.id, dto: { amount, date: todayString() } },
      { onSuccess: onClose, onError: (err) => setError((err as Error).message) },
    );
  }, [rental, payAmount, payMutation, onClose, t]);

  const handleDelete = useCallback(() => {
    if (!rental) return;
    confirmAction(t('rentals.deleteConfirm', { item: rental.itemName }), () => {
      deleteMutation.mutate(rental.id, {
        onSuccess: onClose,
        onError: (err) => setError((err as Error).message),
      });
    });
  }, [rental, deleteMutation, onClose, t]);

  if (!rental) return null;

  const status = rentalStatus(rental);
  const days = billedDays(rental);
  const late = overdueDays(rental);
  const accrued = accruedAmount(rental);
  const paid = toAmount(rental.paidAmount);
  const statusTone =
    status === 'OVERDUE' ? colors.negative : status === 'RETURNED' ? colors.textSecondary : colors.positive;

  return (
    <Modal transparent visible={Boolean(rental)} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: theme.spacing.lg + keyboardInset },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <Text style={styles.title} accessibilityRole="header" numberOfLines={2}>
              {rental.itemName}
              {rental.quantity > 1 ? ` × ${rental.quantity}` : ''}
            </Text>

            <View style={[styles.statusChip, { backgroundColor: `${statusTone}1A` }]}>
              <Text style={[styles.statusText, { color: statusTone }]}>
                {status === 'RETURNED'
                  ? t('rentals.returnedOn', { date: rental.returnedDate ?? '' })
                  : late > 0
                    ? t('rentals.lateByDays', { count: String(late) })
                    : t('rentals.dueOn', { date: rental.dueDate })}
              </Text>
            </View>

            {/* ---- Hisob ---- */}
            <View style={styles.rows}>
              <DetailRow label={t('rentals.fieldClient')} value={rental.clientName} styles={styles} />
              <DetailRow
                label={t('rentals.fieldDailyPrice')}
                value={formatMoney(toAmount(rental.dailyPrice), rental.currency)}
                styles={styles}
              />
              <DetailRow
                label={t('rentals.billedDays')}
                value={t('rentals.dayCount', { count: String(days) })}
                styles={styles}
              />
              <DetailRow label={t('rentals.fieldStartDate')} value={rental.startDate} styles={styles} />
              <DetailRow label={t('rentals.dueDate')} value={rental.dueDate} styles={styles} />
              <DetailRow
                label={t('rentals.accrued')}
                value={formatMoney(accrued, rental.currency)}
                styles={styles}
                strong
              />
              <DetailRow
                label={t('rentals.paid')}
                value={formatMoney(paid, rental.currency)}
                styles={styles}
              />
              <DetailRow
                label={unpaid >= 0 ? t('rentals.unpaid') : t('rentals.advance')}
                value={formatMoney(Math.abs(unpaid), rental.currency)}
                styles={styles}
                strong
                tone={unpaid > 0 ? colors.negative : colors.positive}
              />
              {rental.note ? (
                <DetailRow label={t('rentals.fieldNote')} value={rental.note} styles={styles} />
              ) : null}
            </View>

            {/* ---- Amallar ---- */}
            {pane === 'info' ? (
              <View style={styles.actionsColumn}>
                {status !== 'RETURNED' ? (
                  <Button title={t('rentals.markReturned')} onPress={() => setPane('return')} />
                ) : null}
                {unpaid > 0 ? (
                  <Button
                    title={t('rentals.takePayment')}
                    variant="secondary"
                    onPress={() => setPane('payment')}
                  />
                ) : null}
                <View style={styles.actionsRow}>
                  <Button
                    title={t('common.edit')}
                    variant="secondary"
                    onPress={() => onEdit(rental)}
                    style={styles.actionBtn}
                  />
                  <Button
                    title={t('common.delete')}
                    variant="secondary"
                    onPress={handleDelete}
                    loading={deleteMutation.isPending}
                    style={styles.actionBtn}
                  />
                </View>
                <Button title={t('common.close')} variant="secondary" onPress={onClose} />
              </View>
            ) : null}

            {pane === 'return' ? (
              <View style={styles.pane}>
                <Input
                  label={t('rentals.returnDate')}
                  value={returnDate}
                  onChangeText={(value) => setReturnDate(formatDateInputValue(value))}
                  keyboardType="number-pad"
                  placeholder="2026-10-12"
                />
                <Text style={styles.note}>{t('rentals.returnHint')}</Text>
                <View style={styles.actionsRow}>
                  <Button
                    title={t('common.cancel')}
                    variant="secondary"
                    onPress={() => setPane('info')}
                    style={styles.actionBtn}
                  />
                  <Button
                    title={t('rentals.markReturned')}
                    onPress={handleReturn}
                    loading={returnMutation.isPending}
                    style={styles.actionBtn}
                  />
                </View>
              </View>
            ) : null}

            {pane === 'payment' ? (
              <View style={styles.pane}>
                <Input
                  label={t('rentals.payAmount')}
                  value={payAmount}
                  onChangeText={(value) => setPayAmount(formatAmountInput(value))}
                  keyboardType="decimal-pad"
                />
                <Text style={styles.note}>{t('rentals.payHint')}</Text>
                <View style={styles.actionsRow}>
                  <Button
                    title={t('common.cancel')}
                    variant="secondary"
                    onPress={() => setPane('info')}
                    style={styles.actionBtn}
                  />
                  <Button
                    title={t('rentals.takePayment')}
                    onPress={handlePay}
                    loading={payMutation.isPending}
                    style={styles.actionBtn}
                  />
                </View>
              </View>
            ) : null}

            {error ? <Text style={styles.error}>{error}</Text> : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

interface DetailRowProps {
  label: string;
  value: string;
  styles: ReturnType<typeof createStyles>;
  strong?: boolean;
  tone?: string;
}

const DetailRow: React.FC<DetailRowProps> = ({ label, value, styles, strong, tone }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel} numberOfLines={1}>
      {label}
    </Text>
    <Text
      style={[styles.detailValue, strong && styles.detailValueStrong, tone ? { color: tone } : null]}
      numberOfLines={2}
    >
      {value}
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
      paddingTop: spacing.lg,
      paddingBottom: spacing.lg,
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
    statusChip: {
      alignSelf: 'flex-start',
      paddingVertical: 3,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.pill,
    },
    statusText: {
      ...typography.caption,
      fontSize: 12,
      fontWeight: '700',
    },
    rows: {
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.md,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
    },
    detailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
      paddingVertical: 5,
    },
    detailLabel: {
      ...typography.caption,
      fontSize: 12,
      color: colors.textSecondary,
      flexShrink: 1,
    },
    detailValue: {
      ...typography.caption,
      fontSize: 13,
      fontWeight: '600',
      color: colors.textPrimary,
      textAlign: 'right',
      flexShrink: 1,
      fontVariant: ['tabular-nums'],
    },
    detailValueStrong: {
      fontSize: 15,
      fontWeight: '800',
    },
    pane: {
      gap: spacing.sm,
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
  });

export default RentalDetailModal;
