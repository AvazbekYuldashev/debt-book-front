import React, { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import { formatPhoneDisplay } from '../../../shared/lib/phone';
import UserAvatar from '../../../shared/ui/UserAvatar';
import GapAmountStack from './GapAmountStack';
import { GapMemberDTO, GapUnit, memberNet, toAmount } from '../types/gap';
import { formatGapAmount } from '../model/gapFormat';
import { FOCUS_INSET } from '../../../shared/ui/focusRing';

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
 * Qoldiq MENING tomonimdan: odam mendan olgan − menga bergan. Musbat
 * bo'lsa bu mening HAQIM (yashil +), manfiy bo'lsa QARZIM (qizil −), nol
 * bo'lsa hisob toza. Tepadagi guruh kartasi ham, bosh ekrandagi xulosa
 * ham aynan shu tomondan gapiradi — bitta ekranda ikki xil hisob
 * bo'lmasligi kerak.
 *
 * Ilgari bu qator DTO ni to'g'ridan-to'g'ri o'qir va QARSHI TOMONNING
 * qoldig'ini ko'rsatardi: men olgan 250 000 so'm tepada "Hozirgi qarz"
 * bo'lib tursa, shu yerda yashil "+250 000" bo'lib chiqardi.
 *
 * Qoldiq YALPI emas, sof: 1000 berib 1000 qaytarib olingan bo'lsa
 * "+1000" va "−1000" emas, nol ko'rinadi.
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

  // MENING tomonimdan: musbat — haq, manfiy — qarz. Agdarish
  // `memberNet` ichida (DTO qarshi tomonning tomonidan keladi).
  const net = memberNet(item);
  // Chip faqat ish bo'lsa chiqadi: tasdig'imni kutayotgan yozuvlar.
  const awaiting = item.awaitingMyConfirm ?? 0;

  return (
    <Pressable
      onPress={onPress ? () => onPress(item) : undefined}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.row,
        !isLast && styles.rowBorder,
        // Bosish ta'siri faqat ochiladigan qatorlarda: o'z qatorim
        // bosilmaydi, shuning uchun bosilgandek ham ko'rinmasligi kerak.
        pressed && onPress && styles.rowPressed,
      ]}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={item.memberName}
      // To'liq enli qator yumaloq karta ichida - halqa ichkariga chiziladi.
      dataSet={FOCUS_INSET}
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
              maxRows={2}
              moreLabel={(count) => t('gap.moreUnits', { count })}
            />
          )}
          <GapAmountStack
            items={net
              .filter((entry) => toAmount(entry.amount) < 0)
              .map((entry) => ({ ...entry, amount: Math.abs(toAmount(entry.amount)) }))}
            sign="−"
            color={colors.negative}
            maxRows={2}
            moreLabel={(count) => t('gap.moreUnits', { count })}
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
