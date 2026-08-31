import React, { memo, useCallback, useMemo } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import { buildTelUrl, formatPhoneDisplay } from '../../../shared/lib/phone';
import BackButton from '../../../shared/ui/BackButton';
import { formatGapAmount } from '../model/gapFormat';
import { amountUnit, GapAmountDTO, GapUnit, nonZero, toAmount } from '../types/gap';

interface GapMemberBalanceHeaderProps {
  memberName: string;
  memberPhone: string | null;
  /** Guruhning odatiy birligi — hisob bo'sh bo'lganda nol shu birlikda. */
  unit: GapUnit;
  /** Undan olganim, birlik bo'yicha. */
  received: GapAmountDTO[];
  /** Unga berganim, birlik bo'yicha. */
  given: GapAmountDTO[];
  onBack: () => void;
}

/**
 * A'zo ekranining tepasi — Qarzlar bo'limidagi mijoz kartasi bilan bir xil:
 * chapda ism va telefon, o'ngda hisob.
 *
 * O'ngdagi raqam — SOF hisob (olganim − berganim): musbat bo'lsa u menga
 * ko'proq bergan, manfiy bo'lsa men unga.
 *
 * Har birlik alohida qatorda va o'z ishorasi bilan: so'm bo'yicha qarzdor
 * bo'lib, dollar bo'yicha haqdor bo'lish mumkin. Ularni qo'shib bo'lmaydi.
 *
 * Hisobga barcha yozuvlar kiradi — Qarzlar bo'limidagi kabi. Ikkinchi tomon
 * hali tasdiqlamagani pulni yashirmaydi: u shunchaki o'sha qatorda belgi
 * bo'lib turadi.
 *
 * Telefon bosilganda qurilmaning raqam terish oynasi ochiladi.
 */
const GapMemberBalanceHeader: React.FC<GapMemberBalanceHeaderProps> = ({
  memberName,
  memberPhone,
  unit,
  received,
  given,
  onBack,
}) => {
  const theme = useAppTheme();
  const { colors } = theme;
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const telUrl = buildTelUrl(memberPhone ?? undefined);

  /**
   * Har birlik uchun sof hisob. Birlik faqat bitta tomonda uchrasa ham
   * qatorga tushadi — aks holda "men unga dollar berdim" degan fakt
   * yo'qolardi.
   */
  const nets = useMemo(() => {
    const byCode = new Map<string, GapAmountDTO>();
    for (const entry of received) {
      byCode.set(entry.unitCode, { ...entry, amount: toAmount(entry.amount) });
    }
    for (const entry of given) {
      const existing = byCode.get(entry.unitCode);
      const value = toAmount(entry.amount);
      if (existing) {
        existing.amount = toAmount(existing.amount) - value;
      } else {
        byCode.set(entry.unitCode, { ...entry, amount: -value });
      }
    }
    return nonZero([...byCode.values()]);
  }, [received, given]);


  const handleDial = useCallback(() => {
    if (!telUrl) return;
    Linking.openURL(telUrl).catch(() => {
      // Dialer ochilmasa (masalan web'da) — jim o'tamiz.
    });
  }, [telUrl]);

  return (
    <View style={styles.wrap}>
      <View style={styles.topBar}>
        <BackButton onPress={onBack} />
      </View>

      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.identity}>
            <Text style={styles.name} numberOfLines={2}>
              {memberName}
            </Text>
            {memberPhone ? (
              <Pressable
                onPress={handleDial}
                disabled={!telUrl}
                style={({ pressed }) => [styles.phoneRow, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel={t('contact.callNumber')}
                hitSlop={6}
              >
                <Ionicons name="call-outline" size={13} color={colors.primary} />
                <Text style={styles.phone} numberOfLines={1}>
                  {formatPhoneDisplay(memberPhone)}
                </Text>
              </Pressable>
            ) : null}
          </View>

          <View style={styles.balances}>
            {nets.length === 0 ? (
              <Text
                style={[styles.net, { color: colors.textSecondary }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.5}
              >
                {formatGapAmount(0, unit)}
              </Text>
            ) : (
              nets.map((entry) => {
                const value = toAmount(entry.amount);
                return (
                  <Text
                    key={entry.unitCode}
                    style={[
                      styles.net,
                      nets.length > 1 && styles.netCompact,
                      { color: value >= 0 ? colors.positive : colors.negative },
                    ]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.5}
                  >
                    {formatGapAmount(value, amountUnit(entry))}
                  </Text>
                );
              })
            )}
          </View>
        </View>
      </View>
    </View>
  );
};

const createStyles = ({ colors, spacing, radius, typography }: ThemeValue) =>
  StyleSheet.create({
    wrap: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
    },
    topBar: {
      marginBottom: spacing.xs,
    },
    pressed: {
      opacity: 0.6,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      padding: spacing.md + 2,
      marginBottom: spacing.md,
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.14,
      shadowRadius: 22,
      elevation: 8,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    identity: {
      flex: 1,
      minWidth: 0,
    },
    name: {
      ...typography.heading2,
      fontSize: 18,
      color: colors.textPrimary,
    },
    phoneRow: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: spacing.xxs + 1,
      marginTop: spacing.xxs,
    },
    phone: {
      ...typography.caption,
      fontSize: 13,
      fontWeight: '600',
      color: colors.primary,
    },
    balances: {
      flexShrink: 1,
      maxWidth: '55%',
      alignItems: 'flex-end',
    },
    net: {
      ...typography.heading1,
      fontSize: 24,
      fontWeight: '800',
      letterSpacing: -0.6,
      fontVariant: ['tabular-nums'],
    },
    // Bir nechta birlik chiqsa qatorlar ixchamroq.
    netCompact: {
      fontSize: 20,
      lineHeight: 26,
    },
  });

export default memo(GapMemberBalanceHeader);
