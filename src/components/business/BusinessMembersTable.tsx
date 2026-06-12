import React, { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BusinessMemberRole, BusinessProfileDTO } from '../../types/business';
import { useI18n } from '../../i18n';
import { useAppTheme } from '../../theme';
import { formatPhoneDisplay } from '../../utils/phone';

interface BusinessMembersTableProps {
  members: BusinessProfileDTO[];
  loading?: boolean;
  /** OWNER bo'lsa o'chirish/rol o'zgartirish amallari ko'rinadi. */
  canManage?: boolean;
  /** Hozir qayta ishlanayotgan a'zo profileId (loading holati). */
  busyMemberId?: string;
  onRemove?: (member: BusinessProfileDTO) => void;
  onToggleRole?: (member: BusinessProfileDTO, nextRole: BusinessMemberRole) => void;
}

const BusinessMembersTable: React.FC<BusinessMembersTableProps> = ({
  members,
  loading,
  canManage = false,
  busyMemberId,
  onRemove,
  onToggleRole,
}) => {
  const { t } = useI18n();
  const { colors, radius, spacing } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, radius, spacing), [colors, radius, spacing]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (members.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <Ionicons name="people-outline" size={40} color={colors.textSecondary} />
        <Text style={styles.empty}>{t('members.empty')}</Text>
      </View>
    );
  }

  const roleLabel = (role: string): string => {
    if (role === 'OWNER') return t('business.role.owner');
    if (role === 'ADMIN') return t('business.role.admin');
    return t('business.role.member');
  };

  return (
    <View style={styles.list}>
      {members.map((member) => {
        const isOwner = member.role === 'OWNER';
        const busy = busyMemberId === member.profileId;
        const nextRole: BusinessMemberRole = member.role === 'ADMIN' ? 'MEMBER' : 'ADMIN';
        const displayName = member.profileName || member.profileUsername || member.phoneNumber || '--';
        const initial = (displayName || '?').trim().charAt(0).toUpperCase();

        return (
          <View style={styles.card} key={member.id}>
            <View style={styles.cardHeader}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initial}</Text>
              </View>
              <View style={styles.identity}>
                <Text style={styles.name} numberOfLines={1}>{displayName}</Text>
                <Text style={styles.phone} numberOfLines={1}>
                  {formatPhoneDisplay(member.phoneNumber, '--')}
                </Text>
              </View>
              <View style={[styles.roleBadge, isOwner && styles.roleBadgeOwner]}>
                <Text style={[styles.roleBadgeText, isOwner && styles.roleBadgeTextOwner]}>
                  {roleLabel(member.role)}
                </Text>
              </View>
            </View>

            <View style={styles.metaRow}>
              <Ionicons name="time-outline" size={13} color={colors.textSecondary} />
              <Text style={styles.metaText}>{formatDate(member.createdDate)}</Text>
            </View>

            {canManage && !isOwner ? (
              <View style={styles.actions}>
                {busy ? (
                  <ActivityIndicator size="small" color={colors.primary} style={styles.actionSpinner} />
                ) : (
                  <>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.roleBtn]}
                      onPress={() => onToggleRole?.(member, nextRole)}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="swap-horizontal-outline" size={15} color={colors.primary} />
                      <Text style={styles.roleBtnText}>
                        {nextRole === 'ADMIN' ? t('members.makeAdmin') : t('members.makeUser')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.removeBtn]}
                      onPress={() => onRemove?.(member)}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="trash-outline" size={15} color={colors.danger} />
                      <Text style={styles.removeBtnText}>{t('common.delete')}</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
};

function formatDate(value?: string): string {
  if (!value) return '--';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

type ThemeColors = ReturnType<typeof useAppTheme>['colors'];
type ThemeRadius = ReturnType<typeof useAppTheme>['radius'];
type ThemeSpacing = ReturnType<typeof useAppTheme>['spacing'];

const createStyles = (colors: ThemeColors, radius: ThemeRadius, spacing: ThemeSpacing) =>
  StyleSheet.create({
    list: {
      gap: spacing.sm,
    },
    centered: {
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 160,
    },
    emptyWrap: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.xl,
      gap: spacing.xs,
    },
    empty: {
      textAlign: 'center',
      color: colors.textSecondary,
      fontSize: 14,
    },
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
      fontSize: 18,
      fontWeight: '700',
      color: colors.primary,
    },
    identity: {
      flex: 1,
    },
    name: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    phone: {
      marginTop: 2,
      fontSize: 13,
      color: colors.textSecondary,
    },
    roleBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceMuted,
    },
    roleBadgeOwner: {
      backgroundColor: colors.primarySoft,
    },
    roleBadgeText: {
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
      gap: 4,
      marginTop: spacing.sm,
    },
    metaText: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    actions: {
      flexDirection: 'row',
      gap: spacing.xs,
      marginTop: spacing.md,
    },
    actionSpinner: {
      paddingVertical: 8,
    },
    actionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      minHeight: 38,
      borderRadius: radius.md,
    },
    roleBtn: {
      backgroundColor: colors.primarySoft,
    },
    roleBtnText: {
      color: colors.primary,
      fontSize: 13,
      fontWeight: '600',
    },
    removeBtn: {
      backgroundColor: colors.dangerMuted,
    },
    removeBtnText: {
      color: colors.danger,
      fontSize: 13,
      fontWeight: '600',
    },
  });

export default BusinessMembersTable;
