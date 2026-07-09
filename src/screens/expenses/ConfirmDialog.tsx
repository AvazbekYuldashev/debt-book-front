import React, { useMemo } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../../theme';
import type { ThemeValue } from '../../theme/ThemeProvider';
import { useI18n } from '../../i18n';
import Button from '../../components/atoms/Button';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  loading?: boolean;
  danger?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Umumiy tasdiqlash dialogi (masalan, kategoriya o'chirish). */
const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  visible,
  title,
  message,
  confirmLabel,
  loading = false,
  danger = false,
  onCancel,
  onConfirm,
}) => {
  const theme = useAppTheme();
  const { colors } = theme;
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            <Button title={t('common.cancel')} variant="secondary" onPress={onCancel} style={styles.actionBtn} />
            <Button
              title={confirmLabel}
              onPress={onConfirm}
              loading={loading}
              style={[styles.actionBtn, danger ? { backgroundColor: colors.danger, borderWidth: 0 } : null]}
            />
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
    title: {
      ...typography.heading2,
      fontSize: 18,
      color: colors.textPrimary,
      marginBottom: spacing.xs,
    },
    message: {
      ...typography.bodySmall,
      color: colors.textSecondary,
      marginBottom: spacing.sm,
    },
    actions: {
      flexDirection: 'row',
      gap: spacing.xs,
    },
    actionBtn: {
      flex: 1,
    },
  });

export default ConfirmDialog;
