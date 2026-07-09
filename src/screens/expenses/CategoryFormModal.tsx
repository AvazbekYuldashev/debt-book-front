import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../../theme';
import type { ThemeValue } from '../../theme/ThemeProvider';
import { useI18n } from '../../i18n';
import Input from '../../components/atoms/Input';
import Button from '../../components/atoms/Button';

type Mode = 'create' | 'edit';

interface CategoryFormModalProps {
  visible: boolean;
  mode: Mode;
  initialName?: string;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (name: string) => Promise<boolean>;
}

/** Kategoriya qo'shish/tahrirlash modali (nom validatsiyasi inline). */
const CategoryFormModal: React.FC<CategoryFormModalProps> = ({
  visible,
  mode,
  initialName,
  submitting,
  onClose,
  onSubmit,
}) => {
  const theme = useAppTheme();
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [name, setName] = useState('');
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (!visible) return;
    setName(mode === 'edit' ? initialName ?? '' : '');
    setLocalError('');
  }, [visible, mode, initialName]);

  const handleSubmit = useCallback(async () => {
    if (!name.trim()) {
      setLocalError(t('expenses.enterCategoryName'));
      return;
    }
    setLocalError('');
    if (await onSubmit(name.trim())) onClose();
  }, [name, t, onSubmit, onClose]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <Text style={styles.title}>
              {mode === 'create' ? t('expenses.addCategory') : t('expenses.editCategory')}
            </Text>
            <Input
              label={t('expenses.categoryName')}
              value={name}
              onChangeText={setName}
              placeholder={t('expenses.categoryPlaceholder')}
              autoFocus
            />
            {localError ? <Text style={styles.error}>{localError}</Text> : null}
            <View style={styles.actions}>
              <Button title={t('common.cancel')} variant="secondary" onPress={onClose} style={styles.actionBtn} />
              <Button
                title={mode === 'create' ? t('common.add') : t('common.save')}
                onPress={handleSubmit}
                loading={submitting}
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
      marginBottom: spacing.xs,
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

export default CategoryFormModal;
