import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import Input from '../../../shared/ui/Input';
import Button from '../../../shared/ui/Button';

interface ExpenseFormModalProps {
  visible: boolean;
  categoryName: string;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (amount: number, description: string) => Promise<boolean>;
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
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (!visible) return;
    setAmount('');
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
    if (await onSubmit(normalizedAmount, description.trim())) onClose();
  }, [amount, description, t, onSubmit, onClose]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <Text style={styles.title}>{t('expenses.addExpense')}</Text>
            <Text style={styles.hint}>
              {t('expenses.categoryColon')}: {categoryName || t('expenses.notSelected')}
            </Text>
            <Input
              label={t('expenses.amountLabel')}
              value={amount}
              onChangeText={(value) => setAmount(formatAmountInput(value))}
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
