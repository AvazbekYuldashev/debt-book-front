import React, { useMemo } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import { formatPhoneDisplay } from '../../../shared/lib/phone';
import Button from '../../../shared/ui/Button';
import { modalCardLayout } from '../../../shared/ui/modalLayout';
import { formatGapAmount, formatGapDate } from '../model/gapFormat';
import { splitLegacyCalcNote } from '../../../shared/lib/calcNote';
import { GapTransferDTO, toAmount, unitOf } from '../types/gap';

interface GapTransferDetailModalProps {
  transfer: GapTransferDTO | null;
  /** Yozuvning MEN uchun yo'nalishi — ro'yxatdagi rang bilan bir xil. */
  direction: 'in' | 'out';
  /** Tasdiqlash so'rovi ketyapti — tugma bloklanadi. */
  confirming?: boolean;
  error?: string | null;
  onConfirm: (transfer: GapTransferDTO) => void;
  onClose: () => void;
}

/**
 * Tanlangan oldi-berdining to'liq tafsilotlari — Qarzlar bo'limidagi
 * tranzaksiya modali bilan bir xil ko'rinishda.
 *
 * Ro'yxat qatoriga hamma narsa sig'maydi: telefon, to'liq izoh va tasdiq
 * holati faqat shu yerda ko'rinadi. Miqdor yozuvning O'Z birligida —
 * hech qanday aylantirish yo'q.
 *
 * Tasdiqlash ham shu yerda: ilgari qatorga bosishning o'zi yozuvni
 * tasdiqlab yuborardi va tasodifiy tegib ketish ortga qaytmas edi. Endi
 * avval tafsilot ochiladi, tasdiq esa alohida tugma bilan beriladi.
 */
const GapTransferDetailModal: React.FC<GapTransferDetailModalProps> = ({
  transfer,
  direction,
  confirming = false,
  error,
  onConfirm,
  onClose,
}) => {
  const theme = useAppTheme();
  const { colors } = theme;
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // Ro'yxatdagi bilan bir xil mantiq: olganim qizil, berganim yashil.
  const isIn = direction === 'in';
  const amountColor = isIn ? colors.negative : colors.positive;

  // Gap'da backend ustuni hali yo'q — ifoda faqat ESKI yozuvlarda,
  // izoh ichida uchraydi. Yangilarida `expression` null bo'ladi.
  const { note, expression } = splitLegacyCalcNote(transfer?.note);
  const phone = transfer?.counterpartyPhone?.trim();

  return (
    <Modal visible={Boolean(transfer)} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('gap.transferDetail')}</Text>
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
            <Text style={styles.label}>{t('gap.detailType')}</Text>
            <Text style={[styles.value, { color: amountColor }]}>
              {isIn ? t('gap.take') : t('gap.give')}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>{t('gap.detailAmount')}</Text>
            <Text style={[styles.value, { color: amountColor }]}>
              {transfer ? formatGapAmount(toAmount(transfer.amount), unitOf(transfer)) : '--'}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>{t('gap.detailDate')}</Text>
            <Text style={styles.valueMuted}>{formatGapDate(transfer?.date)}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>{t('gap.detailCounterparty')}</Text>
            <Text style={styles.valueMuted} numberOfLines={1}>
              {transfer?.counterpartyName ?? '—'}
            </Text>
          </View>

          {phone ? (
            <View style={styles.row}>
              <Text style={styles.label}>{t('gap.fieldMemberPhone')}</Text>
              <Text style={styles.valueMuted}>{formatPhoneDisplay(phone)}</Text>
            </View>
          ) : null}

          <View style={styles.row}>
            <Text style={styles.label}>{t('gap.detailStatus')}</Text>
            <Text
              style={[
                styles.valueMuted,
                { color: transfer?.confirmed ? colors.positive : colors.textSecondary },
              ]}
            >
              {transfer?.confirmed ? t('gap.statusConfirmed') : t('gap.statusWaiting')}
            </Text>
          </View>

          <View style={styles.descriptionBox}>
            <Text style={styles.label}>{t('gap.detailNote')}</Text>
            <Text style={styles.description}>{note || t('gap.noNote')}</Text>

            {/* Summa kalkulyatorda hisoblangan bo'lsa — qanday hisoblangani. */}
            {expression ? (
              <View style={styles.calcRow}>
                <Ionicons name="calculator-outline" size={14} color={colors.textSecondary} />
                <Text style={styles.calcExpression} numberOfLines={2}>
                  {expression}
                </Text>
              </View>
            ) : null}
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {/* Tasdiq faqat qarama-qarshi tomonda: o'zim kiritgan yozuvni
              o'zim tasdiqlay olmayman, u yerda tugma umuman chiqmaydi. */}
          {transfer?.canConfirm ? (
            <Button
              title={t('common.confirm')}
              onPress={() => onConfirm(transfer)}
              loading={confirming}
              style={styles.confirmBtn}
            />
          ) : null}
        </View>
      </View>
    </Modal>
  );
};

const createStyles = ({ colors, spacing, radius, typography, glass }: ThemeValue) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      ...glass.scrim,
      justifyContent: 'center',
      padding: spacing.md,
    },
    card: {
      ...modalCardLayout,
      ...glass.raised,
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
      gap: spacing.sm,
      marginBottom: spacing.xs,
    },
    label: {
      ...typography.bodySmall,
      color: colors.textSecondary,
    },
    value: {
      ...typography.bodySmall,
      fontWeight: '700',
      color: colors.textPrimary,
      flexShrink: 1,
      textAlign: 'right',
    },
    valueMuted: {
      ...typography.bodySmall,
      fontWeight: '500',
      color: colors.textPrimary,
      flexShrink: 1,
      textAlign: 'right',
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
    error: {
      ...typography.caption,
      color: colors.danger,
      marginTop: spacing.sm,
      textAlign: 'center',
    },
    confirmBtn: {
      marginTop: spacing.sm,
    },
  });

export default GapTransferDetailModal;
