import React, { memo, useCallback, useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BusinessMemberRole, BusinessProfileDTO } from '../../types/business';
import { useI18n } from '../../i18n';
import { useAppTheme } from '../../theme';
import type { ThemeValue } from '../../theme/ThemeProvider';
import { formatPhoneDisplay } from '../../utils/phone';
import { formatDateTime } from '../../utils/money';

interface BusinessMemberCardProps {
  member: BusinessProfileDTO;
  /** OWNER bo'lsa o'chirish/rol o'zgartirish amallari ko'rinadi. */
  canManage: boolean;
  /** Shu a'zo ustida amal bajarilmoqda (loading holati). */
  busy: boolean;
  onRemove?: (member: BusinessProfileDTO) => void;
  onToggleRole?: (member: BusinessProfileDTO, nextRole: BusinessMemberRole) => void;
}

/** Bitta biznes a'zosi kartasi. memo — busy/ro'yxat o'zgarganda faqat tegishli karta qayta chiziladi. */
const BusinessMemberCard: React.FC<BusinessMemberCardProps> = ({
  member,
  canManage,
  busy,
  onRemove,
  onToggleRole,
}) => {
  const { t } = useI18n();
  const theme = useAppTheme();
  const { colors } = theme;
  const styles = useMemo(() => createStyles(theme), [theme]);

  const isOwner = member.role === 'OWNER';
  const nextRole: BusinessMemberRole = member.role === 'ADMIN' ? 'MEMBER' : 'ADMIN';
  const displayName = member.profileName || member.profileUsername || member.phoneNumber || '--';
  const initial = (displayName || '?').trim().charAt(0).toUpperCase();

  const roleLabel =
    member.role === 'OWNER'
      ? t('business.role.owner')
      : member.role === 'ADMIN'
        ? t('business.role.admin')
        : t('business.role.member');

  const handleToggleRole = useCallback(() => onToggleRole?.(member, nextRole), [onToggleRole, member, nextRole]);
  const handleRemove = useCallback(() => onRemove?.(member), [onRemove, member]);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <View style={styles.identity}>
          <Text style={styles.name} numberOfLines={1}>
            {displayName}
          </Text>
          <Text style={styles.phone} numberOfLines={1}>
            {formatPhoneDisplay(member.phoneNumber, '--')}
          </Text>
        </View>
        <View style={[styles.roleBadge, isOwner && styles.roleBadgeOwner]}>
          <Text style={[styles.roleBadgeText, isOwner && styles.roleBadgeTextOwner]}>{roleLabel}</Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <Ionicons name="time-outline" size={13} color={colors.textSecondary} />
        <Text style={styles.metaText}>{member.createdDate ? formatDateTime(member.createdDate) : '--'}</Text>
      </View>

      {canManage && !isOwner ? (
        <View style={styles.actions}>
          {busy ? (
            <ActivityIndicator size="small" color={colors.primary} style={styles.actionSpinner} />
          ) : (
            <>
              <Pressable
                style={({ pressed }) => [styles.actionBtn, styles.roleBtn, pressed && styles.pressed]}
                onPress={handleToggleRole}
                accessibilityRole="button"
                accessibilityLabel={nextRole === 'ADMIN' ? t('members.makeAdmin') : t('members.makeUser')}
              >
                <Ionicons name="swap-horizontal-outline" size={15} color={colors.primary} />
                <Text style={styles.roleBtnText}>
                  {nextRole === 'ADMIN' ? t('members.makeAdmin') : t('members.makeUser')}
                </Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.actionBtn, styles.removeBtn, pressed && styles.pressed]}
                onPress={handleRemove}
                accessibilityRole="button"
                accessibilityLabel={t('common.delete')}
              >
                <Ionicons name="trash-outline" size={15} color={colors.danger} />
                <Text style={styles.removeBtnText}>{t('common.delete')}</Text>
              </Pressable>
            </>
          )}
        </View>
      ) : null}
    </View>
  );
};

const createStyles = ({ colors, spacing, radius, typography }: ThemeValue) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: radius.pill,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      ...typography.heading2,
      fontSize: 18,
      color: colors.primary,
    },
    identity: {
      flex: 1,
    },
    name: {
      ...typography.bodySmall,
      fontSize: 15,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    phone: {
      ...typography.label,
      fontWeight: '400',
      marginTop: 2,
      color: colors.textSecondary,
    },
    roleBadge: {
      paddingHorizontal: spacing.xs,
      paddingVertical: spacing.xxs,
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceMuted,
    },
    roleBadgeOwner: {
      backgroundColor: colors.primarySoft,
    },
    roleBadgeText: {
      ...typography.caption,
      fontSize: 11,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    roleBadgeTextOwner: {
      color: colors.primary,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xxs,
      marginTop: spacing.sm,
    },
    metaText: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    actions: {
      flexDirection: 'row',
      gap: spacing.xs,
      marginTop: spacing.md,
    },
    actionSpinner: {
      paddingVertical: spacing.xs,
    },
    actionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xxs,
      minHeight: 38,
      borderRadius: radius.md,
    },
    pressed: {
      opacity: 0.7,
    },
    roleBtn: {
      backgroundColor: colors.primarySoft,
    },
    roleBtnText: {
      ...typography.button,
      fontSize: 13,
      color: colors.primary,
    },
    removeBtn: {
      backgroundColor: colors.dangerMuted,
    },
    removeBtnText: {
      ...typography.button,
      fontSize: 13,
      color: colors.danger,
    },
  });

export default memo(BusinessMemberCard);
