import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Input from '../../../shared/ui/Input';
import Button from '../../../shared/ui/Button';
import ChipSelector from '../../../shared/ui/ChipSelector';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import { formatGapAmountInput, parseGapAmountInput } from '../model/gapFormat';
import { GAP_UNIT_PRESETS, customUnit } from '../model/gapUnits';
import { GapTransferDirection, GapUnit } from '../types/gap';

const CUSTOM = '__custom__';

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
 * Ikkalasi ham bitta yozuvni yaratadi, faqat yo'nalish teskari. Miqdorni va
 * O'LCHOV BIRLIGINI har safar foydalanuvchi tanlaydi: bitta odam bilan so'm,
 * dollar va kg go'sht bo'yicha bir vaqtda hisob yuritish mumkin. Guruhning
 * birligi shunchaki oldindan tanlab qo'yiladi.
 *
 * Yozuvni kiritgan odam uni o'zi tasdiqlamaydi: tasdiq qarama-qarshi tomonda
 * qoladi, shuning uchun oyna pastida shu haqda eslatma turadi.
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
  const { colors } = theme;
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const isGive = direction === 'GIVE';
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [unitCode, setUnitCode] = useState<string>(unit.code);
  const [customLabel, setCustomLabel] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setAmount('');
      setNote('');
      // Guruhning birligi odatiy tanlov, lekin ro'yxatda bo'lmasa
      // (masalan qo'lda kiritilgan) uni "boshqa" sifatida ko'rsatamiz.
      const known = GAP_UNIT_PRESETS.some((preset) => preset.code === unit.code);
      setUnitCode(known ? unit.code : CUSTOM);
      setCustomLabel(known ? '' : unit.label ?? '');
      setLocalError(null);
    }
  }, [visible, unit]);

  const unitOptions = useMemo(
    () => [
      ...GAP_UNIT_PRESETS.map((preset) => ({ value: preset.code, label: preset.label })),
      { value: CUSTOM, label: t('gap.unitCustom') },
    ],
    [t]
  );

  const selectedUnit: GapUnit | null = useMemo(() => {
    if (unitCode === CUSTOM) {
      return customLabel.trim() ? customUnit(customLabel) : null;
    }
    return GAP_UNIT_PRESETS.find((preset) => preset.code === unitCode) ?? null;
  }, [unitCode, customLabel]);

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

            <Text style={styles.subtitle} numberOfLines={2}>
              {memberName}
            </Text>

            <Input
              label={`${t('gap.fieldAmount')}${selectedUnit ? ` (${selectedUnit.label})` : ''}`}
              value={amount}
              onChangeText={(text) => setAmount(formatGapAmountInput(text))}
              keyboardType="decimal-pad"
            />

            <ChipSelector
              label={t('gap.fieldUnit')}
              options={unitOptions}
              value={unitCode}
              onChange={setUnitCode}
              layout="wrap"
            />
            {unitCode === CUSTOM ? (
              <Input
                label={t('gap.fieldUnitCustom')}
                value={customLabel}
                onChangeText={setCustomLabel}
                placeholder="qop, bosh, quti ..."
              />
            ) : null}

            <Input
              label={t('gap.fieldNote')}
              value={note}
              onChangeText={setNote}
            />
            <Text style={styles.hint}>{t('gap.transferConfirmHint')}</Text>

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
                  style={isGive ? styles.giveBtn : styles.takeBtn}
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
    giveBtn: {
      backgroundColor: colors.primary,
      borderWidth: 0,
    },
    takeBtn: {
      backgroundColor: colors.danger,
      borderWidth: 0,
    },
  });

export default GapTransferFormModal;
