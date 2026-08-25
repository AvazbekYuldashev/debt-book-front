import React, { useCallback, useContext, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Card from '../../../shared/ui/Card';
import Button from '../../../shared/ui/Button';
import Input from '../../../shared/ui/Input';
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
import { contributionStatusTone, findMyMember, formatGapAmount, formatGapDate, roundStatusTone } from '../lib/gapUi';
import {
  confirmGapContribution,
  declareGapContribution,
  getGapDisputes,
  getGapGroup,
  getGapMembers,
  getGapRoundContributions,
  getGapRounds,
  openGapDispute,
  resolveGapDispute,
} from '../services/gapService';
import type {
  GapContributionResponseDTO,
  GapDisputeResponseDTO,
  GapGroupResponseDTO,
  GapRoundResponseDTO,
} from '../types/gap';

/**
 * Davrlar jadvali va badallar.
 *
 * Davr tanlanganda badallar ro'yxati ochiladi: kim to'ladi, kim to'lamadi.
 * Bu ro'yxat BARCHA a'zoga ko'rinadi — gap kassa ochiqlikka suyanadi.
 * Tasdiqlash tugmasi esa faqat tashkilotchida chiqadi.
 */
const GapRoundsScreen: React.FC<GapScreenProps<typeof ROUTES.GAP_ROUNDS>> = ({
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
  const [rounds, setRounds] = useState<GapRoundResponseDTO[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [contributions, setContributions] = useState<GapContributionResponseDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [disputes, setDisputes] = useState<GapDisputeResponseDTO[]>([]);
  const [disputeFor, setDisputeFor] = useState<GapContributionResponseDTO | null>(null);
  const [reason, setReason] = useState('');

  const [myMemberId, setMyMemberId] = useState<string | undefined>();
  /** O'z ulushlarim — «bu davrni men olyapmanmi» savoli uchun. */
  const [myShareIds, setMyShareIds] = useState<string[]>([]);
  /**
   * Har bir badal qatorining O'Z kiritish maydoni bor.
   *
   * Ilgari bu alohida oyna edi va odam «To'ladim» tugmasini bosib, so'ng
   * summa yozishi kerak edi. Endi maydon qatorda turadi: kim qancha
   * berayotganini bir qarashda ko'radi va darhol yozadi.
   */
  const [payAmounts, setPayAmounts] = useState<Record<string, string>>({});

  // Serverning javobi asosiy: saqlangan profilda `id` bo'lmasa ham
  // tashkilotchi o'z tugmalarini ko'radi.
  const isOrganizer = group?.organizer ?? (group?.organizerProfileId === profile?.id);
  const openDisputes = disputes.filter((item) => item.status === 'OPEN');

  /**
   * Ro'yxatda faqat BOSHLANGAN davrlar turadi.
   *
   * Hali navbati kelmagan davrlar ko'rsatilmaydi: ularning oluvchisi baribir
   * qur'a yoki kelishuv bilan o'zgarishi mumkin, ya'ni ularni oldindan
   * ko'rsatish bajarilmaydigan va'da bo'lardi. Ro'yxat davr yopilgan sayin
   * o'sib boradi va yopilgan davr o'z yakuniy raqamlari bilan qoladi.
   */
  const visibleRounds = useMemo(
    () => rounds.filter((round) => round.status !== 'SCHEDULED'),
    [rounds],
  );
  /** Navbati kelmaganlar — keyingisini belgilashda nomzod bo'ladi. */
  const nextCandidates = useMemo(
    () => rounds.filter((round) => round.status === 'SCHEDULED'),
    [rounds],
  );
  const load = useCallback(
    async (showSpinner = true) => {
      if (!profile?.jwt) return;
      if (showSpinner) setLoading(true);
      setError('');
      try {
        const [nextGroup, nextRounds, nextDisputes, members] = await Promise.all([
          getGapGroup(groupId, profile.jwt),
          getGapRounds(groupId, profile.jwt),
          getGapDisputes(groupId, profile.jwt),
          getGapMembers(groupId, profile.jwt),
        ]);
        setGroup(nextGroup);
        setRounds(nextRounds);
        setDisputes(nextDisputes);
        // O'z badalimni shu ro'yxatdan topish uchun kerak.
        const mine = findMyMember(members, profile);
        setMyMemberId(mine?.id);
        setMyShareIds((mine?.shares ?? []).map((share) => share.id));
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
      load(rounds.length === 0);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [load]),
  );

  const toggleRound = async (round: GapRoundResponseDTO) => {
    if (expandedId === round.id) {
      setExpandedId(null);
      setContributions([]);
      return;
    }
    setExpandedId(round.id);
    setContributions([]);
    try {
      setContributions(await getGapRoundContributions(round.id, profile?.jwt));
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'));
    }
  };

  const runAction = async (action: () => Promise<unknown>, roundId?: string) => {
    setBusy(true);
    setError('');
    try {
      await action();
      await load(false);
      if (roundId) {
        setContributions(await getGapRoundContributions(roundId, profile?.jwt));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'));
    } finally {
      setBusy(false);
    }
  };

  /**
   * Qator MENIKIMI?
   *
   * Ikki yo'l bilan tekshiriladi va bu ataylab: a'zolar ro'yxati bo'yicha
   * moslash profil bog'lanishiga tayanadi, telefon esa a'zoning o'zida turadi.
   * Biri ishlamay qolsa ikkinchisi qutqaradi — to'lash tugmasi yo'qolib
   * qolgandan ko'ra shunisi ishonchliroq.
   */
  const digits = (value?: string) => (value ?? '').replace(/\D/g, '').slice(-9);
  const myPhone = digits(profile?.username);
  const isMine = (item: GapContributionResponseDTO) =>
    (!!myMemberId && item.memberId === myMemberId)
    || (myPhone.length === 9 && digits(item.memberPhone) === myPhone);

  /** Badalning hali to'lanmagan qismi. */
  const remainingOf = (item: GapContributionResponseDTO) =>
    Math.max(item.amount - (item.paidAmount ?? 0), 0);

  /**
   * Badalni tasdiqlash huquqi FAQAT o'sha davr kassasini oluvchida.
   *
   * Tashkilotchi buni qila olmaydi va bu ataylab: pul unga emas, oluvchiga
   * boradi. Server ham aynan shu qoidani qo'llaydi.
   */
  const canConfirm = (round: GapRoundResponseDTO) =>
    !!round.recipientShareId && myShareIds.includes(round.recipientShareId);


  /**
   * To'lash tugmasi QOLDIQ tugaguncha turadi.
   *
   * Badal bo'lib-bo'lib to'lanishi mumkin, shuning uchun bir marta "to'ladim"
   * degandan keyin tugma yo'qolib qolmaydi — u faqat summa to'liq yopilganda
   * yoki tashkilotchi tasdiqlaganda ketadi.
   */
  const canDeclare = (item: GapContributionResponseDTO) =>
    isMine(item)
    && remainingOf(item) > 0
    && item.status !== 'DISPUTED'
    && item.status !== 'WAIVED';

  /** Qatordagi maydondagi qiymat: kiritilmagan bo'lsa - qolgan summa. */
  const payValue = (item: GapContributionResponseDTO) =>
    payAmounts[item.id] ?? String(remainingOf(item));

  const submitPay = (item: GapContributionResponseDTO) => {
    const amount = Number(payValue(item).replace(/\s/g, '').replace(',', '.'));
    if (!Number.isFinite(amount) || amount <= 0) {
      setError(t('gap.queue.releaseErrorAmount'));
      return;
    }
    setError('');
    runAction(() => declareGapContribution(item.id, amount, profile?.jwt), item.roundId);
    // Kiritilgan qiymat qatorda qolmasin: qayta yuklangach qoldiq o'zi chiqadi.
    setPayAmounts((prev) => {
      const next = { ...prev };
      delete next[item.id];
      return next;
    });
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScreenHeader
        title={t('gap.rounds.title')}
        subtitle={group?.name ?? groupName}
        onBack={() => navigation.goBack()}
      />

      {loading && rounds.length === 0 ? (
        <SkeletonCardList count={4} containerStyle={styles.body} />
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

          {visibleRounds.length === 0 ? (
            <Card style={styles.card}>
              <Text style={styles.muted}>{t('gap.rounds.empty')}</Text>
            </Card>
          ) : (
            visibleRounds.map((round) => {
              const expanded = expandedId === round.id;
              return (
                <Card key={round.id} style={styles.card}>
                  <Pressable onPress={() => toggleRound(round)} style={styles.roundHeader}>
                    <View style={styles.roundNoBadge}>
                      <Text style={styles.roundNoText}>{round.roundNo}</Text>
                    </View>
                    <View style={styles.roundInfo}>
                      <Text style={styles.roundRecipient}>{round.recipientName ?? '—'}</Text>
                      <Text style={styles.muted}>{formatGapDate(round.dueDate)}</Text>
                    </View>
                    <View style={styles.roundRight}>
                      <GapStatusBadge
                        label={t(`gap.roundStatus.${round.status}`)}
                        tone={roundStatusTone[round.status]}
                      />
                      <Feather
                        name={expanded ? 'chevron-up' : 'chevron-down'}
                        size={18}
                        color={colors.textSecondary}
                      />
                    </View>
                  </Pressable>

                  {expanded ? (
                    <View style={styles.expanded}>
                      {group ? (
                        <>
                          {/*
                            Odam bergan pul BERILGAN hisoblanadi - tasdiqni
                            kutayotgan bo'lsa ham. Ilgari bu yerda faqat
                            tasdiqlangani turardi va ro'yxatdagi summalar
                            qo'shilmasdi: "1 600 000 berilgan, nega 600 000?"
                          */}
                          <Text style={styles.amounts}>
                            {t('gap.rounds.collected')}:{' '}
                            {formatGapAmount(
                              round.collectedAmount + (round.declaredAmount ?? 0),
                              group,
                            )}
                            {'  |  '}
                            {t('gap.detail.remaining')}:{' '}
                            {formatGapAmount(
                              Math.max(
                                round.expectedAmount
                                  - round.collectedAmount
                                  - (round.declaredAmount ?? 0),
                                0,
                              ),
                              group,
                            )}
                            {'  |  '}
                            {t('gap.rounds.expected')}:{' '}
                            {formatGapAmount(round.expectedAmount, group)}
                          </Text>
                          {(round.declaredAmount ?? 0) > 0 ? (
                            <Text style={styles.breakdown}>
                              {t('gap.rounds.collectedBreakdown', {
                                confirmed: formatGapAmount(round.collectedAmount, group),
                                declared: formatGapAmount(round.declaredAmount ?? 0, group),
                              })}
                            </Text>
                          ) : null}
                        </>
                      ) : null}

                      {contributions.map((item) => (
                        <View key={item.id} style={styles.contributionRow}>
                          <View style={styles.contributionInfo}>
                            <Text style={styles.contributionName}>{item.memberName ?? '—'}</Text>
                            {/*
                              BARCHAGA ko'rinadigan raqam: kim qancha berdi.
                              Ilgari bu yerda faqat kutilayotgan badal turardi va
                              qisman to'lagan odam to'liq to'lagandek ko'rinardi.
                            */}
                            {group ? (
                              <Text style={styles.muted}>
                                {t('gap.rounds.paidOf', {
                                  paid: formatGapAmount(item.paidAmount ?? 0, group),
                                  total: formatGapAmount(item.amount, group),
                                })}
                              </Text>
                            ) : null}
                          </View>

                          {/*
                            O'z ulushimni AYNAN shu qatordan to'layman. Summa qo'lda
                            kiritiladi, chunki odam ba'zan badalning bir qismini beradi.
                          */}
{canDeclare(item) ? (
                            <>
                              <TextInput
                                value={payValue(item)}
                                onChangeText={(value) =>
                                  setPayAmounts((prev) => ({ ...prev, [item.id]: value }))
                                }
                                onSubmitEditing={() => submitPay(item)}
                                keyboardType="decimal-pad"
                                selectTextOnFocus
                                style={styles.payInput}
                              />
                              <Pressable
                                onPress={() => submitPay(item)}
                                style={({ pressed }) => [
                                  styles.payButton,
                                  { opacity: pressed ? 0.8 : 1 },
                                ]}
                              >
                                <Feather name="check" size={16} color={colors.textOnPrimary} />
                              </Pressable>
                            </>
                          ) : null}
                          <GapStatusBadge
                            label={t(`gap.contributionStatus.${item.status}`)}
                            tone={contributionStatusTone[item.status]}
                          />
                          {canConfirm(round) && item.status === 'DECLARED' ? (
                            <Pressable
                              onPress={() =>
                                runAction(
                                  () => confirmGapContribution(item.id, profile?.jwt),
                                  round.id,
                                )
                              }
                              style={({ pressed }) => [
                                styles.confirmButton,
                                { opacity: pressed ? 0.8 : 1 },
                              ]}
                            >
                              <Feather name="check" size={16} color={colors.textOnPrimary} />
                            </Pressable>
                          ) : (
                            // Nishonlar bir chiziqda tursin - joy doim band.
                            <View style={styles.confirmSlot} />
                          )}

                          {/* Nizo ochish — guruhning HAR QANDAY a'zosi ocha oladi.
                              Tomonlar kelishmasa masala yashirin qolmasligi kerak. */}
                          {item.status !== 'CONFIRMED' && item.status !== 'DISPUTED' ? (
                            <Pressable
                              onPress={() => {
                                setReason('');
                                setDisputeFor(item);
                              }}
                              style={({ pressed }) => [
                                styles.flagButton,
                                { opacity: pressed ? 0.8 : 1 },
                              ]}
                            >
                              <Feather name="flag" size={15} color={colors.textSecondary} />
                            </Pressable>
                          ) : (
                            <View style={styles.confirmSlot} />
                          )}
                        </View>
                      ))}
                    </View>
                  ) : null}
                </Card>
              );
            })
          )}

          {nextCandidates.length > 0 ? (
            <Text style={styles.hiddenNote}>{t('gap.rounds.hiddenNote')}</Text>
          ) : null}

          {/* --------------------------- nizolar --------------------------- */}
          {openDisputes.length > 0 ? (
            <>
              <Text style={styles.sectionTitle}>{t('gap.dispute.title')}</Text>
              {openDisputes.map((dispute) => (
                <Card key={dispute.id} style={styles.card}>
                  <View style={styles.disputeHeader}>
                    <Text style={styles.contributionName}>
                      {dispute.memberName ?? '—'}
                      {dispute.roundNo ? ` · ${dispute.roundNo}` : ''}
                    </Text>
                    <GapStatusBadge label={t(`gap.disputeStatus.${dispute.status}`)} tone="danger" />
                  </View>
                  <Text style={styles.muted}>{dispute.reason}</Text>

                  {isOrganizer ? (
                    <View style={styles.roundActions}>
                      <Button
                        title={t('gap.dispute.confirmContribution')}
                        onPress={() =>
                          runAction(
                            () =>
                              resolveGapDispute(
                                dispute.id,
                                { resolution: 'CONFIRM_CONTRIBUTION' },
                                profile?.jwt,
                              ),
                            expandedId ?? undefined,
                          )
                        }
                        loading={busy}
                        style={styles.roundButton}
                      />
                      <Button
                        title={t('gap.dispute.rejectContribution')}
                        onPress={() =>
                          runAction(
                            () =>
                              resolveGapDispute(
                                dispute.id,
                                { resolution: 'REJECT_CONTRIBUTION' },
                                profile?.jwt,
                              ),
                            expandedId ?? undefined,
                          )
                        }
                        loading={busy}
                        variant="secondary"
                        style={styles.roundButton}
                      />
                    </View>
                  ) : null}
                </Card>
              ))}
            </>
          ) : null}

          <Text style={styles.disclaimer}>{t('gap.noPayment')}</Text>
        </ScrollView>
      )}

      {/* ----------------------- nizo ochish oynasi ----------------------- */}
      <Modal
        visible={!!disputeFor}
        transparent
        animationType="slide"
        onRequestClose={() => setDisputeFor(null)}
      >
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{t('gap.dispute.open')}</Text>
            <Text style={styles.muted}>{disputeFor?.memberName}</Text>
            <Input
              label={t('gap.dispute.reason')}
              value={reason}
              onChangeText={setReason}
              multiline
              containerStyle={styles.field}
            />
            <View style={styles.roundActions}>
              <Button
                title={t('common.cancel')}
                onPress={() => setDisputeFor(null)}
                variant="secondary"
                style={styles.roundButton}
              />
              <Button
                title={t('gap.dispute.submit')}
                onPress={() => {
                  const target = disputeFor;
                  if (!target || !reason.trim()) return;
                  setDisputeFor(null);
                  runAction(
                    () =>
                      openGapDispute(
                        groupId,
                        { contributionId: target.id, reason: reason.trim() },
                        profile?.jwt,
                      ),
                    target.roundId,
                  );
                }}
                loading={busy}
                style={styles.roundButton}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const createStyles = ({ colors, spacing, radius, typography }: ThemeValue) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    body: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
    card: { marginBottom: spacing.sm },
    roundHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    roundNoBadge: {
      width: 30,
      height: 30,
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    roundNoText: {
      ...typography.caption,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    roundInfo: { flex: 1 },
    roundRecipient: {
      ...typography.body,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    roundRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xxs,
    },
    muted: {
      ...typography.bodySmall,
      color: colors.textSecondary,
    },
    expanded: {
      marginTop: spacing.sm,
      paddingTop: spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      gap: spacing.xxs,
    },
    amounts: {
      ...typography.caption,
      color: colors.textSecondary,
      marginBottom: spacing.xxs,
    },
    breakdown: {
      ...typography.caption,
      color: colors.warning,
      marginBottom: spacing.xxs,
    },
    contributionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      // Tor ekranda kiritish maydoni va tugmalar keyingi qatorga tushadi -
      // aks holda ism uchun joy qolmay, "Sar..." bo'lib kesilardi.
      flexWrap: 'wrap',
      gap: spacing.xs,
      paddingVertical: spacing.xs,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    contributionInfo: { flex: 1, minWidth: 132 },
    contributionName: {
      ...typography.bodySmall,
      fontWeight: '600',
      color: colors.textPrimary,
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
    roundActions: {
      flexDirection: 'row',
      gap: spacing.xs,
      marginTop: spacing.sm,
    },
    payInput: {
      ...typography.bodySmall,
      width: 96,
      flexGrow: 1,
      maxWidth: 140,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.xs,
      paddingVertical: spacing.xxs,
      color: colors.textPrimary,
      textAlign: 'right',
    },
    payButton: {
      width: 30,
      height: 30,
      borderRadius: radius.sm,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    nextPlanned: {
      ...typography.body,
      fontWeight: '700',
      color: colors.textPrimary,
      marginTop: spacing.xs,
    },
    openButton: { marginTop: spacing.sm },
    hiddenNote: {
      ...typography.caption,
      color: colors.textSecondary,
      marginBottom: spacing.sm,
    },
    candidateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    roundButton: { flex: 1 },
    flagButton: {
      width: 30,
      height: 30,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sectionTitle: {
      ...typography.heading2,
      fontSize: 17,
      color: colors.textPrimary,
      marginTop: spacing.xs,
      marginBottom: spacing.xs,
    },
    disputeHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.xs,
    },
    backdrop: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      padding: spacing.md,
    },
    sheetTitle: {
      ...typography.heading2,
      color: colors.textPrimary,
      marginBottom: spacing.xxs,
    },
    field: { marginTop: spacing.sm },
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

export default GapRoundsScreen;
