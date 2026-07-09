import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BusinessMemberRole, BusinessProfileDTO } from '../../types/business';
import { useI18n } from '../../i18n';
import { useAppTheme } from '../../theme';
import type { ThemeValue } from '../../theme/ThemeProvider';
import { SkeletonCardList } from '../ui/SkeletonShimmer';
import BusinessMemberCard from './BusinessMemberCard';

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

/** Biznes a'zolari ro'yxati: skeleton/bo'sh holat + har a'zo alohida memo karta. */
const BusinessMembersTable: React.FC<BusinessMembersTableProps> = ({
  members,
  loading,
  canManage = false,
  busyMemberId,
  onRemove,
  onToggleRole,
}) => {
  const { t } = useI18n();
  const theme = useAppTheme();
  const { colors } = theme;
  const styles = useMemo(() => createStyles(theme), [theme]);

  if (loading) {
    return <SkeletonCardList count={3} />;
  }

  if (members.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <Ionicons name="people-outline" size={40} color={colors.textSecondary} />
        <Text style={styles.empty}>{t('members.empty')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {members.map((member) => (
        <BusinessMemberCard
          key={member.id}
          member={member}
          canManage={canManage}
          busy={busyMemberId === member.profileId}
          onRemove={onRemove}
          onToggleRole={onToggleRole}
        />
      ))}
    </View>
  );
};

const createStyles = ({ colors, spacing, typography }: ThemeValue) =>
  StyleSheet.create({
    list: {
      gap: spacing.sm,
    },
    emptyWrap: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.xl,
      gap: spacing.xs,
    },
    empty: {
      ...typography.bodySmall,
      textAlign: 'center',
      color: colors.textSecondary,
    },
  });

export default BusinessMembersTable;
