import React, { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import { formatPhoneDisplay } from '../../../shared/lib/phone';
import UserAvatar from '../../../shared/ui/UserAvatar';
import GapAmountStack from './GapAmountStack';
import { GapMemberDTO, GapUnit, netByUnit, toAmount } from '../types/gap';
import { formatGapAmount } from '../model/gapFormat';

const AVATAR_SIZE = 46;

interface GapMemberRowProps {
  item: GapMemberDTO;
  unit: GapUnit;
  isLast?: boolean;
  /** Bosilganda a'zoning hisob-kitobi ochiladi. */
  onPress?: (item: GapMemberDTO) => void;
}

/**
 * A'zolar ro'yxatidagi bitta qator — Qarzlar bo'limidagi mijoz qatori bilan
 * bir xil ko'rinishda: chapda avatar, ism va telefon; o'ngda SHU ODAMNING
 * sof qoldig'i.
 *
 * Qoldiq = bergan − olgan. Musbat bo'lsa u haqdor (yashil +), manfiy bo'lsa
 * qarzdor (qizil −), nol bo'lsa hisob toza. Ilgari bergani va olgani ikki
 * qatorda YALPI holda turardi: 1000 berib 1000 qaytarib olingan bo'lsa ham
 * "+1000" va "−1000" bo'lib ko'rinardi, nol emas.
 *
 * O'ng chetdagi qizil belgi — mening tasdig'imni kutayotgan yozuvlar soni.
 */
const GapMemberRow: React.FC<GapMemberRowProps> = ({
  item,
  unit,
  isLast = false,
  onPress,
}) => {
  const theme = useAppTheme();
  const { colors } = theme;
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const net = netByUnit(item.given, item.received);
  // Chip faqat ish bo'lsa chiqadi: tasdig'imni kutayotgan yozuvlar.
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
      accessibilityLabel={item.memberName}
    >
      <UserAvatar uri={undefined} size={AVATAR_SIZE} />

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {item.memberName}
          {item.me ? <Text style={styles.meTag}> · {t('gap.me')}</Text> : null}
        </Text>
        <Text style={styles.phone} numberOfLines={1}>
          {formatPhoneDisplay(item.memberPhone ?? undefined, '—')}
        </Text>
      </View>

      <View style={styles.right}>
        <View style={styles.amounts}>
          {net.length === 0 ? (
            <Text style={styles.amountMuted} numberOfLines={1}>
              {formatGapAmount(0, unit)}
            </Text>
          ) : (
            // Har birlik o'z qatorida: musbatlari yashil, manfiylari qizil.
            // Belgi summaning o'zida bo'lgani uchun `sign` berilmaydi.
            <GapAmountStack
              items={net.filter((entry) => toAmount(entry.amount) > 0)}
              sign="+"
              color={colors.positive}
            />
          )}
          <GapAmountStack
            items={net
              .filter((entry) => toAmount(entry.amount) < 0)
              .map((entry) => ({ ...entry, amount: Math.abs(toAmount(entry.amount)) }))}
            sign="−"
            color={colors.negative}
          />
        </View>

        {awaiting > 0 ? (
          <View style={[styles.statusChip, { backgroundColor: colors.negativeSoft }]}>
            <Text style={[styles.statusText, { color: colors.negative }]} numberOfLines={1}>
              {t('gap.awaitingMyConfirm', { count: String(awaiting) })}
            </Text>
          </View>
        ) : null}
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
      paddingHorizontal: spacing.sm,
    },
    rowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    rowPressed: {
      backgroundColor: colors.surfaceMuted,
    },
    info: {
      flex: 1,
      minWidth: 0,
    },
    name: {
      ...typography.label,
      fontSize: 15,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    meTag: {
      fontWeight: '600',
      color: colors.primary,
    },
    phone: {
      ...typography.caption,
      marginTop: spacing.xxs / 2,
      fontSize: 13,
      color: colors.textSecondary,
      fontVariant: ['tabular-nums'],
    },
    right: {
      alignItems: 'flex-end',
      maxWidth: '45%',
      flexShrink: 1,
      gap: 3,
    },
    amounts: {
      alignItems: 'flex-end',
      minWidth: 0,
      gap: 1,
    },
    amount: {
      ...typography.caption,
      fontSize: 13,
      lineHeight: 17,
      fontWeight: '800',
      fontVariant: ['tabular-nums'],
    },
    amountMuted: {
      ...typography.caption,
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
      fontVariant: ['tabular-nums'],
    },
    statusChip: {
      paddingVertical: 2,
      paddingHorizontal: spacing.xs,
      borderRadius: radius.pill,
    },
    statusText: {
      ...typography.caption,
      fontSize: 11,
      fontWeight: '700',
    },
  });

export default memo(GapMemberRow);
