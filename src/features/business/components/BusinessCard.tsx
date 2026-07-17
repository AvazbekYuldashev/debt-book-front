import React, { memo, useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import type { BusinessDTO } from '../types/business';

interface BusinessCardProps {
  business: BusinessDTO;
  isActive: boolean;
  onOpen: (business: BusinessDTO) => void;
  onMembers: (business: BusinessDTO) => void;
}

/** Bitta biznes kartasi: nom, rol, manzil, egasi va "ochish/a'zolar" amallari. */
const BusinessCard: React.FC<BusinessCardProps> = ({ business, isActive, onOpen, onMembers }) => {
  const theme = useAppTheme();
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const handleOpen = useCallback(() => onOpen(business), [onOpen, business]);
  const handleMembers = useCallback(() => onMembers(business), [onMembers, business]);

  return (
    <View style={[styles.card, isActive && styles.cardActive]}>
      <View style={styles.top}>
        <Text style={styles.name} numberOfLines={1}>
          {business.name}
        </Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{business.currentRole}</Text>
        </View>
      </View>
      <Text style={styles.meta}>{business.address || t('business.noAddress')}</Text>
      <Text style={styles.meta}>
        {t('business.ownerLabel')}: {business.ownerName || '--'}
      </Text>

      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [styles.openBtn, pressed && styles.pressed]}
          onPress={handleOpen}
          accessibilityRole="button"
        >
          <Text style={styles.openBtnText}>{isActive ? t('business.opened') : t('business.open')}</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.membersBtn, pressed && styles.pressed]}
          onPress={handleMembers}
          accessibilityRole="button"
        >
          <Text style={styles.membersBtnText}>{t('business.members')}</Text>
        </Pressable>
      </View>
    </View>
  );
};

const createStyles = ({ colors, spacing, radius, typography }: ThemeValue) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      padding: spacing.sm,
      marginBottom: spacing.sm,
    },
    cardActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
    },
    top: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: spacing.xs,
    },
    name: {
      ...typography.body,
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
      flex: 1,
    },
    roleBadge: {
      backgroundColor: colors.primarySoft,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.xs,
      paddingVertical: spacing.xxs / 1.3,
    },
    roleText: {
      ...typography.caption,
      color: colors.primaryPressed,
      fontSize: 10,
      fontWeight: '700',
    },
    meta: {
      ...typography.caption,
      marginTop: spacing.xxs,
      color: colors.textSecondary,
    },
    actions: {
      marginTop: spacing.xs,
      flexDirection: 'row',
      gap: spacing.xs,
    },
    openBtn: {
      flex: 1,
      minHeight: 34,
      borderRadius: radius.sm,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    openBtnText: {
      ...typography.caption,
      color: colors.textOnPrimary,
      fontSize: 12,
      fontWeight: '700',
    },
    membersBtn: {
      flex: 1,
      minHeight: 34,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: colors.outline,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    membersBtnText: {
      ...typography.caption,
      color: colors.textPrimary,
      fontSize: 12,
      fontWeight: '700',
    },
    pressed: {
      opacity: 0.7,
    },
  });

export default memo(BusinessCard);
