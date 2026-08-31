import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Input from '../../../shared/ui/Input';
import Button from '../../../shared/ui/Button';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import { formatGapAmount, formatGapAmountInput, parseGapAmountInput } from '../model/gapFormat';
import { GapTransferDTO, GapUnit, toAmount } from '../types/gap';

export type GapPaymentAction = 'give' | 'take';

interface GapPaymentActionModalProps {
  visible: boolean;
  action: GapPaymentAction;
  /** Amal tegishli bo'lgan to'lov yozuvi. */
  payment: GapTransferDTO | null;
  /** Ekranda ochilgan a'zo — pul aynan u bilan almashinadi. */
  memberName: string;
  unit: GapUnit;
  loading?: boolean;
  error?: string | null;
  onClose: () => void;
  /** 'give' da miqdor uzatiladi, 'take' da tasdiq bo'lgani uchun null. */
  onSubmit: (amount: number | null) => void;
}

/**
 * "Berdim" / "Oldim" oynasi.
 *
 * Berishda miqdor tahrirlanadi — a'zo badaldan kam berishi mumkin va guruh
 * buni o'z qoidasi bo'yicha yuritadi (TZ 10.1). Olishda esa miqdor
 * o'zgartirilmaydi: qabul qiluvchi faqat tasdiqlaydi, aks holda ikki tomonlama
 * tasdiqning ma'nosi qolmasdi (TZ 09).
 */
const GapPaymentActionModal: React.FC<GapPaymentActionModalProps> = ({
  visible,
  action,
  payment,
  memberName,
  unit,
  loading,
  error,
  onClose,
  onSubmit,
}) => {
  const theme = useAppTheme();
  const { colors } = theme;
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const isGive = action === 'give';
  const [amount, setAmount] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (visible && payment) {
      setAmount(formatGapAmountInput(String(toAmount(payment.amount))));
      setLocalError(null);
    }
  }, [visible, payment]);

  const handleSubmit = useCallback(() => {
    if (!isGive) {
      onSubmit(null);
      return;
    }
    const parsed = parseGapAmountInput(amount);
    if (!parsed) {
      setLocalError(t('gap.errAmount'));
      return;
    }
    setLocalError(null);
    onSubmit(parsed);
  }, [isGive, amount, onSubmit, t]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={styles.card} onPress={() => {}}>
            <View style={styles.header}>
              <Text style={styles.title}>{isGive ? t('gap.giveTitle') : t('gap.takeTitle')}</Text>
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel={t('common.cancel')}
                style={styles.close}
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            {payment ? (
              <Text style={styles.subtitle} numberOfLines={2}>
                {memberName}
                {payment.periodNumber != null
                  ? ` · ${t('gap.periodShort', { period: String(payment.periodNumber) })}`
                  : ''}
              </Text>
            ) : null}

            {isGive ? (
              <>
                <Input
                  label={`${t('gap.fieldAmount')} (${unit.label})`}
                  value={amount}
                  onChangeText={(text) => setAmount(formatGapAmountInput(text))}
                  keyboardType="decimal-pad"
                />
                <Text style={styles.hint}>{t('gap.giveHint')}</Text>
              </>
            ) : (
              <View style={styles.confirmBox}>
                <Text style={styles.confirmAmount}>
                  {formatGapAmount(toAmount(payment?.amount), unit)}
                </Text>
                <Text style={styles.hint}>{t('gap.takeHint')}</Text>
              </View>
            )}

            {localError || error ? (
              <Text style={styles.error}>{localError ?? error}</Text>
            ) : null}

            <View style={styles.actions}>
              <View style={styles.actionCell}>
                <Button title={t('common.cancel')} variant="outline" onPress={onClose} />
              </View>
              <View style={styles.actionCell}>
                <Button
                  title={isGive ? t('gap.give') : t('gap.take')}
                  onPress={handleSubmit}
                  loading={loading}
                />
              </View>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
};

const createStyles = ({ colors, spacing, radius, typography }: ThemeValue) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'center',
      padding: spacing.md,
    },
    card: {
      backgroundColor: colors.background,
      borderRadius: radius.xl,
      padding: spacing.md,
      gap: spacing.sm,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    title: {
      ...typography.body,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    subtitle: {
      ...typography.caption,
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: -spacing.xs,
    },
    close: {
      padding: 4,
    },
    hint: {
      ...typography.caption,
      fontSize: 11,
      color: colors.textSecondary,
    },
    confirmBox: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.md,
      alignItems: 'center',
      gap: spacing.xxs,
    },
    confirmAmount: {
      ...typography.heading2,
      fontSize: 22,
      color: colors.positive,
      fontVariant: ['tabular-nums'],
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
    actionCell: {
      flex: 1,
    },
  });

export default GapPaymentActionModal;
