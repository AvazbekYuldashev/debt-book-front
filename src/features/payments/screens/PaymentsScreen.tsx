import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
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
import { createClickLink, fetchPaymentSummary, type PaymentSummary } from '../api/payments';
import UsageDetailModal from '../components/UsageDetailModal';

/**
 * Tayyor summalar.
 *
 * Erkin kiritish o'rniga tanlov: odam "qancha yozsam bo'ladi" deb
 * o'ylab o'tirmaydi, va juda kichik summa (komissiya undan oshadi)
 * umuman taklif qilinmaydi.
 */
const AMOUNTS = [10_000, 25_000, 50_000, 100_000];

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
  const [account, setAccount] = useState<PaymentSummary | null>(null);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState('');
  const [detail, setDetail] = useState<VoiceUsage | null>(null);
  const [items, setItems] = useState<VoiceUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const [totals, page, balance] = await Promise.all([
        fetchVoiceUsageSummary(),
        fetchVoiceUsage(0, 50),
        fetchPaymentSummary(),
      ]);
      setSummary(totals);
      setItems(page.content);
      setAccount(balance);
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

  /**
   * To'lov havolasini olib brauzerda ochadi.
   *
   * Havolani SERVER yasaydi: unda merchant raqami qatnashadi va uni
   * mijozga chiqarish mumkin emas. Bu yerda faqat ochiladi.
   */
  const topUp = useCallback(async (amount: number) => {
    setPaying(true);
    setPayError('');
    try {
      const link = await createClickLink(amount);
      await Linking.openURL(link.url);
    } catch {
      setPayError(t('payments.linkFailed'));
    } finally {
      setPaying(false);
    }
  }, [t]);

  const renderItem = useCallback(
    ({ item }: { item: VoiceUsage }) => {
      // Ikki xil qator: tanish DAQIQAGA, model esa TOKENGA to'lanadi.
      // Bir xil ko'rsatsak "0 so'm" turgan model qatori xatodek ko'rinardi.
      const isModel = item.source === 'MODEL';
      const tokens = item.promptTokens + item.completionTokens;

      return (
        <Pressable
          onPress={() => setDetail(item)}
          accessibilityRole="button"
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        >
          <View style={styles.rowIcon}>
            <Ionicons
              name={isModel ? 'sparkles-outline' : 'mic-outline'}
              size={16}
              color={colors.primary}
            />
          </View>
          <View style={styles.rowText}>
            <Text style={styles.rowWhen}>{formatWhen(item.createdDate)}</Text>
            <Text style={styles.rowDuration}>
              {isModel ? t('payments.tokensLine', { count: String(tokens) }) : formatDuration(item.durationMs)}
            </Text>
          </View>
          {/* Model narxi hali sozlanmagan - nol o'rniga chiziqcha, aks
              holda "bepul" degan taassurot qolardi. */}
          <Text style={styles.rowCost}>
            {isModel && item.cost === 0 ? '—' : formatSum(item.cost)}
          </Text>
          <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} />
        </Pressable>
      );
    },
    [colors.primary, styles, t],
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
                <>
                  <Text style={styles.rate}>
                    {t('payments.rate', { rate: formatSum(summary.ratePerMinute) })}
                  </Text>
                  <Text style={styles.rate}>
                    {t('payments.tokens', {
                      today: String(summary.tokensToday),
                      total: String(summary.tokensTotal),
                    })}
                  </Text>
                </>
              ) : null}
            </Card>

            <Card style={styles.card}>
              <Text style={styles.cardTitle}>{t('payments.balance')}</Text>
              <Text style={styles.balance}>{formatSum(account?.balance ?? 0)}</Text>

              <View style={styles.totals}>
                <View style={styles.total}>
                  <Text style={styles.totalValue}>{formatSum(account?.toppedUp ?? 0)}</Text>
                  <Text style={styles.totalLabel}>{t('payments.toppedUp')}</Text>
                </View>
                <View style={styles.total}>
                  <Text style={styles.totalValue}>{formatSum(account?.spent ?? 0)}</Text>
                  <Text style={styles.totalLabel}>{t('payments.spent')}</Text>
                </View>
              </View>
            </Card>

            <Card style={styles.card}>
              <View style={styles.soonRow}>
                <Ionicons name="card-outline" size={18} color={colors.textSecondary} />
                <Text style={styles.soonTitle}>{t('payments.topUp')}</Text>
              </View>

              {/* Tugmalar FAQAT server "tayyor" desa chiqadi. Kalitlar
                  ulanmagan bo'lsa bosilganda hech narsa qilmaydigan tugma
                  ishlaydi deb o'ylashga majbur qilardi. */}
              {account?.clickEnabled ? (
                <>
                  <Text style={styles.soonNote}>{t('payments.amount')}</Text>
                  <View style={styles.amounts}>
                    {AMOUNTS.map((value) => (
                      <Pressable
                        key={value}
                        disabled={paying}
                        onPress={() => void topUp(value)}
                        accessibilityRole="button"
                        style={({ pressed }) => [
                          styles.amount,
                          (pressed || paying) && styles.amountPressed,
                        ]}
                      >
                        <Text style={styles.amountText}>{formatSum(value)}</Text>
                      </Pressable>
                    ))}
                  </View>
                  {payError ? <Text style={styles.payError}>{payError}</Text> : null}
                </>
              ) : (
                <Text style={styles.soonNote}>{t('payments.topUpSoon')}</Text>
              )}
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

      <UsageDetailModal usage={detail} onClose={() => setDetail(null)} />
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
      marginRight: spacing.xxs,
    },
    rowPressed: {
      opacity: 0.6,
    },
    loader: {
      marginTop: spacing.xl,
    },
    balance: {
      ...typography.display,
      color: colors.textPrimary,
      marginBottom: spacing.sm,
    },
    amounts: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
      marginTop: spacing.sm,
    },
    amount: {
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceMuted,
    },
    amountPressed: {
      opacity: 0.6,
    },
    amountText: {
      ...typography.body,
      color: colors.textPrimary,
    },
    payError: {
      ...typography.caption,
      color: colors.danger,
      marginTop: spacing.xs,
    },
  });

export default PaymentsScreen;
