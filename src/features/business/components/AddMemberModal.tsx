import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import Button from '../../../shared/ui/Button';
import { LOCAL_PHONE_DIGITS, sanitizeLocalPhone } from '../../../shared/lib/phone';
import type { BusinessMemberRole } from '../types/business';

export interface AddMemberResult {
  ok: boolean;
  message?: string;
  // true bo'lsa telefon maydoni bloklanadi (ro'yxatdan o'tmagan / tasdiqlanmagan / allaqachon a'zo).
  blocked?: boolean;
}

interface AddMemberModalProps {
  visible: boolean;
  saving: boolean;
  onClose: () => void;
  onSubmit: (phone: string, role: BusinessMemberRole) => Promise<AddMemberResult>;
}

const ROLES: BusinessMemberRole[] = ['ADMIN', 'MEMBER'];

/** Biznesga a'zo qo'shish modali (telefon + rol). Xato/blok holati inline. */
const AddMemberModal: React.FC<AddMemberModalProps> = ({ visible, saving, onClose, onSubmit }) => {
  const theme = useAppTheme();
  const { colors } = theme;
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<BusinessMemberRole>('MEMBER');
  const [formError, setFormError] = useState('');
  const [phoneBlocked, setPhoneBlocked] = useState(false);

  const phoneValid = phone.length === LOCAL_PHONE_DIGITS;
  const submitDisabled = saving || !phoneValid || phoneBlocked;

  useEffect(() => {
    if (!visible) return;
    setPhone('');
    setRole('MEMBER');
    setFormError('');
    setPhoneBlocked(false);
  }, [visible]);

  const handleClose = useCallback(() => {
    if (saving) return;
    onClose();
  }, [saving, onClose]);

  const onPhoneChange = useCallback(
    (value: string) => {
      setPhone(sanitizeLocalPhone(value));
      setPhoneBlocked(false);
      setFormError('');
    },
    []
  );

  const handleSubmit = useCallback(async () => {
    if (!phoneValid) {
      setFormError(t('members.phone9'));
      return;
    }
    const result = await onSubmit(phone, role);
    if (result.ok) {
      onClose();
      return;
    }
    setFormError(result.message || t('members.addFailed'));
    setPhoneBlocked(Boolean(result.blocked));
  }, [phoneValid, t, onSubmit, phone, role, onClose]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{t('members.add')}</Text>

          <Text style={styles.fieldLabel}>{t('members.phone')}</Text>
          <View style={styles.phoneRow}>
            <Text style={styles.phonePrefix}>+998</Text>
            <TextInput
              style={styles.phoneInput}
              placeholder="90 123 45 67"
              placeholderTextColor={colors.textSecondary}
              value={phone}
              onChangeText={onPhoneChange}
              keyboardType="number-pad"
              editable={!saving}
            />
          </View>

          <Text style={styles.fieldLabel}>{t('members.role')}</Text>
          <View style={styles.roleRow}>
            {ROLES.map((option) => {
              const active = role === option;
              return (
                <Pressable
                  key={option}
                  style={({ pressed }) => [
                    styles.roleBtn,
                    active && styles.roleBtnActive,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => setRole(option)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.roleBtnText, active && styles.roleBtnTextActive]}>{option}</Text>
                </Pressable>
              );
            })}
          </View>

          {formError ? <Text style={styles.formError}>{formError}</Text> : null}

          <View style={styles.actions}>
            <Button title={t('common.cancel')} variant="secondary" onPress={handleClose} style={styles.actionBtn} />
            <Button
              title={t('common.save')}
              onPress={handleSubmit}
              loading={saving}
              disabled={submitDisabled}
              style={styles.actionBtn}
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
      paddingHorizontal: spacing.md,
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
      marginBottom: spacing.sm,
    },
    fieldLabel: {
      ...typography.caption,
      color: colors.textSecondary,
      marginBottom: spacing.xxs + 2,
    },
    phoneRow: {
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: colors.outline,
      marginBottom: spacing.sm,
      paddingHorizontal: spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
    },
    phonePrefix: {
      ...typography.bodySmall,
      color: colors.textSecondary,
      marginRight: spacing.xs,
      fontWeight: '600',
    },
    phoneInput: {
      ...typography.bodySmall,
      flex: 1,
      paddingVertical: spacing.xs + 2,
      color: colors.textPrimary,
    },
    roleRow: {
      flexDirection: 'row',
      gap: spacing.xs,
      marginBottom: spacing.sm,
    },
    roleBtn: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.outline,
      borderRadius: radius.sm,
      minHeight: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
    roleBtnActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
    },
    roleBtnText: {
      ...typography.caption,
      color: colors.textSecondary,
      fontWeight: '700',
    },
    roleBtnTextActive: {
      color: colors.primaryPressed,
    },
    pressed: {
      opacity: 0.7,
    },
    formError: {
      ...typography.caption,
      color: colors.danger,
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

export default AddMemberModal;
