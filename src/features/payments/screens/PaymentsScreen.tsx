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
import SwipePager, { type SwipePage } from '../../../shared/ui/SwipePager';
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
 * "To'lovlar": pul qayerga ketgani va qayerdan kelganini ko'rsatadi.
 *
 * IKKI YON SAHIFA, biri ikkinchisining tagida emas: chapda ovozga sarf,
 * o'ngda Click orqali to'ldirish. Ular avval bitta oqimda, keyin
 * bir-birining tagida turgan edi - o'shanda ikkinchisiga yetib borish
 * uchun birinchisini oxirigacha aylantirib o'tish kerak edi. Yon
 * sahifada ikkovi teng: bir harakat bilan ikkinchisiga o'tiladi.
 *
 * Har sahifa O'Z jamisi bilan: ovoz sahifasida sarf (bugun, shu oy,
 * jami), to'ldirish sahifasida esa to'lov tugmalari. Raqam aynan o'zi
 * tegishli ro'yxat ustida turgani uchun nimaga tegishli ekani izohsiz
 * ko'rinadi.
 *
 * BALANS esa sahifalardan TASHQARIDA, yuqorida: u butun ekranning bosh
 * raqami va qaysi sahifada turgandan qat'i nazar kerak.
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
      const [totals, page, balance, history] = await Promise.all([
        fetchVoiceUsageSummary(),
        fetchVoiceUsage(0, 50),
        fetchPaymentSummary(),
        fetchPaymentHistory(0, 50),
      ]);
      setSummary(totals);
      setItems(page.content);
      setAccount(balance);
      setTopUps(history);
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

  const voice = useMemo(() => voiceHistory(items), [items]);
  const payments = useMemo(() => topUpHistory(topUps), [topUps]);

  const renderTopUpRow = useCallback(
    ({ item }: { item: FeedEntry }) => {
      if (item.kind !== 'TOPUP') return null;
      const cancelled = item.payment.status === 'CANCELLED';
      return (
        <View style={styles.row}>
          <View style={[styles.rowIcon, !cancelled && styles.rowIconIn]}>
            <Ionicons
              name={cancelled ? 'close-circle-outline' : 'add-circle-outline'}
              size={16}
              color={cancelled ? colors.textSecondary : colors.positive}
            />
          </View>
          <View style={styles.rowText}>
            <Text style={styles.rowWhen}>{formatWhen(item.at)}</Text>
            <Text style={styles.rowDuration}>
              {cancelled ? t('payments.cancelled') : t('payments.toppedUp')}
            </Text>
          </View>
          {/* Bekor qilingan to'lov balansga tushmagan, shuning uchun
              "+" belgisi ham, yashil rang ham berilmaydi. */}
          <Text style={[styles.rowCost, !cancelled && styles.rowCostIn]}>
            {cancelled ? formatSum(item.payment.amount) : `+${formatSum(item.payment.amount)}`}
          </Text>
        </View>
      );
    },
    [colors.positive, colors.textSecondary, styles, t],
  );

  const renderVoiceRow = useCallback(
    ({ item }: { item: FeedEntry }) => {
      if (item.kind !== 'VOICE') return null;
      const command = item.command;
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

  /**
   * Bo'sh sahifa.
   *
   * Birinchi yuklashda aylana - "yo'q" deyish erta, hali bilmaymiz.
   * Keyin esa sababga qarab: ulanmadimi yoki rostdan ham yo'qmi.
   *
   * Ikkalasi ham kartadan tashqarida, to'g'ridan-to'g'ri fonda turadi -
   * shuning uchun o'z sirtida: fon rasmi qo'yilganda matn va aylana unga
   * qo'shilib ketardi. EmptyState'ning `card` i emas, Card: u yon chekinish
   * qo'shadi, sahifada esa u allaqachon bor - tepadagi karta bilan bir
   * kenglikda tursin.
   */
  const renderEmpty = useCallback(
    (icon: 'mic-off-outline' | 'card-outline', title: string) =>
      loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <Card style={styles.emptyCard}>
          <EmptyState
            icon={failed ? 'cloud-offline-outline' : icon}
            title={failed ? t('common.error') : title}
          />
        </Card>
      ),
    [colors.primary, failed, loading, styles, t],
  );

  // Yangilash aylanasi faqat ro'yxat ALLAQACHON ekranda bo'lsa: birinchi
  // yuklashda uning o'rnida bo'sh sahifaning aylanasi turadi.
  const refresh = (shown: number) => (
    <RefreshControl
      refreshing={loading && shown > 0}
      onRefresh={load}
      tintColor={colors.primary}
    />
  );

  const renderVoicePage = () => (
    <FlatList
      data={voice}
      renderItem={renderVoiceRow}
      keyExtractor={feedKey}
      contentContainerStyle={styles.pageContent}
      showsVerticalScrollIndicator={false}
      refreshControl={refresh(voice.length)}
      ListHeaderComponent={
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>{t('payments.voiceSpend')}</Text>

          {/* Jami UCH DAVRDA: yolg'iz umumiy raqam o'sib boraveradi va
              undan "ko'p sarflayapmanmi" degan savolga javob chiqmaydi -
              taqqoslash uchun yaqin davr kerak. */}
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
      }
      ListEmptyComponent={renderEmpty('mic-off-outline', t('payments.empty'))}
    />
  );

  const renderTopUpPage = () => (
    <FlatList
      data={payments}
      renderItem={renderTopUpRow}
      keyExtractor={feedKey}
      contentContainerStyle={styles.pageContent}
      showsVerticalScrollIndicator={false}
      refreshControl={refresh(payments.length)}
      ListHeaderComponent={
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
      }
      ListEmptyComponent={renderEmpty('card-outline', t('payments.noTopUps'))}
    />
  );

  const pages: SwipePage[] = [
    {
      key: 'voice',
      label: t('payments.history'),
      icon: 'mic-outline',
      render: renderVoicePage,
    },
    {
      key: 'topups',
      label: t('payments.topUpHistory'),
      icon: 'card-outline',
      render: renderTopUpPage,
    },
  ];

  return (
    <View style={styles.container}>
      <AmbientBackground />
      <ScreenHeader title={t('payments.title')} onBack={navigation.goBack} />

      {/* Balans sahifalardan tashqarida: u butun ekranning bosh raqami
          va qaysi sahifada turgandan qat'i nazar kerak. */}
      <Card style={styles.balanceCard}>
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

      <SwipePager pages={pages} style={styles.pager} />

      <UsageDetailModal command={detail} onClose={() => setDetail(null)} />
    </View>
  );
};

