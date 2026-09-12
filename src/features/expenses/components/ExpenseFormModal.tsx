import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import Input from '../../../shared/ui/Input';
import Button from '../../../shared/ui/Button';
import { modalCardLayout } from '../../../shared/ui/modalLayout';
import { useKeyboardInset } from '../../../shared/lib/useKeyboardInset';
import CalculatorModal from '../../../shared/ui/CalculatorModal';

interface ExpenseFormModalProps {
  visible: boolean;
  categoryName: string;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (amount: number, description: string, calcNote: string | null) => Promise<boolean>;
}

// Kiritilgan summani "12 331 323" ko'rinishida (har 3 raqamda bo'sh joy) formatlaydi.
const formatAmountInput = (raw: string): string => {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
};

/** Xarajat qo'shish modali. Summa validatsiyasi inline. */
const ExpenseFormModal: React.FC<ExpenseFormModalProps> = ({
  visible,
  categoryName,
  submitting,
  onClose,
  onSubmit,
}) => {
  const theme = useAppTheme();
  const keyboardInset = useKeyboardInset();
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [amount, setAmount] = useState('');
  const [calcOpen, setCalcOpen] = useState(false);
  /** Summa kalkulyatorda hisoblangan bo'lsa — o'sha ifoda ("10×2+55÷99"). */
  const [calcExpression, setCalcExpression] = useState('');
  const [description, setDescription] = useState('');
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (!visible) return;
    setAmount('');
    setCalcExpression('');
    setDescription('');
    setLocalError('');
  }, [visible]);

  const handleSubmit = useCallback(async () => {
    const normalizedAmount = Number(amount.replace(/\s/g, '').replace(',', '.'));
    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      setLocalError(t('expenses.amountInvalid'));
      return;
    }
    setLocalError('');
    if (await onSubmit(normalizedAmount, description.trim(), calcExpression || null)) onClose();
  }, [amount, calcExpression, description, t, onSubmit, onClose]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
              <Text style={styles.title}>{t('expenses.addExpense')}</Text>
              {/* Summani oldindan hisoblab olish uchun — ilovadan chiqmasdan. */}
              <Pressable
                onPress={() => setCalcOpen(true)}
                hitSlop={8}
                style={({ pressed }) => [styles.calcBtn, pressed && styles.calcBtnPressed]}
                accessibilityRole="button"
                accessibilityLabel={t('calc.title')}
              >
                <Ionicons name="calculator-outline" size={20} color={theme.colors.primary} />
              </Pressable>
            </View>
            <Text style={styles.hint}>
              {t('expenses.categoryColon')}: {categoryName || t('expenses.notSelected')}
            </Text>
            <Input
              label={t('expenses.amountLabel')}
              value={amount}
              onChangeText={(value) => {
                setAmount(formatAmountInput(value));
                // Summa QO'LDA o'zgartirilsa ifoda endi unga mos kelmaydi.
                setCalcExpression('');
              }}
              placeholder={t('expenses.amountExample')}
              keyboardType="numeric"
              autoFocus
            />
            <Input
              label={t('expenses.commentLabel')}
              value={description}
              onChangeText={setDescription}
              placeholder={t('expenses.commentExample')}
            />
            {localError ? <Text style={styles.error}>{localError}</Text> : null}
            <View style={styles.actions}>
              <Button title={t('common.cancel')} variant="secondary" onPress={onClose} style={styles.actionBtn} />
              <Button title={t('common.save')} onPress={handleSubmit} loading={submitting} style={styles.actionBtn} />
            </View>
          </View>

          <CalculatorModal
            visible={calcOpen}
            initialValue={amount}
            onClose={() => setCalcOpen(false)}
            onApply={(value, expression) => {
              setAmount(formatAmountInput(value));
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
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    calcBtn: {
      width: 44,
      height: 44,
      borderRadius: radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primarySoft,
    },
    calcBtnPressed: {
      opacity: 0.6,
    },
    title: {
      ...typography.heading2,
      fontSize: 18,
      color: colors.textPrimary,
      marginBottom: spacing.xxs,
    },
    hint: {
      ...typography.caption,
      color: colors.textSecondary,
      marginBottom: spacing.sm,
    },
    error: {
      ...typography.caption,
      color: colors.negative,
      marginBottom: spacing.xs,
    },
    actions: {
      flexDirection: 'row',
      gap: spacing.xs,
    },
    actionBtn: {
      flex: 1,
    },
  });

export default ExpenseFormModal;
