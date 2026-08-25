import React, { useCallback, useContext, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Card from '../../../shared/ui/Card';
import Button from '../../../shared/ui/Button';
import ScreenHeader from '../../../shared/ui/ScreenHeader';
import { SkeletonCardList } from '../../../shared/ui/SkeletonShimmer';
import GapStatusBadge from '../components/GapStatusBadge';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import { AuthContext } from '../../auth/context/AuthContext';
import { formatCurrency } from '../../../shared/lib/currency';
import { ROUTES } from '../../../app/navigation/routes';
import type { GapScreenProps } from '../../../app/navigation/types';
import { formatGapAmount, formatGapDate, groupStatusTone, roundStatusTone } from '../lib/gapUi';
import {
  activateGapGroup,
  confirmGapPayout,
  declareGapContribution,
  getGapRoundPayouts,
  getMyGapDashboard,
  getGapRounds,
} from '../services/gapService';
import type { GapMyDashboardDTO, GapRoundResponseDTO } from '../types/gap';

/**
 * A'zoning asosiy ekrani (TZ 12-bo'lim).
 *
 * Ekran ochilishi bilan UCHTA savolga javob berishi kerak:
 *   men qachon olaman, men qancha to'laganman, bu oy nima qilishim kerak.
 *
 * Shu sababli backend'ning yig'ma `/my` endpointidan foydalanamiz — mijoz
 * to'rt-besh marta so'rov yubormaydi.
 */
const GapGroupDetailScreen: React.FC<GapScreenProps<typeof ROUTES.GAP_GROUP_DETAIL>> = ({
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

  const [data, setData] = useState<GapMyDashboardDTO | null>(null);
  /** Butun jadval - o'z navbatim qachonligini shundan topamiz. */
  const [rounds, setRounds] = useState<GapRoundResponseDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(
    async (showSpinner = true) => {
      if (!profile?.jwt) return;
      if (showSpinner) setLoading(true);
      setError('');
      try {
        const [next, nextRounds] = await Promise.all([
          getMyGapDashboard(groupId, profile.jwt),
          getGapRounds(groupId, profile.jwt),
        ]);
        setData(next);
        setRounds(nextRounds);
      } catch (e) {
        setError(e instanceof Error ? e.message : t('common.error'));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [groupId, profile?.jwt, t],
  );

  useFocusEffect(
    useCallback(() => {
      load(!data);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [load]),
  );

  const runAction = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError('');
    try {
      await action();
      await load(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'));
    } finally {
      setBusy(false);
    }
  };

  /** Kassani oldim — joriy davrdagi menga tegishli to'lovni tasdiqlaydi. */
  const handleConfirmPayout = () =>
    runAction(async () => {
      const round = data?.currentRound;
      if (!round) return;
      const payouts = await getGapRoundPayouts(round.id, profile?.jwt);
      const mine = payouts.find((item) => item.status === 'DECLARED');
      if (mine) {
        await confirmGapPayout(mine.id, profile?.jwt);
      }
    });

  const group = data?.group;
  const myShare = data?.myShares?.[0];
  const round = data?.currentRound;
  const openContribution = data?.myOpenContributions?.[0];

  /** Joriy badalning hali to'lanmagan qismi — badal bo'lib-bo'lib to'lanadi. */
  const openRemaining = openContribution
    ? Math.max(openContribution.amount - (openContribution.paidAmount ?? 0), 0)
    : 0;

  /**
   * "To'ladim" deyilgan, lekin hali tasdiqlanmagan pul.
   *
   * Balansga faqat TASDIQLANGAN badal kiradi, shuning uchun to'lagan odam
   * "Men to'ladim: 0" degan raqamni ko'rib, puli yo'qolgandek his qilardi.
   * Bu summa alohida ko'rsatiladi — u yo'qolgani yo'q, tasdiq kutmoqda.
   */
  const awaitingConfirm = (data?.myOpenContributions ?? [])
    .filter((item) => item.status === 'DECLARED')
    .reduce((sum, item) => sum + (item.paidAmount ?? item.amount), 0);

  /** Kassani oladigan davrim - "navbatim qachon" savolining javobi. */
  const myRound = myShare
    ? rounds.find((item) => item.recipientShareId === myShare.shareId)
    : undefined;

  /** Jami majburiyat: badal x (ulushlar soni - 1). To'lagan + qolgan. */
  const totalObligation = myShare?.totalObligation
    ?? (myShare ? myShare.paidAmount + (myShare.remainingAmount ?? 0) : 0);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScreenHeader
        title={group?.name ?? groupName ?? ''}
        subtitle={group ? t(`gap.status.${group.status}`) : undefined}
        onBack={() => navigation.goBack()}
        right={
          group ? (
            <GapStatusBadge
              label={t(`gap.status.${group.status}`)}
              tone={groupStatusTone[group.status]}
            />
          ) : undefined
        }
      />

      {loading && !data ? (
        <SkeletonCardList count={3} containerStyle={styles.body} />
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

          {/* --- 1-savol: men qachon olaman va qancha --- */}
          {myShare && group ? (
            <Card style={styles.heroCard}>
              {/*
                Uchta qator, oltita raqam - odam so'ragan savollarning hammasi:
                navbatim qachon, qancha olaman, qancha oldim, bu oy qancha
                to'layman, jami qancha to'ladim va qancha qoldi.
              */}
              <View style={styles.heroRow}>
                <View style={styles.heroCell}>
                  <Text style={styles.heroLabel}>{t('gap.detail.myTurn')}</Text>
                  <Text style={styles.heroValue}>
                    {myShare.queuePosition
                      ? t('gap.detail.month', { position: myShare.queuePosition })
                      : '\u2014'}
                  </Text>
                  {myRound ? (
                    <Text style={styles.heroHint}>
                      {myRound.status === 'CLOSED'
                        ? t('gap.detail.turnDone')
                        : formatGapDate(myRound.dueDate)}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.heroDivider} />
                <View style={styles.heroCell}>
                  <Text style={styles.heroLabel}>{t('gap.detail.willReceive')}</Text>
                  <Text style={styles.heroValue}>
                    {formatGapAmount(group.payoutAmount, group)}
                  </Text>
                  <Text style={styles.heroHint}>
                    {t('gap.detail.received')}:{' '}
                    {formatGapAmount(myShare.receivedAmount ?? 0, group)}
                  </Text>
                </View>
              </View>

              {/* --- bu oy nima to'layman --- */}
              <View style={styles.progressRow}>
                <View style={styles.progressCell}>
                  <Text style={styles.progressLabel}>{t('gap.detail.dueThisMonth')}</Text>
                  <Text style={styles.progressRemaining}>
                    {formatGapAmount(openRemaining, group)}
                  </Text>
                  {awaitingConfirm > 0 ? (
                    <Text style={styles.awaiting}>
                      {t('gap.detail.awaitingConfirm', {
                        amount: formatGapAmount(awaitingConfirm, group),
                      })}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.progressCell}>
                  <Text style={styles.progressLabel}>{t('gap.detail.paid')}</Text>
                  <Text style={styles.progressPaid}>
                    {formatGapAmount(myShare.paidAmount, group)}
                  </Text>
                  <Text style={styles.progressMonths}>
                    {t('gap.detail.months', { count: myShare.paidRounds ?? 0 })}
                  </Text>
                </View>
              </View>

              {/* --- boshidan beri qancha to'ladim --- */}
              <View style={styles.progressRow}>
                <View style={styles.progressCell}>
                  <Text style={styles.progressLabel}>{t('gap.detail.remaining')}</Text>
                  <Text style={styles.progressRemaining}>
                    {formatGapAmount(myShare.remainingAmount ?? 0, group)}
                  </Text>
                  <Text style={styles.progressMonths}>
                    {t('gap.detail.months', { count: myShare.remainingRounds ?? 0 })}
                  </Text>
                </View>
                <View style={styles.progressCell}>
                  <Text style={styles.progressLabel}>{t('gap.detail.totalDue')}</Text>
                  <Text style={styles.progressRemaining}>
                    {formatGapAmount(totalObligation, group)}
                  </Text>
                  <Text style={styles.progressMonths}>
                    {t('gap.detail.collected', {
                      done: myShare.paidRounds ?? 0,
                      total: (myShare.paidRounds ?? 0) + (myShare.remainingRounds ?? 0),
                    })}
                  </Text>
                </View>
              </View>
            </Card>
          ) : (
            <Card style={styles.card}>
              <Text style={styles.muted}>{t('gap.detail.notMember')}</Text>
            </Card>
          )}

          {/* --- 3-savol: bu oy nima qilishim kerak --- */}
          {round && group ? (
            <Card style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>
                  {t('gap.detail.currentRound', { round: round.roundNo })}
                </Text>
                <GapStatusBadge
                  label={t(`gap.roundStatus.${round.status}`)}
                  tone={roundStatusTone[round.status]}
                />
              </View>

              <Text style={styles.muted}>
                {t('gap.detail.recipient')}: {round.recipientName ?? '—'}
              </Text>
              <Text style={styles.muted}>
                {t('gap.detail.collected', {
                  done: round.confirmedCount ?? 0,
                  total: round.expectedCount ?? 0,
                })}
              </Text>

              {data?.recipientThisRound ? (
                <View style={styles.actionBlock}>
                  <Text style={styles.recipientNote}>{t('gap.detail.recipientThisRound')}</Text>
                  {round.status === 'PAID' ? (
                    <Button
                      title={t('gap.detail.confirmPayout')}
                      onPress={handleConfirmPayout}
                      loading={busy}
                    />
                  ) : null}
                </View>
              ) : openContribution ? (
                <View style={styles.actionBlock}>
                  {/* Qolgan summa ko'rsatiladi, to'liq badal emas: bir qismini
                      allaqachon bergan odamga "hammasini to'la" deyish
                      noto'g'ri bo'lardi. */}
                  {openRemaining > 0 ? (
                    <Text style={styles.payNote}>
                      {t('gap.detail.payBy', {
                        date: formatGapDate(round.dueDate),
                        amount: formatGapAmount(openRemaining, group),
                      })}
                    </Text>
                  ) : null}

                  {openContribution.status === 'DECLARED' ? (
                    <Text style={styles.declared}>{t('gap.detail.declared')}</Text>
                  ) : null}

                  {openRemaining > 0 ? (
                    <Button
                      title={t('gap.detail.declare')}
                      onPress={() =>
                        // Summa so'ralmaydi — QOLGANI to'liq to'lanadi.
                        // Bo'lib to'lash Navbat va Davrlar ekranlarida.
                        runAction(() =>
                          declareGapContribution(openContribution.id, undefined, profile?.jwt),
                        )
                      }
                      loading={busy}
                    />
                  ) : null}
                </View>
              ) : null}
            </Card>
          ) : group?.status === 'ACTIVE' ? (
            <Card style={styles.card}>
              <Text style={styles.muted}>{t('gap.detail.noRound')}</Text>
            </Card>
          ) : null}

          {/* Tashkilotchi uchun: guruhni ishga tushirish. */}
          {data?.organizer && group?.status === 'DRAFT' ? (
            <Card style={styles.card}>
              <Text style={styles.cardTitle}>{t('gap.detail.activate')}</Text>
              <Text style={styles.muted}>{t('gap.detail.activateHint')}</Text>
              <Button
                title={t('gap.detail.activate')}
                onPress={() => runAction(() => activateGapGroup(groupId, profile?.jwt))}
                loading={busy}
                style={styles.activateButton}
              />
            </Card>
          ) : null}

          <View style={styles.links}>
            <NavRow
              icon="users"
              label={t('gap.detail.members')}
              onPress={() =>
                navigation.navigate(ROUTES.GAP_MEMBERS, { groupId, groupName: group?.name })
              }
              styles={styles}
              color={colors.textSecondary}
            />
            {/*
              NAVBAT a'zolardan keyin turadi — tayyorlov tartibi shunday:
              a'zolarni qo'shasan -> navbatni belgilaysan -> guruhni ishga tushirasan.
              Mazmuni alohida ekranda: 20 ulushli guruhda to'liq ro'yxat bu yerda
              butun ekranni egallab ketardi.
            */}
            <NavRow
              icon="shuffle"
              label={t('gap.queue.title')}
              onPress={() =>
                navigation.navigate(ROUTES.GAP_QUEUE, { groupId, groupName: group?.name })
              }
              styles={styles}
              color={colors.textSecondary}
            />
            <NavRow
              icon="calendar"
              label={t('gap.detail.rounds')}
              onPress={() =>
                navigation.navigate(ROUTES.GAP_ROUNDS, { groupId, groupName: group?.name })
              }
              styles={styles}
              color={colors.textSecondary}
            />
            <NavRow
              icon="bar-chart-2"
              label={t('gap.detail.balances')}
              onPress={() =>
                navigation.navigate(ROUTES.GAP_BALANCES, { groupId, groupName: group?.name })
              }
              styles={styles}
              color={colors.textSecondary}
            />
            <NavRow
              icon="file-text"
              label={t('gap.detail.settlement')}
              onPress={() =>
                navigation.navigate(ROUTES.GAP_SETTLEMENT, { groupId, groupName: group?.name })
              }
              styles={styles}
              color={colors.textSecondary}
            />
            <NavRow
              icon="clock"
              label={t('gap.detail.history')}
              onPress={() =>
                navigation.navigate(ROUTES.GAP_HISTORY, { groupId, groupName: group?.name })
              }
              styles={styles}
              color={colors.textSecondary}
            />
          </View>

          <Text style={styles.disclaimer}>{t('gap.noPayment')}</Text>
        </ScrollView>
      )}

    </View>
  );
};

const NavRow: React.FC<{
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
  color: string;
}> = ({ icon, label, onPress, styles, color }) => (
  <Pressable onPress={onPress} style={({ pressed }) => [styles.navRow, { opacity: pressed ? 0.8 : 1 }]}>
    <Feather name={icon} size={18} color={color} />
    <Text style={styles.navLabel}>{label}</Text>
    <Feather name="chevron-right" size={18} color={color} />
  </Pressable>
);

const createStyles = ({ colors, spacing, radius, typography }: ThemeValue) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    body: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.xl,
    },
    heroCard: {
      marginBottom: spacing.sm,
    },
    card: {
      marginBottom: spacing.sm,
      gap: spacing.xxs,
    },
    heroRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    heroCell: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    heroDivider: {
      width: 1,
      alignSelf: 'stretch',
      backgroundColor: colors.border,
      marginHorizontal: spacing.sm,
    },
    heroLabel: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    heroHint: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    heroValue: {
      ...typography.heading2,
      fontSize: 20,
      color: colors.textPrimary,
    },
    progressRow: {
      flexDirection: 'row',
      marginTop: spacing.sm,
      paddingTop: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    progressCell: {
      flex: 1,
      // Uzun qiymat ("3.5 litr yog'") qo'shni katakni ezib qo'ymasin.
      minWidth: 0,
      gap: 2,
    },
    progressLabel: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    progressPaid: {
      ...typography.body,
      fontWeight: '700',
      color: colors.positive,
    },
    progressRemaining: {
      ...typography.body,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    progressMonths: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.xs,
      marginBottom: spacing.xxs,
    },
    cardTitle: {
      ...typography.body,
      fontWeight: '700',
      color: colors.textPrimary,
      flex: 1,
    },
    muted: {
      ...typography.bodySmall,
      color: colors.textSecondary,
    },
    actionBlock: {
      marginTop: spacing.sm,
      gap: spacing.xs,
    },
    payNote: {
      ...typography.body,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    recipientNote: {
      ...typography.body,
      fontWeight: '700',
      color: colors.primaryPressed,
    },
    declared: {
      ...typography.bodySmall,
      color: colors.warning,
      fontWeight: '600',
    },
    awaiting: {
      ...typography.caption,
      color: colors.warning,
      fontWeight: '600',
    },
    activateButton: {
      marginTop: spacing.xs,
    },
    links: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      overflow: 'hidden',
      marginTop: spacing.xxs,
      marginBottom: spacing.sm,
    },
    navRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    navLabel: {
      ...typography.body,
      color: colors.textPrimary,
      flex: 1,
    },
    error: {
      ...typography.bodySmall,
      color: colors.danger,
      marginBottom: spacing.xs,
    },
    disclaimer: {
      ...typography.caption,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: spacing.md,
    },
  });

export default GapGroupDetailScreen;
