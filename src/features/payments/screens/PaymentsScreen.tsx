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
import type { MainTabNavigation, ProfileScreenProps } from '../../../app/navigation/types';
import {
  fetchVoiceUsage,
  fetchVoiceUsageSummary,
  type VoiceUsage,
  type VoiceUsageSummary,
} from '../api/usage';
import { formatDuration, formatSum, formatWhen } from '../model/formatUsage';
import { commandCost, type ModelPricing } from '../model/spend';
import { openTarget, type OpenCommand } from '../model/openTarget';

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

  /**
   * Amallar BOSHQA bo'limlarda turadi, shuning uchun tab navigatsiyasi
   * kerak - ekranning o'z navigatsiyasi faqat profil ichida yura oladi.
   *
   * `getParent()` orqali olinadi, `useNavigation` orqali EMAS: bu ekran
   * testlarda navigator ichisiz ham chiziladi va `useNavigation` o'sha
   * yerda yiqilardi. Ota yo'q bo'lsa strelka shunchaki ish bermaydi.
   */
  const tabNavigation = navigation.getParent<MainTabNavigation>();

  const openOperation = useCallback(
    (open: OpenCommand) => {
      if (!open || !tabNavigation) return;
      switch (open.kind) {
        case 'CONTACT':
          tabNavigation.navigate(ROUTES.DEBTS, {
            screen: ROUTES.CONTACT_DETAIL,
            // TARIX sahifasi: odam narxnomani emas, o'sha yozuvni ko'rgani keladi.
            params: { id: open.id, tab: 'history' as const },
          });
          return;
        case 'EXPENSE_CATEGORY':
          tabNavigation.navigate(ROUTES.EXPENSES, {
            screen: ROUTES.EXPENSE_CATEGORY_DETAIL,
            params: { id: open.id, name: open.name },
          });
          return;
        case 'GAP_LIST':
          tabNavigation.navigate(ROUTES.GAP, { screen: ROUTES.GAP_LIST });
      }
    },
    [tabNavigation],
  );

  /**
   * Model tarifi - tafsilot oynasi va eski qatorlar uchun.
   *
   * ESKI yozuvlarda tushunish narxi nol: ular tarif sozlanmagan paytda
   * yozilgan. Ularni bugungi tarif bilan qayta hisoblash uchun kerak.
   * Tarif yoki kurs bo'lmasa null - unda hech narsa qayta hisoblanmaydi.
   */
  const pricing: ModelPricing | null =
    summary?.usdRate && summary.modelInputPerMillion != null && summary.modelOutputPerMillion != null
      ? {
          inputPerMillion: summary.modelInputPerMillion,
          outputPerMillion: summary.modelOutputPerMillion,
          usdRate: summary.usdRate,
          label: summary.modelLabel ?? '',
        }
      : null;

  const renderVoiceRow = useCallback(
    ({ item }: { item: FeedEntry }) => {
      if (item.kind !== 'VOICE') return null;
      const command = item.command;
      // Bir qatorda IKKALA qism: odam uchun bu bitta ish. Tafsiloti -
      // qaysi qismga qancha ketgani - bosilganda ochiladi.
      const open = openTarget(command.target);

      /* TOKEN SONI EMAS: "1 357 token" dan odamga hech narsa chiqmaydi.
         Narx esa yuqoridagi summada - tanish va tushunish qo'shilgan. */
      const parts = [
        command.stt ? formatDuration(command.stt.durationMs) : null,
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
          <Text style={styles.rowCost}>{formatSum(commandCost(command, pricing).total)}</Text>
          {/* Strelka ALOHIDA bosiladi: u amalga olib boradi, qatorning
              qolgan joyi esa sarf tafsilotini ochadi. Havolasi yo'q
              yozuvlarda (eski tarix) umuman ko'rsatilmaydi - bosilsa
              hech narsa bo'lmaydigan tugma aldab qo'yardi. */}
          {open ? (
            <Pressable
              onPress={() => openOperation(open)}
              accessibilityRole="button"
              accessibilityLabel={t('payments.openTarget')}
              hitSlop={10}
              style={({ pressed }) => pressed && styles.arrowPressed}
            >
              <Ionicons name="chevron-forward" size={16} color={colors.primary} />
            </Pressable>
          ) : null}
        </Pressable>
      );
    },
    [colors.primary, colors.textSecondary, openOperation, pricing, styles, t],
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

  /**
   * Uch davr bir qolipda: nomi, ovozlar soni va TO'LIQ sarfi.
   *
   * Ro'yxat sifatida - uchta deyarli bir xil blokni qo'lda yozish
   * ularning bir-biridan ajrab ketishiga olib kelardi.
   */
  const periods = [
    {
      labelKey: 'payments.today',
      count: summary?.countToday ?? 0,
      spend: summary?.today ?? 0,
    },
    {
      labelKey: 'payments.thisMonth',
      count: summary?.countThisMonth ?? 0,
      spend: summary?.thisMonth ?? 0,
    },
    {
      labelKey: 'payments.allTime',
      count: summary?.countTotal ?? 0,
      spend: summary?.total ?? 0,
    },
  ];

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
              taqqoslash uchun yaqin davr kerak.

              Har ustunda SONI ham bor: 900 so'm ko'p yoki kamligi necha
              marta gapirilganiga bog'liq. Pul esa TO'LIQ - tanish va
              tushunish qo'shilgan, chunki foydalanuvchi uchun bitta ovoz
              bitta xarajat. */}
          <View style={styles.totals}>
            {periods.map((item) => (
              <View key={item.labelKey} style={styles.total}>
                <Text style={styles.totalValue}>{formatSum(item.spend)}</Text>
                <Text style={styles.totalCount}>
                  {t('payments.voiceCount', { count: String(item.count) })}
                </Text>
                <Text style={styles.totalLabel}>{t(item.labelKey)}</Text>
              </View>
            ))}
          </View>

          {/* IKKI XIZMAT, BITTA QATOR.
              Ustunlardagi summa allaqachon ikkalasini qo'shib ko'rsatadi,
              shuning uchun bu yerda faqat TARIFLAR turadi: nimaga qarab
              sanalgani. Ilgari ikki qator edi va ular bir xil narsani
              ikki marta aytayotgandek ko'rinardi. */}
          {summary ? (
            <Text style={styles.rate}>
              {t('payments.tariffs', {
                voice: formatSum(summary.ratePerMinute),
                model: summary.modelLabel ?? '',
                usd: summary.usdRate ? formatSum(summary.usdRate) : '—',
              })}
            </Text>
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
        <Text style={[styles.cardTitle, styles.centered]}>{t('payments.balance')}</Text>
        <Text style={styles.balance}>{formatSum(account?.balance ?? 0)}</Text>

        <View style={styles.totals}>
          <View style={styles.total}>
            <Text style={[styles.totalValue, styles.toppedUp]}>
              {formatSum(account?.toppedUp ?? 0)}
            </Text>
            <Text style={styles.totalLabel}>{t('payments.toppedUp')}</Text>
          </View>
          <View style={styles.total}>
            <Text style={[styles.totalValue, styles.spent]}>
              {formatSum(account?.spent ?? 0)}
            </Text>
            <Text style={styles.totalLabel}>{t('payments.spent')}</Text>
          </View>
        </View>
      </Card>

      <SwipePager pages={pages} style={styles.pager} />

      <UsageDetailModal command={detail} onClose={() => setDetail(null)} pricing={pricing} />
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
    /**
     * Balans kartasi O'QNING O'RTASIDA: ostidagi "To'ldirilgan" va
     * "Sarflangan" ustunlari allaqachon markazda va bosh raqam chekkada
     * qolsa, karta qiyshiq ko'rinardi.
     *
     * Alohida uslub: `cardTitle` ovozli xarajat kartasida ham ishlatiladi,
     * u yerda esa sarlavha chapda - ro'yxatning boshlanish chizig'ida.
     */
    centered: {
      textAlign: 'center',
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
    /** Soni raqamdan KICHIK, nomdan katta: u ikkisi orasidagi izoh. */
    totalCount: {
      ...typography.caption,
      color: colors.textPrimary,
      marginTop: spacing.xxs,
    },
    totalLabel: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: spacing.xxs,
    },
    /**
     * Kelgan pul YASHIL, ketgani QIZIL - ro'yxatlardagi haq/qarz bilan bir
     * xil til. Raqamning o'zi ikkovida ham musbat yoziladi, shuning uchun
     * yo'nalishni faqat rang ko'rsatadi.
     *
     * Bu ranglar ILOVA RANGIGA ERGASHMAYDI (accent.ts moliyaviy ranglarga
     * tegmaydi): iliq rang tanlanganda to'lov bilan xarajat deyarli bir xil
     * tusda ko'rinardi.
     *
     * Faqat BALANS kartasida: ovozli xarajat kartasida uch ustun ham bir xil
     * ma'noda (sarflangan), u yerda rang farq bermaydi.
     */
    toppedUp: {
      color: colors.positive,
    },
    spent: {
      color: colors.negative,
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
    arrowPressed: {
      opacity: 0.5,
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
      textAlign: 'center',
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
