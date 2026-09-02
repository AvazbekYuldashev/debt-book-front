import React, { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import GapAmountStack from './GapAmountStack';
import { GapResponseDTO, netByUnit,
  splitNet, unitOf } from '../types/gap';
import { formatGapAmount } from '../model/gapFormat';

interface GapRowProps {
  item: GapResponseDTO;
  isLast?: boolean;
  /** Ochiq bo'lsa barcha valyutalar ko'rinadi (yuqoridagi tugma boshqaradi). */
  expanded?: boolean;
  onPress?: (item: GapResponseDTO) => void;
}

/**
 * Ro'yxatdagi bitta gap kassa.
 *
 * Chapda nomi va a'zolar soni; o'ngda shu guruh bo'yicha shaxsiy hisobim —
 * olganim va berganim ustma-ust. Raqamlar bir ustunda tursa, guruhlarni ko'z
 * bilan solishtirish oson.
 *
 * Tasdig'imni kutayotgan yozuv bo'lsa qizil belgi chiqadi — bu qatorda
 * bajarilmagan ish borligini bildiradi.
 */
const GapRow: React.FC<GapRowProps> = ({ item, isLast = false, expanded = false, onPress }) => {
  const theme = useAppTheme();
  const { colors } = theme;
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const unit = unitOf(item);
  // Guruh qatorida ham sof qoldiq: haqim yashil, qarzim qizil.
  const { haq, qarz } = splitNet(netByUnit(item.myTotalGiven, item.myTotalReceived));
  const awaiting = item.awaitingMyConfirm ?? 0;

  return (
    <Pressable
      onPress={() => onPress?.(item)}
      style={({ pressed }) => [
        styles.row,
        !isLast && styles.rowBorder,
        pressed && styles.rowPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={item.name}
    >
      <View style={styles.main}>
        <Text style={styles.name} numberOfLines={1}>
          {item.name}
        </Text>

        <View style={styles.metaRow}>
          <View style={styles.meta}>
            <Ionicons name="people-outline" size={13} color={colors.textSecondary} />
            <Text style={styles.metaText}>
              {t('gap.memberCount', { count: String(item.memberCount) })}
            </Text>
          </View>
          {awaiting > 0 ? (
            <View style={[styles.badge, { backgroundColor: colors.negativeSoft }]}>
              <Text style={[styles.badgeText, { color: colors.negative }]}>
                {t('gap.awaitingMyConfirm', { count: String(awaiting) })}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.side}>
        {haq.length === 0 && qarz.length === 0 ? (
          // Hisob toza: bergan va olgan tenglashgan.
          <Text style={styles.totalMuted} numberOfLines={1}>
            {formatGapAmount(0, unit)}
          </Text>
        ) : (
          <>
            {/* Haqim yashil (+), qarzim qizil (−). */}
            <GapAmountStack
              items={haq}
              sign="+"
              color={colors.positive}
              maxRows={expanded ? undefined : 2}
              moreLabel={(count) => t('gap.moreUnits', { count })}
            />
            <GapAmountStack
              items={qarz}
              sign="−"
              color={colors.negative}
              maxRows={expanded ? undefined : 2}
              moreLabel={(count) => t('gap.moreUnits', { count })}
            />
          </>
        )}
      </View>
    </Pressable>
  );
};

const createStyles = ({ colors, spacing, radius, typography }: ThemeValue) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    rowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    rowPressed: {
      backgroundColor: colors.surfaceMuted,
    },
    main: {
      flex: 1,
      minWidth: 0,
      gap: spacing.xxs,
    },
    side: {
      alignItems: 'flex-end',
      maxWidth: '45%',
      flexShrink: 1,
      gap: 1,
    },
    name: {
      ...typography.body,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      flexWrap: 'wrap',
    },
    meta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    metaText: {
      ...typography.caption,
      fontSize: 12,
      color: colors.textSecondary,
    },
    badge: {
      paddingVertical: 2,
      paddingHorizontal: spacing.xs,
      borderRadius: radius.pill,
    },
    badgeText: {
      ...typography.caption,
      fontSize: 11,
      fontWeight: '700',
    },
    total: {
      ...typography.caption,
      fontSize: 13,
      lineHeight: 17,
      fontWeight: '800',
      fontVariant: ['tabular-nums'],
    },
    totalMuted: {
      ...typography.caption,
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
      fontVariant: ['tabular-nums'],
    },
  });

export default memo(GapRow);
