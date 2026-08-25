import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Card from '../../../shared/ui/Card';
import GapStatusBadge from './GapStatusBadge';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import { formatGapAmount, groupStatusTone } from '../lib/gapUi';
import type { GapGroupResponseDTO } from '../types/gap';

interface GapGroupCardProps {
  group: GapGroupResponseDTO;
  /** Joriy foydalanuvchining shu guruhdagi navbat raqami (bo'lmasa ko'rsatilmaydi). */
  myPosition?: number;
  onPress: () => void;
}

const GapGroupCard: React.FC<GapGroupCardProps> = ({ group, myPosition, onPress }) => {
  const theme = useAppTheme();
  const { colors } = theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useI18n();

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}>
      <Card style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.name} numberOfLines={1}>
            {group.name}
          </Text>
          <GapStatusBadge
            label={t(`gap.status.${group.status}`)}
            tone={groupStatusTone[group.status]}
          />
        </View>

        <Text style={styles.meta}>
          {t('gap.groups.perMonth', {
            amount: formatGapAmount(group.contributionAmount, group),
          })}
          {'  ·  '}
          {t('gap.groups.shares', { count: group.totalShares })}
        </Text>

        <View style={styles.payoutRow}>
          <Feather name="gift" size={14} color={colors.primary} />
          <Text style={styles.payout}>
            {t('gap.groups.payout', {
              amount: formatGapAmount(group.payoutAmount, group),
            })}
          </Text>
        </View>

        <View style={styles.footer}>
          <Feather name="clock" size={13} color={colors.textSecondary} />
          <Text style={styles.turn}>
            {myPosition
              ? t('gap.groups.myTurn', { position: myPosition })
              : t('gap.groups.turnPending')}
          </Text>
        </View>
      </Card>
    </Pressable>
  );
};

const createStyles = ({ colors, spacing, typography }: ThemeValue) =>
  StyleSheet.create({
    card: {
      marginBottom: spacing.sm,
      gap: spacing.xxs,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: spacing.xs,
    },
    name: {
      ...typography.heading2,
      fontSize: 17,
      color: colors.textPrimary,
      flex: 1,
    },
    meta: {
      ...typography.bodySmall,
      color: colors.textSecondary,
    },
    payoutRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xxs,
      marginTop: spacing.xxs,
    },
    payout: {
      ...typography.body,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xxs,
      marginTop: spacing.xxs,
      paddingTop: spacing.xs,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    turn: {
      ...typography.caption,
      color: colors.textSecondary,
    },
  });

export default GapGroupCard;
