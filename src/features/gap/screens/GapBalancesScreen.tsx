import React, { useCallback, useContext, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Card from '../../../shared/ui/Card';
import ScreenHeader from '../../../shared/ui/ScreenHeader';
import { SkeletonCardList } from '../../../shared/ui/SkeletonShimmer';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import { AuthContext } from '../../auth/context/AuthContext';
import { formatCurrency } from '../../../shared/lib/currency';
import { ROUTES } from '../../../app/navigation/routes';
import type { GapScreenProps } from '../../../app/navigation/types';
import { buildShareLabels, findMyMember, formatGapAmount } from '../lib/gapUi';
import {
  confirmGapContribution,
  getGapBalances,
  getGapGroup,
  getGapMembers,
  getGapRoundContributions,
  getGapRounds,
  getGapShareContributions,
} from '../services/gapService';
import type {
  GapContributionResponseDTO,
  GapGroupResponseDTO,
  GapRoundResponseDTO,
  GapShareBalanceDTO,
} from '../types/gap';

/**
 * Balans va OCHIQ XAVF (TZ 10.2).
 *
 * Bu ekran tizimning eng muhim ishonch mexanizmi. Dastur pulni olib qochishni
 * to'xtata olmaydi — bu texnik emas, ishonch masalasi. Lekin u xavfni
 * KO'RINADIGAN qiladi, va aynan shu narsa amalda ish beradi: odam butun guruh
 * oldida qarzdor bo'lib turishni istamaydi.
 *
 * Shu sababli ro'yxat BARCHA a'zoga ochiq va eng katta xavf tepada turadi.
 */
const GapBalancesScreen: React.FC<GapScreenProps<typeof ROUTES.GAP_BALANCES>> = ({
  navigation,
  route,
}) => {
  const { groupId, groupName } = route.params;
  const theme = useAppTheme();
  const { colors } = theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { profile } = useContext(AuthContext);

  const [group, setGroup] = useState<GapGroupResponseDTO | null>(null);
  const [balances, setBalances] = useState<GapShareBalanceDTO[]>([]);
  const [rounds, setRounds] = useState<GapRoundResponseDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  /**
   * Ochilgan qator va uning ikki yo'nalishli tarixi (talab bo'yicha yuklanadi):
   *   gotFrom — shu ulush kassa olgan davrda kim qancha bergani
   *   paidTo  — shu ulush o'zi qaysi davrda kimga qancha to'lagani
   */
  const [expandedShareId, setExpandedShareId] = useState<string | null>(null);
  const [gotFrom, setGotFrom] = useState<GapContributionResponseDTO[]>([]);
  const [paidTo, setPaidTo] = useState<GapContributionResponseDTO[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  /** "Kim kimga berdi" hisoboti - boshlangan davrlarning barcha badallari. */
  const [transfers, setTransfers] = useState<GapContributionResponseDTO[]>([]);

  /** Tasdiqlash huquqi uchun: qaysi ulushlar meniki. */
  const [myMemberId, setMyMemberId] = useState<string | undefined>();
  const [confirming, setConfirming] = useState<string | null>(null);

  const load = useCallback(
    async (showSpinner = true) => {
      if (!profile?.jwt) return;
      if (showSpinner) setLoading(true);
      setError('');
      try {
        const [nextGroup, nextBalances, nextRounds, members] = await Promise.all([
          getGapGroup(groupId, profile.jwt),
          getGapBalances(groupId, profile.jwt),
          getGapRounds(groupId, profile.jwt),
          getGapMembers(groupId, profile.jwt),
        ]);
        setGroup(nextGroup);
        setBalances(nextBalances);
        setRounds(nextRounds);
        setMyMemberId(findMyMember(members, profile)?.id);

        // Hisobot uchun boshlangan davrlarning badallari. Davrlar soni kam
        // (ulushlar soniga teng), shuning uchun bitta-bitta olish yetarli.
        const started = nextRounds.filter((round) => round.status !== 'SCHEDULED');
        const pages = await Promise.all(
          started.map((round) => getGapRoundContributions(round.id, profile.jwt)),
        );
        setTransfers(pages.flat());
      } catch (e) {
        setError(e instanceof Error ? e.message : t('common.error'));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [groupId, profile?.jwt, profile?.id, t],
  );

  useFocusEffect(
    useCallback(() => {
      load(balances.length === 0);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [load]),
  );

  /**
   * NAVBAT tartibida.
   *
   * Ilgari ochiq xavf bo'yicha saralanardi va ekranda 1, 2, 4, 3 kabi chiqib
   * qolardi - odam buni xato deb o'ylaydi. Navbat raqami boshqa hamma ekranda
   * shu tartibda turadi, shuning uchun bu yerda ham shunday.
   */
  const sorted = useMemo(
    () => [...balances].sort((a, b) => (a.queuePosition ?? 0) - (b.queuePosition ?? 0)),
    [balances],
  );

  // Ko'p ulushli a'zo ro'yxatda bir necha marta chiqadi — yorliq buni izohlaydi.
  const labels = useMemo(
    () =>
      buildShareLabels(
        balances.map((item) => ({
          id: item.shareId,
          memberId: item.memberId,
          memberName: item.memberName,
        })),
      ),
    [balances],
  );

  /** Shu ulush KASSA OLGAN davr — "unga kim qancha berdi" degani shu davr badallari. */
  const roundOf = (shareId: string) => rounds.find((item) => item.recipientShareId === shareId);

  /**
   * BITTA ro'yxat: har bir a'zo bilan ikki tomonlama hisob.
   *
   * Ro'yxat badal yozuvlaridan emas, ULUSHLAR ro'yxatidan quriladi — davr
   * hali ochilmagan bo'lsa ham hamma ko'rinib turishi kerak (0 holatida).
   * Aks holda "kim bilan hisobim ochiq" degan savol javobsiz qolardi.
   *
   * Faqat CONFIRMED yozuvlar sanaladi: e'lon qilingan, lekin tasdiqlanmagan
   * to'lov hali hisobga kirmaydi.
   */
  const settlementRows = useMemo(() => {
    if (!expandedShareId) return [];
    return balances
      .filter((item) => item.shareId !== expandedShareId)
      .sort((a, b) => (a.queuePosition ?? 0) - (b.queuePosition ?? 0))
      .map((item) => ({
        key: item.shareId,
        name: labels[item.shareId] ?? item.memberName ?? '—',
        // Men unga berganim: uning davrlariga to'lagan badallarim.
        gave: paidTo
          .filter((row) => row.recipientShareId === item.shareId && row.status === 'CONFIRMED')
        // HAQIQATDA to'langan summa olinadi, kutilayotgani emas: aks holda
        // 600 000 bergan odam 1 000 000 bergandek ko'rinardi.
          .reduce((sum, row) => sum + (row.paidAmount ?? row.amount), 0),
        // Men undan olganim: mening davrimga u to'lagan badal.
        got: gotFrom
          .filter((row) => row.shareId === item.shareId && row.status === 'CONFIRMED')
          .reduce((sum, row) => sum + (row.paidAmount ?? row.amount), 0),
        // Shu odam menga bergan, lekin men hali tasdiqlamagan to'lovlar.
        // Ular aynan SHU QATORDA tasdiqlanadi - alohida ro'yxat kerak emas.
        pending: gotFrom
          .filter((row) => row.shareId === item.shareId && row.status === 'DECLARED')
          .reduce((sum, row) => sum + (row.paidAmount ?? row.amount), 0),
        pendingIds: gotFrom
          .filter((row) => row.shareId === item.shareId && row.status === 'DECLARED')
          .map((row) => row.id),
      }));
  }, [expandedShareId, balances, paidTo, gotFrom, labels]);


  // Serverning javobi asosiy: saqlangan profilda `id` bo'lmasa ham
  // tashkilotchi o'z tugmalarini ko'radi.
  const isOrganizer = group?.organizer ?? (group?.organizerProfileId === profile?.id);

  /**
   * Kim tasdiqlay oladi: tashkilotchi yoki O'SHA davr kassasini oluvchi.
   * Backend ham aynan shu qoidani qo'llaydi, bu yerda faqat tugmani yashiramiz.
   */
  /**
   * Tasdiqlash huquqi FAQAT kassani oluvchida.
   *
   * Ilgari tashkilotchi ham tasdiqlay olardi, lekin pul unga bormaydi -
   * "oldim" deyish faqat pulni olgan odamning ishi. Server ham shunday.
   */
  const canConfirm = (shareId?: string) => {
    if (!shareId) return false;
    const owner = balances.find((item) => item.shareId === shareId);
    return !!myMemberId && owner?.memberId === myMemberId;
  };


  /** Bitta odamning shu davrdagi barcha tasdiqlanmagan to'lovlarini tasdiqlaydi. */
  const confirmFrom = async (contributionIds: string[]) => {
    if (!profile?.jwt || !expandedShareId || contributionIds.length === 0) return;
    setConfirming(contributionIds[0]);
    setError('');
    try {
      for (const id of contributionIds) {
        await confirmGapContribution(id, profile.jwt);
      }
      const round = roundOf(expandedShareId);
      const [incoming] = await Promise.all([
        round ? getGapRoundContributions(round.id, profile.jwt) : Promise.resolve([]),
        load(false),
      ]);
      setGotFrom(incoming);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'));
    } finally {
      setConfirming(null);
    }
  };


  const toggle = async (shareId: string) => {
    if (expandedShareId === shareId) {
      setExpandedShareId(null);
      setGotFrom([]);
      setPaidTo([]);
      return;
    }
    setExpandedShareId(shareId);
    setGotFrom([]);
    setPaidTo([]);
    if (!profile?.jwt) return;

    const round = roundOf(shareId);
    setDetailLoading(true);
    try {
      // Ikki yo'nalish bir vaqtda: kassa olgan davri (bo'lsa) va o'z to'lovlari.
      const [incoming, outgoing] = await Promise.all([
        round ? getGapRoundContributions(round.id, profile.jwt) : Promise.resolve([]),
        getGapShareContributions(shareId, profile.jwt),
      ]);
      setGotFrom(incoming);
      setPaidTo(outgoing);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'));
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScreenHeader
        title={t('gap.balance.title')}
        subtitle={group?.name ?? groupName}
        onBack={() => navigation.goBack()}
      />

      {loading && balances.length === 0 ? (
        <SkeletonCardList count={5} containerStyle={styles.body} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load(false);
              }}
              tintColor={colors.primary}
            />
          }
        >
          {error ? <Text style={styles.error}>{error}</Text> : null}

          {sorted.map((item) => {
            const currency = group?.currency;
            const owes = item.openRisk > 0;
            const owed = item.openRisk < 0;
            return (
              <Card key={item.shareId} style={styles.card}>
                <Pressable onPress={() => toggle(item.shareId)} style={styles.header}>
                  <View style={styles.positionBadge}>
                    <Text style={styles.positionText}>{item.queuePosition ?? '—'}</Text>
                  </View>
                  <Text style={styles.name} numberOfLines={1}>
                    {labels[item.shareId] ?? item.memberName ?? '—'}
                  </Text>
                  <Feather
                    name={expandedShareId === item.shareId ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={colors.textSecondary}
                  />
                </Pressable>

                <View style={styles.amounts}>
                  <View style={styles.amountCell}>
                    <Text style={styles.amountLabel}>{t('gap.balance.paid')}</Text>
                    <Text style={styles.amountValue}>
                      {formatGapAmount(item.paidAmount, group)}
                    </Text>
                  </View>
                  <View style={styles.amountCell}>
                    <Text style={styles.amountLabel}>{t('gap.balance.received')}</Text>
                    <Text style={styles.amountValue}>
                      {formatGapAmount(item.receivedAmount, group)}
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.riskRow,
                    {
                      backgroundColor: owes
                        ? colors.negativeSoft
                        : owed
                          ? colors.positiveSoft
                          : colors.surfaceMuted,
                    },
                  ]}
                >
                  <Text style={styles.riskLabel}>
                    {item.openRisk === 0 ? t('gap.balance.settled') : t('gap.balance.openRisk')}
                  </Text>
                  <Text
                    style={[
                      styles.riskValue,
                      {
                        color: owes
                          ? colors.negative
                          : owed
                            ? colors.positive
                            : colors.textSecondary,
                      },
                    ]}
                  >
                    {formatGapAmount(Math.abs(item.openRisk), group)}
                  </Text>
                </View>

                {expandedShareId === item.shareId ? (
                  <View style={styles.detail}>
                    {detailLoading ? (
                      <ActivityIndicator color={colors.primary} style={styles.spinner} />
                    ) : (
                      <>

                        <View style={styles.detailHead}>
                          <Text style={styles.detailTitle}>{t('gap.balance.withWhom')}</Text>
                          <Text style={[styles.colLabel, { color: colors.positive }]}>
                            {t('gap.balance.gaveShort')}
                          </Text>
                          <Text style={[styles.colLabel, { color: colors.negative }]}>
                            {t('gap.balance.gotShort')}
                          </Text>
                          <View style={styles.confirmSlot} />
                        </View>

                        {settlementRows.map((row) => (
                          <View key={row.key} style={styles.detailRow}>
                            <View style={styles.detailNameCell}>
                              <Text style={styles.detailName} numberOfLines={1}>
                                {row.name}
                              </Text>
                              {/* Tasdiqlanmagan to'lov aynan shu odamning
                                  qatorida turadi, tugmasi ham shu yerda. */}
                              {row.pending > 0 ? (
                                <Text style={styles.rowPending} numberOfLines={1}>
                                  {formatGapAmount(row.pending, group)}
                                  {' \u00b7 '}
                                  {t('gap.balance.reportPending')}
                                </Text>
                              ) : null}
                            </View>
                            {/* Bergani - yashil, chapda. Olgani - qizil, o'ngda. */}
                            <Text
                              style={[
                                styles.colValue,
                                { color: row.gave > 0 ? colors.positive : colors.textSecondary },
                              ]}
                            >
                              {formatGapAmount(row.gave, group)}
                            </Text>
                            <Text
                              style={[
                                styles.colValue,
                                { color: row.got > 0 ? colors.negative : colors.textSecondary },
                              ]}
                            >
                              {formatGapAmount(row.got, group)}
                            </Text>
                            {row.pending > 0 && canConfirm(item.shareId) ? (
                              <Pressable
                                onPress={() => confirmFrom(row.pendingIds)}
                                disabled={confirming === row.pendingIds[0]}
                                style={({ pressed }) => [
                                  styles.confirmButton,
                                  {
                                    opacity:
                                      pressed || confirming === row.pendingIds[0] ? 0.6 : 1,
                                  },
                                ]}
                              >
                                <Feather name="check" size={15} color={colors.textOnPrimary} />
                              </Pressable>
                            ) : (
                              // Tugma joyi har qatorda band: aks holda tugmasi bor
                              // qator raqamlari siljib, ustunlar qiyshiq ko'rinardi.
                              <View style={styles.confirmSlot} />
                            )}
                          </View>
                        ))}
                      </>
                    )}
                  </View>
                ) : null}
              </Card>
            );
          })}


        </ScrollView>
      )}
    </View>
  );
};

const createStyles = ({ colors, spacing, radius, typography }: ThemeValue) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    body: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
    card: { marginBottom: spacing.sm, gap: spacing.xs },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    positionBadge: {
      width: 26,
      height: 26,
      borderRadius: radius.pill,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    positionText: {
      ...typography.caption,
      fontWeight: '700',
      color: colors.primaryPressed,
    },
    name: {
      ...typography.body,
      fontWeight: '700',
      color: colors.textPrimary,
      flex: 1,
    },
    amounts: { flexDirection: 'row' },
    amountCell: { flex: 1, gap: 2 },
    amountLabel: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    amountValue: {
      ...typography.bodySmall,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    riskRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: radius.md,
    },
    riskLabel: {
      ...typography.caption,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    riskValue: {
      ...typography.body,
      fontWeight: '700',
    },
    detail: {
      marginTop: spacing.xs,
      paddingTop: spacing.xs,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    detailTitle: {
      ...typography.caption,
      fontWeight: '700',
      color: colors.textSecondary,
      flex: 1,
    },
    detailHead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginBottom: spacing.xxs,
    },
    // Ikki ustun bir xil kenglikda — raqamlar qatorma-qator tekis tursin.
    colLabel: {
      ...typography.caption,
      fontWeight: '700',
      minWidth: 72,
      flexShrink: 1,
      textAlign: 'right',
    },
    colValue: {
      ...typography.bodySmall,
      fontWeight: '700',
      // Qat'iy kenglik o'rniga eng kichigi: uzun summa ("1 000 000 so'm")
      // o'z joyiga sig'sin, lekin ustunlar baribir tekis tursin.
      minWidth: 72,
      flexShrink: 1,
      textAlign: 'right',
    },
    detailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: spacing.xs,
      paddingVertical: spacing.xxs,
    },
    detailName: {
      ...typography.bodySmall,
      color: colors.textPrimary,
      flex: 1,
    },
    detailNameCell: { flex: 1, minWidth: 110 },
    rowPending: {
      ...typography.caption,
      color: colors.warning,
    },
    confirmSlot: { width: 30, height: 30 },
    confirmButton: {
      width: 30,
      height: 30,
      borderRadius: radius.sm,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },

    reportTitle: {
      ...typography.heading2,
      fontSize: 16,
      color: colors.textPrimary,
      marginBottom: spacing.xs,
    },
    reportRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.xs,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    reportWho: { flex: 1 },
    reportNames: {
      ...typography.bodySmall,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    reportPending: {
      ...typography.caption,
      color: colors.warning,
    },
    reportAmount: {
      ...typography.bodySmall,
      fontWeight: '700',
    },

    muted: {
      ...typography.bodySmall,
      color: colors.textSecondary,
    },
    spinner: {
      alignSelf: 'flex-start',
      marginVertical: spacing.xs,
    },
    error: {
      ...typography.bodySmall,
      color: colors.danger,
      marginBottom: spacing.xs,
    },
  });

export default GapBalancesScreen;
