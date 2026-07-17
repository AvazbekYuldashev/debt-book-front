import React, { useMemo } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import { formatMoney } from '../../../shared/lib/money';
import { normalizeCurrency } from '../../../shared/lib/currency';
import { formatPhoneDisplay } from '../../../shared/lib/phone';
import { formatDateLong, MappedTransaction } from '../model/transactionMapping';

interface TransactionDetailModalProps {
  tx: MappedTransaction | null;
  // Biznes tranzaksiyasida amalni bajargan xodim telefoni (bo'lmasa bo'sh).
  performerPhone: string;
  onClose: () => void;
}

/**
 * Tanlangan tranzaksiyaning to'liq tafsilotlari (tur, summa, sana, xodim, izoh).
 * Summa har doim o'z valyutasida — kursga o'girish yo'q.
 */
const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  tx,
  performerPhone,
  onClose,
}) => {
  const theme = useAppTheme();
  const { colors } = theme;
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const isCredit = tx?.kind === 'credit';
  const amountColor = isCredit ? colors.positive : colors.negative;

  return (
    <Modal visible={Boolean(tx)} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('contact.txDetail')}</Text>
            <Pressable
              style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={t('common.cancel')}
              hitSlop={6}
            >
              <Ionicons name="close" size={18} color={colors.textPrimary} />
            </Pressable>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>{t('contact.type')}</Text>
            <Text style={[styles.value, { color: amountColor }]}>
              {isCredit ? t('contact.creditGiven') : t('contact.debtTaken')}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>{t('contact.amount')}</Text>
            <View style={styles.amountWrap}>
              <Text style={[styles.value, { color: amountColor }]}>
                {tx ? formatMoney(tx.amount, normalizeCurrency(tx.currency)) : '--'}
              </Text>
            </View>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>{t('contact.date')}</Text>
            <Text style={styles.valueMuted}>{tx ? formatDateLong(tx.createdDate) : '--'}</Text>
          </View>

          {performerPhone ? (
            <View style={styles.row}>
              <Text style={styles.label}>{t('contact.employee')}</Text>
              <Text style={styles.valueMuted}>{formatPhoneDisplay(performerPhone)}</Text>
            </View>
          ) : null}

          <View style={styles.descriptionBox}>
            <Text style={styles.label}>{t('contact.comment')}</Text>
            <Text style={styles.description}>{tx?.description?.trim() || t('contact.noComment')}</Text>
          </View>
        </View>
      </View>
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
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.md,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.sm,
    },
    title: {
      ...typography.heading2,
      fontSize: 18,
      color: colors.textPrimary,
    },
    closeBtn: {
      width: 28,
      height: 28,
      borderRadius: radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceMuted,
    },
    pressed: {
      opacity: 0.6,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.xs,
    },
    label: {
      ...typography.bodySmall,
      color: colors.textSecondary,
    },
    amountWrap: {
      alignItems: 'flex-end',
    },
    value: {
      ...typography.bodySmall,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    valueMuted: {
      ...typography.bodySmall,
      fontWeight: '500',
      color: colors.textPrimary,
    },
    descriptionBox: {
      marginTop: spacing.xxs,
      padding: spacing.sm,
      borderRadius: radius.md,
      backgroundColor: colors.surfaceMuted,
    },
    description: {
      ...typography.bodySmall,
      marginTop: spacing.xxs,
      color: colors.textPrimary,
    },
  });

export default TransactionDetailModal;
