import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  SectionList,
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
import {
  createClickLink,
  fetchPaymentHistory,
  fetchPaymentSummary,
  type PaymentHistory,
  type PaymentSummary,
} from '../api/payments';
import { feedKey, topUpHistory, voiceHistory, type FeedEntry } from '../model/feed';
import type { VoiceCommand } from '../model/voiceCommand';
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
  const [detail, setDetail] = useState<VoiceCommand | null>(null);
  const [items, setItems] = useState<VoiceUsage[]>([]);
  const [topUps, setTopUps] = useState<PaymentHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const [totals, page, balance, payments] = await Promise.all([
        fetchVoiceUsageSummary(),
        fetchVoiceUsage(0, 50),
        fetchPaymentSummary(),
        fetchPaymentHistory(0, 50),
      ]);
      setSummary(totals);
      setItems(page.content);
      setAccount(balance);
      setTopUps(payments);
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

  /**
   * Ikki ALOHIDA bo'lim: ovozga nima sarflangani va Click orqali nima
   * to'langani. Ular bir paytlar bitta oqimda edi, lekin aralashganda
   * ikkala savolga ham javob qiyinlashdi - "ovozga qancha ketdi" deb
   * qaraganda to'lovlar orasidan terib chiqish kerak bo'lardi, "qancha
   * to'ladim" deb qaraganda esa o'nlab sarf qatorini aylantirib o'tish.
   *
   * Bo'sh bo'lim ham QOLADI: sarlavhasi turgani odamga bu yerda nima
   * ko'rinishini aytadi, g'oyib bo'lgan bo'lim esa yo'qday tuyulardi.
   */
  const sections = useMemo(
    () => [
      { key: 'VOICE' as const, title: t('payments.history'), data: voiceHistory(items) },
      { key: 'TOPUP' as const, title: t('payments.topUpHistory'), data: topUpHistory(topUps) },
    ],
    [items, topUps, t],
  );

  const total = sections.reduce((sum, section) => sum + section.data.length, 0);

  const renderTopUp = useCallback(
    (payment: PaymentHistory) => {
      const cancelled = payment.status === 'CANCELLED';
      return (
        <View style={styles.row}>
          <View style={[styles.rowIcon, !cancelled && styles.rowIconIn]}>
            <Ionicons
              name={cancelled ? 'close-circle-outline' : 'add-circle-outline'}
              size={16}
              color={cancelled ? colors.textSecondary : colors.success}
            />
          </View>
          <View style={styles.rowText}>
            <Text style={styles.rowWhen}>{formatWhen(payment.paidDate ?? payment.createdDate)}</Text>
            <Text style={styles.rowDuration}>
              {cancelled ? t('payments.cancelled') : t('payments.toppedUp')}
            </Text>
          </View>
          {/* Bekor qilingan to'lov balansga tushmagan, shuning uchun
              "+" belgisi ham, yashil rang ham berilmaydi. */}
          <Text style={[styles.rowCost, !cancelled && styles.rowCostIn]}>
            {cancelled ? formatSum(payment.amount) : `+${formatSum(payment.amount)}`}
          </Text>
        </View>
      );
    },
    [colors.success, colors.textSecondary, styles, t],
  );

  const renderCommand = useCallback(
    (command: VoiceCommand) => {
      // Bir qatorda IKKALA qism: odam uchun bu bitta ish. Tafsiloti -
      // qaysi qismga qancha ketgani - bosilganda ochiladi.
      const tokens = command.model
        ? command.model.promptTokens + command.model.completionTokens
        : 0;

      const parts = [
        command.stt ? formatDuration(command.stt.durationMs) : null,
        tokens > 0 ? t('payments.tokensLine', { count: String(tokens) }) : null,
      ].filter(Boolean);

      return (
        <Pressable
          onPress={() => setDetail(command)}
          accessibilityRole="button"
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        >
          <View style={styles.rowIcon}>
            <Ionicons name="mic-outline" size={16} color={colors.primary} />
          </View>
          <View style={styles.rowText}>
            <Text style={styles.rowWhen}>{formatWhen(command.at)}</Text>
            <Text style={styles.rowDuration} numberOfLines={1}>
              {parts.join(' · ')}
            </Text>
          </View>
          <Text style={styles.rowCost}>{formatSum(command.cost)}</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} />
        </Pressable>
      );
    },
    [colors.primary, colors.textSecondary, styles, t],
  );

  const renderItem = useCallback(
    ({ item }: { item: FeedEntry }) =>
      item.kind === 'TOPUP' ? renderTopUp(item.payment) : renderCommand(item.command),
    [renderTopUp, renderCommand],
  );

  return (
    <View style={styles.container}>
      <AmbientBackground />
      <ScreenHeader title={t('payments.title')} onBack={navigation.goBack} />

      <SectionList
        sections={sections}
        renderItem={renderItem}
        keyExtractor={feedKey}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading && total > 0} onRefresh={load} tintColor={colors.primary} />
        }
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionTitle}>{section.title}</Text>
        )}
        /* Bo'sh bo'limga izoh: sarlavha yolg'iz turgani "yuklanmadimi
           yoki yo'qmi" degan savol qoldirardi. Birinchi yuklashda
           izoh o'rniga aylana - hali bilmaymiz. */
        renderSectionFooter={({ section }) =>
          section.data.length > 0 ? null : loading ? (
            <ActivityIndicator style={styles.sectionLoader} color={colors.primary} />
          ) : (
            <Text style={styles.sectionEmpty}>
              {failed
                ? t('common.error')
                : section.key === 'VOICE'
                  ? t('payments.empty')
                  : t('payments.noTopUps')}
            </Text>
          )
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
          </>
        }
      />

      <UsageDetailModal command={detail} onClose={() => setDetail(null)} />
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
      marginTop: spacing.sm,
      marginBottom: spacing.xs,
      marginLeft: spacing.xxs,
    },
    sectionEmpty: {
      ...typography.caption,
      color: colors.textSecondary,
      marginLeft: spacing.xxs,
      marginBottom: spacing.sm,
    },
    sectionLoader: {
      marginVertical: spacing.sm,
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
    rowIconIn: {
      backgroundColor: colors.positiveSoft,
    },
    rowCostIn: {
      color: colors.success,
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
