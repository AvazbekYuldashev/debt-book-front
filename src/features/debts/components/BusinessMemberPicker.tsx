import React, { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import ChipSelector from '../../../shared/ui/ChipSelector';
import SkeletonShimmer from '../../../shared/ui/SkeletonShimmer';
import { useSelectableBusinessMembers } from '../../business/hooks/useSelectableBusinessMembers';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';

interface BusinessMemberPickerProps {
  businessId: string;
  enabled: boolean;
  selectedId: string;
  onSelect: (profileId: string) => void;
}

/**
 * Counterparty biznes a'zosini tanlash: yuklanish skeletoni, xato/bo'sh holatlar
 * va gorizontal chip ro'yxati shu yerda inkapsulyatsiya qilingan.
 */
const BusinessMemberPicker: React.FC<BusinessMemberPickerProps> = ({
  businessId,
  enabled,
  selectedId,
  onSelect,
}) => {
  const { t } = useI18n();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const { data: members = [], isLoading, isError } = useSelectableBusinessMembers(businessId, enabled);

  const options = useMemo(
    () =>
      members.map((member) => ({
        value: member.profileId,
        label: member.profileName || member.profileUsername || member.phoneNumber || '—',
      })),
    [members],
  );

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{t('money.memberLabel')}</Text>
      {isLoading ? (
        <View style={styles.skeletonRow}>
          <SkeletonShimmer height={36} width="38%" borderRadius={theme.radius.pill} />
          <SkeletonShimmer height={36} width="30%" borderRadius={theme.radius.pill} />
        </View>
      ) : isError ? (
        <Text style={styles.hint}>{t('members.loadFailed')}</Text>
      ) : options.length === 0 ? (
        <Text style={styles.hint}>{t('money.membersEmpty')}</Text>
      ) : (
        <ChipSelector options={options} value={selectedId || null} onChange={onSelect} layout="scroll" />
      )}
    </View>
  );
};

const createStyles = ({ colors, spacing, typography }: ThemeValue) =>
  StyleSheet.create({
    wrap: {
      marginBottom: spacing.sm,
    },
    label: {
      ...typography.label,
      color: colors.textSecondary,
      marginBottom: spacing.xxs,
    },
    skeletonRow: {
      flexDirection: 'row',
      gap: spacing.xs,
    },
    hint: {
      ...typography.caption,
      color: colors.textSecondary,
    },
  });

export default memo(BusinessMemberPicker);
