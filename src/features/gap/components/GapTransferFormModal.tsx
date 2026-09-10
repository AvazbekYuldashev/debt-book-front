import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Input from '../../../shared/ui/Input';
import Button from '../../../shared/ui/Button';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import CalculatorModal from '../../../shared/ui/CalculatorModal';
import { attachCalcExpression } from '../../../shared/lib/calcNote';
import GapUnitPicker from './GapUnitPicker';
import { formatGapAmountInput, parseGapAmountInput } from '../model/gapFormat';
import { GapTransferDirection, GapUnit } from '../types/gap';
import { modalCardLayout } from '../../../shared/ui/modalLayout';
import { useKeyboardInset } from '../../../shared/lib/useKeyboardInset';

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
  const keyboardInset = useKeyboardInset();
  const { colors } = theme;
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const isGive = direction === 'GIVE';
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  /** Summa kalkulyatorda hisoblangan bo'lsa — o'sha ifoda ("10×2+55÷99"). */
  const [calcExpression, setCalcExpression] = useState('');
  const [selectedUnit, setSelectedUnit] = useState<GapUnit | null>(unit);
  const [localError, setLocalError] = useState<string | null>(null);
  const [calcOpen, setCalcOpen] = useState(false);

  useEffect(() => {
    if (visible) {
      setAmount('');
      setNote('');
      setCalcExpression('');
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
    const stored = attachCalcExpression(note, calcExpression);
    onSubmit(parsed, stored ? stored : null, selectedUnit);
  }, [amount, note, calcExpression, selectedUnit, onSubmit, t]);

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            // Klaviatura ochilganda "markaz" uning ustidagi maydonga suriladi.
            { paddingBottom: theme.spacing.lg + keyboardInset },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <View style={styles.titleRow}>
              <Text style={styles.title} accessibilityRole="header">
                {isGive ? t('gap.giveTitle') : t('gap.takeTitle')}
              </Text>
              {/* Summani oldindan hisoblab olish uchun — ilovadan chiqmasdan. */}
              <Pressable
                onPress={() => setCalcOpen(true)}
                hitSlop={8}
                style={({ pressed }) => [styles.calcBtn, pressed && styles.calcBtnPressed]}
                accessibilityRole="button"
                accessibilityLabel={t('calc.title')}
              >
                <Ionicons name="calculator-outline" size={20} color={colors.primary} />
              </Pressable>
            </View>
            <Text style={styles.subtitle} numberOfLines={2}>
              {memberName}
            </Text>

            <Input
              label={`${t('gap.fieldAmount')}${selectedUnit ? ` (${selectedUnit.label})` : ''}`}
              value={amount}
              onChangeText={(text) => {
                setAmount(formatGapAmountInput(text));
                // Summa qo'lda o'zgartirildi — saqlangan ifoda endi unga mos emas.
                setCalcExpression('');
              }}
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

          <CalculatorModal
            visible={calcOpen}
            initialValue={amount}
            onClose={() => setCalcOpen(false)}
            onApply={(value, expression) => {
              setAmount(formatGapAmountInput(value));
              setCalcExpression(expression);
            }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const createStyles = ({ colors, spacing, radius, typography, glass }: ThemeValue) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      ...glass.scrim,
    },
    // Oyna yuqoriroqda ochilsin — klaviatura maydonlarni to'smasligi uchun.
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingHorizontal: spacing.md,
      paddingTop: spacing.lg,
      paddingBottom: spacing.lg,
    },
    card: {
      ...modalCardLayout,
      ...glass.raised,
      borderRadius: radius.lg,
      padding: spacing.md,
      gap: spacing.sm,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    title: {
      ...typography.heading2,
      fontSize: 18,
      color: colors.textPrimary,
      flexShrink: 1,
    },
    calcBtn: {
      width: 34,
      height: 34,
      borderRadius: radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primarySoft,
    },
    calcBtnPressed: {
      opacity: 0.6,
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
