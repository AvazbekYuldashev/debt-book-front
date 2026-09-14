import React, { useMemo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import { formatMoney } from '../../../shared/lib/money';
import { normalizeCurrency } from '../../../shared/lib/currency';
import { formatPhoneDisplay } from '../../../shared/lib/phone';
import { formatDateLong, MappedTransaction } from '../model/transactionMapping';
import { modalCardLayout } from '../../../shared/ui/modalLayout';
import { resolveCalcNote } from '../../../shared/lib/calcNote';
import { formatQuantity } from '../../../shared/lib/quantity';

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

  // Ifoda alohida ustunda keladi; eski yozuvlarda izoh ichida bo'lishi mumkin.
  const { note, expression } = resolveCalcNote(tx?.description, tx?.calcNote);

  // Chek — oldi-berdi mahsulot buyurtmasidan tuzilgan bo'lsagina.
  const items = tx?.items ?? [];
  const currency = normalizeCurrency(tx?.currency);

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

          {items.length > 0 ? (
            <View style={styles.receipt}>
              <Text style={styles.receiptTitle}>{t('contact.receipt')}</Text>
              {/* Uzun savat modalni ekrandan chiqarib yubormasin. */}
              <ScrollView style={styles.receiptScroll} showsVerticalScrollIndicator={false}>
                {items.map((item) => (
                  <View key={item.id} style={styles.receiptRow}>
                    <View style={styles.receiptInfo}>
                      <Text style={styles.receiptName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={styles.receiptMeta} numberOfLines={1}>
                        {formatQuantity(item.quantity)}
                        {item.unit ? ` ${t(`products.unit.${item.unit}`)}` : ''}
                        {' × '}
                        {formatMoney(item.unitPrice, normalizeCurrency(item.currency))}
                      </Text>
                    </View>
                    <Text style={styles.receiptTotal} numberOfLines={1}>
                      {formatMoney(item.lineTotal, normalizeCurrency(item.currency))}
                    </Text>
                  </View>
                ))}
              </ScrollView>
              <View style={styles.receiptSum}>
                <Text style={styles.receiptSumLabel}>{t('contact.receiptTotal')}</Text>
                <Text style={[styles.receiptSumValue, { color: amountColor }]}>
                  {tx ? formatMoney(tx.amount, currency) : '--'}
                </Text>
              </View>
            </View>
          ) : null}

          <View style={styles.descriptionBox}>
            <Text style={styles.label}>{t('contact.comment')}</Text>
            <Text style={styles.description}>{note || t('contact.noComment')}</Text>

            {/* Summa kalkulyatorda hisoblangan bo'lsa — qanday hisoblangani.
                Faqat shu yerda: qatorga sig'maydi va har doim ham kerak emas. */}
            {expression ? (
              <View style={styles.calcRow}>
                <Ionicons name="calculator-outline" size={14} color={colors.textSecondary} />
                <Text style={styles.calcExpression} numberOfLines={2}>
                  {expression}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = ({ colors, spacing, radius, typography, glass }: ThemeValue) =>
  StyleSheet.create({
    receipt: {
      marginTop: spacing.xs,
      marginBottom: spacing.xs,
      padding: spacing.sm,
      borderRadius: radius.md,
      backgroundColor: colors.surfaceMuted,
    },
    receiptTitle: {
      ...typography.label,
      marginBottom: spacing.xs,
      color: colors.textSecondary,
    },
    // Balandlik cheklovi: 5-6 qatordan keyin ro'yxat o'zi aylanadi, modal
    // esa ekrandan chiqib ketmaydi.
    receiptScroll: {
      maxHeight: 190,
    },
    receiptRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.xs,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    receiptInfo: {
      flex: 1,
    },
    receiptName: {
      ...typography.bodySmall,
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    receiptMeta: {
      ...typography.caption,
      marginTop: spacing.xxs / 2,
      fontSize: 12,
      color: colors.textSecondary,
    },
    receiptTotal: {
      ...typography.bodySmall,
      fontSize: 14,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    receiptSum: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: spacing.xs,
    },
    receiptSumLabel: {
      ...typography.label,
      color: colors.textSecondary,
    },
    receiptSumValue: {
      ...typography.body,
      fontWeight: '800',
    },
    backdrop: {
      flex: 1,
      ...glass.scrim,
      justifyContent: 'center',
      padding: spacing.md,
    },
    card: {
      ...modalCardLayout,
      ...glass.modal,
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
    calcRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xxs,
      marginTop: spacing.xs,
      paddingTop: spacing.xs,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    calcExpression: {
      ...typography.caption,
      flexShrink: 1,
      color: colors.textSecondary,
      fontVariant: ['tabular-nums'],
    },
  });

export default TransactionDetailModal;
