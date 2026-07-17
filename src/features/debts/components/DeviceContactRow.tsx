import React, { memo, useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../../../shared/i18n';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { formatPhoneDisplay } from '../../../shared/lib/phone';
import type { DeviceContact } from '../../../shared/lib/deviceContacts';

interface DeviceContactRowProps {
  contact: DeviceContact;
  checked: boolean;
  added: boolean;
  valid: boolean;
  onToggle: (contact: DeviceContact) => void;
}

/**
 * Telefon kontakti qatori (checkbox bilan). memo — tanlov o'zgarganda faqat
 * tegishli qatorlar qayta render bo'ladi, butun ro'yxat emas.
 */
const DeviceContactRow: React.FC<DeviceContactRowProps> = ({ contact, checked, added, valid, onToggle }) => {
  const { t } = useI18n();
  const theme = useAppTheme();
  const { colors } = theme;
  const styles = useMemo(() => createStyles(theme), [theme]);

  const disabled = added || !valid;
  const handlePress = useCallback(() => onToggle(contact), [onToggle, contact]);

  return (
    <Pressable
      style={({ pressed }) => [styles.row, disabled && styles.rowDisabled, pressed && !disabled && styles.rowPressed]}
      onPress={handlePress}
      disabled={disabled}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      accessibilityLabel={contact.name}
    >
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked ? <Ionicons name="checkmark" size={14} color={colors.textOnPrimary} /> : null}
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {contact.name}
        </Text>
        <Text style={styles.phone} numberOfLines={1}>
          {formatPhoneDisplay(contact.phone) || contact.rawPhone}
        </Text>
      </View>
      {added ? (
        <Text style={styles.badgeAdded}>{t('contactPicker.alreadyAdded')}</Text>
      ) : !valid ? (
        <Text style={styles.badgeInvalid}>{t('contactPicker.invalidPhone')}</Text>
      ) : null}
    </Pressable>
  );
};

const createStyles = ({ colors, spacing, radius, typography }: ThemeValue) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.xxs,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    rowDisabled: {
      opacity: 0.5,
    },
    rowPressed: {
      opacity: 0.7,
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: radius.sm - 2,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxChecked: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    info: {
      flex: 1,
    },
    name: {
      ...typography.bodySmall,
      fontSize: 15,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    phone: {
      ...typography.label,
      fontWeight: '400',
      marginTop: 2,
      color: colors.textSecondary,
    },
    badgeAdded: {
      ...typography.caption,
      fontSize: 11,
      fontWeight: '700',
      color: colors.positive,
    },
    badgeInvalid: {
      ...typography.caption,
      fontSize: 11,
      fontWeight: '700',
      color: colors.negative,
    },
  });

export default memo(DeviceContactRow);
