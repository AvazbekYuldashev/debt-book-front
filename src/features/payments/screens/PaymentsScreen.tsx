import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AmbientBackground from '../../../shared/ui/AmbientBackground';
import ScreenHeader from '../../../shared/ui/ScreenHeader';
import Card from '../../../shared/ui/Card';
import EmptyState from '../../../shared/ui/EmptyState';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import { ROUTES } from '../../../app/navigation/routes';
import type { ProfileScreenProps } from '../../../app/navigation/types';
import {
  fetchVoiceUsage,
  fetchVoiceUsageSummary,
  type VoiceUsage,
  type VoiceUsageSummary,
} from '../api/usage';
import { formatDuration, formatSum, formatWhen } from '../model/formatUsage';

/**
 * "To'lovlar": ovozli buyruqlar uchun nima sarflanganini ko'rsatadi.
 *
 * NEGA KERAK: ovozni matnga aylantirish DAQIQASIGA to'lanadi, buyruq esa
 * 10-30 soniya davom etadi. Sarf ilgari faqat provayderning oylik
 * hisobida ko'rinardi - u yerda esa qaysi buyruq qancha turgani yo'q.
 * Shu sababli har bir chaqiruv o'z davomiyligi va narxi bilan turadi.
 *
 * Jami UCH DAVRDA: bugun, shu oy va boshidan beri. Yolg'iz umumiy raqam
 * o'sib boraveradi va undan "ko'p sarflayapmanmi" degan savolga javob
 * chiqmaydi - taqqoslash uchun yaqin davr kerak.
 */
const PaymentsScreen: React.FC<ProfileScreenProps<typeof ROUTES.PAYMENTS>> = ({ navigation }) => {
  const theme = useAppTheme();
  const { colors } = theme;
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [summary, setSummary] = useState<VoiceUsageSummary | null>(null);
  const [items, setItems] = useState<VoiceUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const [totals, page] = await Promise.all([fetchVoiceUsageSummary(), fetchVoiceUsage(0, 50)]);
      setSummary(totals);
      setItems(page.content);
    } catch {
      // Sarf tarixi ko'rinmasligi ishni to'xtatmaydi - xabar beramiz, tamom.
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const renderItem = useCallback(
    ({ item }: { item: VoiceUsage }) => (
      <View style={styles.row}>
        <View style={styles.rowIcon}>
          <Ionicons name="mic-outline" size={16} color={colors.primary} />
        </View>
        <View style={styles.rowText}>
          <Text style={styles.rowWhen}>{formatWhen(item.createdDate)}</Text>
          <Text style={styles.rowDuration}>{formatDuration(item.durationMs)}</Text>
        </View>
        <Text style={styles.rowCost}>{formatSum(item.cost)}</Text>
      </View>
    ),
    [colors.primary, styles],
  );

  return (
    <View style={styles.container}>
      <AmbientBackground />
      <ScreenHeader title={t('payments.title')} onBack={navigation.goBack} />

      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading && items.length > 0} onRefresh={load} tintColor={colors.primary} />
        }
        ListHeaderComponent={
          <>
            <Card style={styles.card}>
              <Text style={styles.cardTitle}>{t('payments.voiceSpend')}</Text>

              <View style={styles.totals}>
                <View style={styles.total}>
                  <Text style={styles.totalValue}>{formatSum(summary?.today ?? 0)}</Text>
                  <Text style={styles.totalLabel}>{t('payments.today')}</Text>
                </View>
                <View style={styles.total}>
                  <Text style={styles.totalValue}>{formatSum(summary?.thisMonth ?? 0)}</Text>
                  <Text style={styles.totalLabel}>{t('payments.thisMonth')}</Text>
                </View>
                <View style={styles.total}>
                  <Text style={styles.totalValue}>{formatSum(summary?.total ?? 0)}</Text>
                  <Text style={styles.totalLabel}>{t('payments.allTime')}</Text>
                </View>
              </View>

              {summary ? (
                <Text style={styles.rate}>
                  {t('payments.rate', { rate: formatSum(summary.ratePerMinute) })}
                </Text>
              ) : null}
            </Card>

            {/* To'ldirish hali ishlamaydi. Tugma o'rniga IZOH turibdi:
                bosilganda hech narsa qilmaydigan tugma ishlaydi deb
                o'ylashga majbur qilardi. */}
            <Card style={styles.card}>
              <View style={styles.soonRow}>
                <Ionicons name="card-outline" size={18} color={colors.textSecondary} />
                <Text style={styles.soonTitle}>{t('payments.topUp')}</Text>
              </View>
              <Text style={styles.soonNote}>{t('payments.topUpSoon')}</Text>
            </Card>

            <Text style={styles.sectionTitle}>{t('payments.history')}</Text>
          </>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator style={styles.loader} color={colors.primary} />
          ) : (
            <EmptyState
              icon={failed ? 'cloud-offline-outline' : 'mic-off-outline'}
              title={failed ? t('common.error') : t('payments.empty')}
              description={failed ? undefined : t('payments.emptyHint')}
            />
          )
        }
      />
    </View>
  );
};

const createStyles = ({ colors, spacing, radius, typography }: ThemeValue) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    content: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.xl,
    },
    card: {
      marginBottom: spacing.md,
      padding: spacing.md,
    },
    cardTitle: {
      ...typography.label,
      color: colors.textSecondary,
      marginBottom: spacing.sm,
    },
    totals: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    total: {
      flex: 1,
      alignItems: 'center',
    },
    totalValue: {
      ...typography.heading3,
      color: colors.textPrimary,
      textAlign: 'center',
    },
    totalLabel: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: spacing.xxs,
    },
    rate: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: spacing.sm,
      textAlign: 'center',
    },
    soonRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    soonTitle: {
      ...typography.body,
      color: colors.textPrimary,
    },
    soonNote: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: spacing.xxs,
    },
    sectionTitle: {
      ...typography.label,
      color: colors.textSecondary,
      marginBottom: spacing.xs,
      marginLeft: spacing.xxs,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.md,
      backgroundColor: colors.surface,
      marginBottom: spacing.xs,
    },
    rowIcon: {
      width: 32,
      height: 32,
      borderRadius: radius.sm,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.sm,
    },
    rowText: {
      flex: 1,
    },
    rowWhen: {
      ...typography.body,
      color: colors.textPrimary,
    },
    rowDuration: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    rowCost: {
      ...typography.body,
      color: colors.textPrimary,
      fontWeight: '600',
    },
    loader: {
      marginTop: spacing.xl,
    },
  });

export default PaymentsScreen;
