import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import Input from '../../../shared/ui/Input';
import Button from '../../../shared/ui/Button';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import GapUnitPicker from './GapUnitPicker';
import { formatGapAmountInput, parseGapAmountInput } from '../model/gapFormat';
import { GapTransferDirection, GapUnit } from '../types/gap';

interface GapTransferFormModalProps {
  visible: boolean;
  /** GIVE — men berdim, TAKE — men oldim. */
  direction: GapTransferDirection;
  /** Ekranda ochilgan a'zo — hisob-kitob aynan u bilan. */
  memberName: string;
  /** Guruhning odatiy birligi — oynada oldindan tanlab qo'yiladi. */
  unit: GapUnit;
  loading?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (amount: number, note: string | null, unit: GapUnit) => void;
}

/**
 * "Berdim" / "Oldim" oynasi.
 *
 * Joylashuvi Qarzlar bo'limidagi "Qarz berish" oynasi bilan bir xil:
 * yuqorida sarlavha, o'rtada maydonlar, pastda "Bekor qilish" va asosiy
 * tugma yonma-yon.
 *
 * Ikkalasi ham bitta yozuvni yaratadi, faqat yo'nalish teskari. Miqdorni va
 * O'LCHOV BIRLIGINI har safar foydalanuvchi tanlaydi: bitta odam bilan so'm,
 * dollar va kg go'sht bo'yicha bir vaqtda hisob yuritish mumkin. Guruhning
 * birligi shunchaki oldindan tanlab qo'yiladi.
 *
 * Yozuvni kiritgan odam uni o'zi tasdiqlamaydi: tasdiq qarama-qarshi tomonda
 * qoladi, shuning uchun pastda shu haqda eslatma turadi.
 */
const GapTransferFormModal: React.FC<GapTransferFormModalProps> = ({
  visible,
  direction,
  memberName,
  unit,
  loading,
  error,
  onClose,
  onSubmit,
}) => {
  const theme = useAppTheme();
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const isGive = direction === 'GIVE';
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [selectedUnit, setSelectedUnit] = useState<GapUnit | null>(unit);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setAmount('');
      setNote('');
      setLocalError(null);
    }
  }, [visible]);

  const handleSubmit = useCallback(() => {
    const parsed = parseGapAmountInput(amount);
    if (!parsed) {
      setLocalError(t('gap.errAmount'));
      return;
    }
    if (!selectedUnit) {
      setLocalError(t('gap.errUnit'));
      return;
    }
    setLocalError(null);
    onSubmit(parsed, note.trim() ? note.trim() : null, selectedUnit);
  }, [amount, note, selectedUnit, onSubmit, t]);

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <Text style={styles.title} accessibilityRole="header">
              {isGive ? t('gap.giveTitle') : t('gap.takeTitle')}
            </Text>
            <Text style={styles.subtitle} numberOfLines={2}>
              {memberName}
            </Text>

            <Input
              label={`${t('gap.fieldAmount')}${selectedUnit ? ` (${selectedUnit.label})` : ''}`}
              value={amount}
              onChangeText={(text) => setAmount(formatGapAmountInput(text))}
              keyboardType="decimal-pad"
            />

            <GapUnitPicker
              value={unit}
              onChange={(next) => {
                setSelectedUnit(next);
                // Birlik tanlangach eski ogohlantirish osilib qolmasin.
                if (next) setLocalError(null);
              }}
              resetKey={visible}
            />

            <Input label={t('gap.fieldNote')} value={note} onChangeText={setNote} />
            <Text style={styles.hint}>{t('gap.transferConfirmHint')}</Text>

            {localError || error ? (
              <Text style={styles.error}>{localError ?? error}</Text>
            ) : null}

            <View style={styles.actions}>
              <Button
                title={t('common.cancel')}
                variant="secondary"
                onPress={onClose}
                style={styles.actionBtn}
              />
              <Button
                title={isGive ? t('gap.give') : t('gap.take')}
                onPress={handleSubmit}
                loading={loading}
                style={styles.actionBtn}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const createStyles = ({ colors, spacing, radius, typography }: ThemeValue) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: colors.overlay,
    },
    // Oyna yuqoriroqda ochilsin — klaviatura maydonlarni to'smasligi uchun.
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'flex-start',
      paddingHorizontal: spacing.md,
      paddingTop: spacing.lg,
      paddingBottom: spacing.lg,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.md,
      gap: spacing.sm,
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
      marginTop: -spacing.sm,
    },
    hint: {
      ...typography.caption,
      fontSize: 11,
      color: colors.textSecondary,
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
    actionBtn: {
      flex: 1,
    },
  });

export default GapTransferFormModal;