const createStyles = ({ colors, spacing, radius, typography, glass }: ThemeValue) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    pager: {
      flex: 1,
    },
    pageContent: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.xl,
    },
    card: {
      marginBottom: spacing.md,
      padding: spacing.md,
    },
    balanceCard: {
      marginHorizontal: spacing.md,
      marginBottom: spacing.sm,
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
    // Qatorlar to'g'ridan-to'g'ri FON ustida (FlatList, karta ichida
    // emas) - shuning uchun shisha sirt: rasmda muzli, "Shaffoflik" ga
    // bo'ysunadi. Tekis surface tepadagi shisha kartalar ostida qattiq
    // plitalar bo'lib turardi.
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.md,
      ...glass.pane,
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
    // Pul KIRGANI "haq" bilan bir oilada - belgisi ham, matni ham bir
    // xil tokendan. Ilgari belgi positiveSoft, matn esa success edi va
    // rang tanlanganda ikkovi ajralib qolardi.
    rowCostIn: {
      color: colors.positive,
    },
    // Aylana uchun kichik doira: butun kenglikdagi bo'sh karta ortiqcha.
    loader: {
      alignSelf: 'center',
      marginTop: spacing.xl,
      padding: spacing.sm,
      borderRadius: radius.pill,
      ...glass.pane,
    },
    // EmptyState o'z ichki chekinishiga ega - Card'nikini qo'shmaymiz.
    emptyCard: {
      padding: 0,
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
