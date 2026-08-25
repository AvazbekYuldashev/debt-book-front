import React, { useCallback, useContext, useMemo, useState } from 'react';
import { Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Card from '../../../shared/ui/Card';
import Button from '../../../shared/ui/Button';
import ScreenHeader from '../../../shared/ui/ScreenHeader';
import { SkeletonCardList } from '../../../shared/ui/SkeletonShimmer';
import GapManualQueueModal from '../components/GapManualQueueModal';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import { AuthContext } from '../../auth/context/AuthContext';
import { buildShareLabels, findMyMember, formatGapAmount } from '../lib/gapUi';
import { ROUTES } from '../../../app/navigation/routes';
import type { GapScreenProps } from '../../../app/navigation/types';
import Input from '../../../shared/ui/Input';
import {
  assignGapQueue,
  closeGapRound,
  chooseGapNextRecipient,
  getGapGroup,
  getGapMembers,
  getGapPendingSwaps,
  getGapQueue,
  getGapRounds,
  openGapRound,
  releaseGapPayout,
  requestGapSwap,
  respondGapSwap,
} from '../services/gapService';
import type {
  GapContributionResponseDTO,
  GapGroupResponseDTO,
  GapRoundResponseDTO,
  GapShareResponseDTO,
  GapSwapResponseDTO,
} from '../types/gap';

/**
 * Navbat — alohida ekran.
 *
 * Ilgari navbat guruh ekranida to'liq ro'yxat bo'lib turardi va 20 ulushli
 * guruhda butun ekranni egallab ketardi. Endi guruh ekranida oddiy qator,
 * mazmuni esa shu yerda: jadval, belgilash va almashinuv — hammasi bir joyda,
 * chunki ular bitta mavzu.
 */
const GapQueueScreen: React.FC<GapScreenProps<typeof ROUTES.GAP_QUEUE>> = ({
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
  const [queue, setQueue] = useState<GapShareResponseDTO[]>([]);
  const [swaps, setSwaps] = useState<GapSwapResponseDTO[]>([]);
  const [myMemberId, setMyMemberId] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [manualVisible, setManualVisible] = useState(false);
  const [manualError, setManualError] = useState('');
  /** Keyingi davr oluvchisini tanlash oynasi. */
  const [nextVisible, setNextVisible] = useState(false);
  const [nextError, setNextError] = useState('');
  /** Qur'a natijasi oynasi: natija ko'rsatiladi, so'ng tasdiqlanadi. */
  const [lotteryName, setLotteryName] = useState<string | null>(null);
  const [swapFrom, setSwapFrom] = useState<GapShareResponseDTO | null>(null);

  /**
   * Kassa berish — navbatning O'SHA qatoridan, chunki "kimning navbati bo'lsa
   * o'shanga beriladi" degan qoida shu ro'yxatda ko'rinib turadi.
   */
  const [rounds, setRounds] = useState<GapRoundResponseDTO[]>([]);
  const [releaseFor, setReleaseFor] = useState<{
    round: GapRoundResponseDTO;
    name: string;
  } | null>(null);
  const [releaseAmount, setReleaseAmount] = useState('');
  const [releaseError, setReleaseError] = useState('');

  // Serverning javobi asosiy: saqlangan profilda `id` bo'lmasa ham
  // tashkilotchi o'z tugmalarini ko'radi.
  const isOrganizer = group?.organizer ?? (group?.organizerProfileId === profile?.id);
  const isDraft = group?.status === 'DRAFT';
  const isActive = group?.status === 'ACTIVE';
  const assigned = queue.some((item) => item.queuePosition);
  const sharesComplete = (group?.assignedShares ?? 0) === group?.totalShares;
  /** Ko'p ulushli a'zo ro'yxatda bir necha marta chiqadi — yorliq buni izohlaydi. */
  const labels = useMemo(() => buildShareLabels(queue), [queue]);

  const load = useCallback(
    async (showSpinner = true) => {
      if (!profile?.jwt) return;
      if (showSpinner) setLoading(true);
      setError('');
      try {
        const [nextGroup, nextQueue, nextSwaps, members, nextRounds] = await Promise.all([
          getGapGroup(groupId, profile.jwt),
          getGapQueue(groupId, profile.jwt),
          getGapPendingSwaps(groupId, profile.jwt),
          getGapMembers(groupId, profile.jwt),
          getGapRounds(groupId, profile.jwt),
        ]);
        setGroup(nextGroup);
        setQueue(nextQueue);
        setSwaps(nextSwaps);
        const mine = findMyMember(members, profile);
        setMyMemberId(mine?.id);
        setRounds(nextRounds);

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
      load(queue.length === 0);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [load]),
  );

  /** Shu ulush kassa oladigan davr. */
  const roundOf = (shareId: string) => rounds.find((item) => item.recipientShareId === shareId);

  /**
   * Navbati kelgan eng oxirgi o'rin.
   *
   * Guruh faol bo'lganda navbati HALI KELMAGANLAR ro'yxatda ko'rsatilmaydi:
   * kelajakdagi tartib baribir qur'a yoki kelishuv bilan o'zgarishi mumkin,
   * shuning uchun uni oldindan ko'rsatish yolg'on va'da bo'lardi.
   *
   * DRAFT'da butun ro'yxat kerak — navbat aynan o'sha yerda belgilanadi.
   */
  const reachedPosition = useMemo(() => {
    // DRAFT'da butun ro'yxat kerak - navbat aynan o'sha yerda belgilanadi.
    if (!isActive) return Number.MAX_SAFE_INTEGER;
    // Ko'rinadi: boshlangan/tugagan davrlar VA oluvchisi allaqachon tanlangan
    // keyingi davr. Tanlangan odam darhol ro'yxatda turishi kerak - qur'a
    // tashlangach uni ko'rmaslik "hech narsa bo'lmadi" degan taassurot berardi.
    const decided = rounds.filter(
      (item) => item.status !== 'SCHEDULED' || item.recipientChosen,
    );
    return decided.length ? Math.max(...decided.map((item) => item.roundNo)) : 1;
  }, [isActive, rounds]);

  const visibleQueue = useMemo(
    () => queue.filter((share) => (share.queuePosition ?? 0) <= reachedPosition),
    [queue, reachedPosition],
  );
  const hiddenCount = queue.length - visibleQueue.length;

  /**
   * Keyingi davr.
   *
   * Navbat oxirigacha oldindan belgilanmaydi, shuning uchun bu blok AYNAN
   * navbat ekranida turishi kerak: odam «keyingi kim?» degan savol bilan
   * shu yerga keladi.
   */
  const nextCandidates = useMemo(
    () => rounds.filter((item) => item.status === 'SCHEDULED'),
    [rounds],
  );
  const nextRound = nextCandidates[0];
  /** Ochiq davr turganda navbat o'zgartirilmaydi - server ham rad etadi. */
  const openRound = rounds.find(
    (item) => item.status !== 'SCHEDULED' && item.status !== 'CLOSED',
  );

  const chooseNext = async (orderType: 'RANDOM' | 'MANUAL', shareId?: string) => {
    setNextVisible(false);
    setNextError('');
    setBusy(true);
    try {
      await chooseGapNextRecipient(groupId, { orderType, shareId }, profile?.jwt);
      await load(false);
      // Qur'ada natija tasodifiy - uni ko'rsatib, tasdiqlash imkonini beramiz.
      if (orderType === 'RANDOM') {
        const fresh = await getGapRounds(groupId, profile?.jwt);
        const target = fresh.find((item) => item.status === 'SCHEDULED');
        setLotteryName(target?.recipientName ?? '\u2014');
      }
    } catch (e) {
      setNextError(e instanceof Error ? e.message : t('common.error'));
    } finally {
      setBusy(false);
    }
  };

  /** Kerak bo'lgan summadan allaqachon berilgani ayriladi. */
  const remainingOf = (round: GapRoundResponseDTO) =>
    Math.max(round.expectedAmount - (round.paidOutAmount ?? 0), 0);

  /**
   * HAQIQATDA berish mumkin bo'lgan summa: yig'ilganidan allaqachon
   * berilgani ayriladi. Odatiy qiymat shu bo'ladi - kassaga tushmagan pulni
   * taklif qilish noto'g'ri, tashkilotchi o'z cho'ntagidan qoplashi kerak
   * bo'lib qolardi.
   */
  const releasableOf = (round: GapRoundResponseDTO) =>
    Math.max(
      Math.min(round.collectedAmount ?? 0, round.expectedAmount) - (round.paidOutAmount ?? 0),
      0,
    );

  const openRelease = (round: GapRoundResponseDTO, name: string) => {
    setReleaseError('');
    // Qo'lda o'zgartirish mumkin, lekin odatiy qiymat - yig'ilgani.
    setReleaseAmount(String(releasableOf(round)));
    setReleaseFor({ round, name });
  };

  const submitRelease = async () => {
    if (!releaseFor || !profile?.jwt) return;
    const amount = Number(releaseAmount.replace(/\s/g, '').replace(',', '.'));
    if (!Number.isFinite(amount) || amount <= 0) {
      setReleaseError(t('gap.queue.releaseErrorAmount'));
      return;
    }
    setBusy(true);
    setReleaseError('');
    try {
      await releaseGapPayout(releaseFor.round.id, { amount }, profile.jwt);
      setReleaseFor(null);
      await load(false);
    } catch (e) {
      // Xato oyna ICHIDA qoladi — kiritilgan summa ko'rinib turadi.
      setReleaseError(e instanceof Error ? e.message : t('common.error'));
    } finally {
      setBusy(false);
    }
  };

  /** Badalning hali to'lanmagan qismi — badal bo'lib-bo'lib to'lanishi mumkin. */
  const remainingOfContribution = (contribution: GapContributionResponseDTO) =>
    Math.max(contribution.amount - (contribution.paidAmount ?? 0), 0);

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

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScreenHeader
        title={t('gap.queue.title')}
        subtitle={group?.name ?? groupName}
        onBack={() => navigation.goBack()}
      />

      {loading && queue.length === 0 ? (
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

          <Card style={styles.card}>
            {assigned ? (
              visibleQueue.map((share) => {
                const mine = !!myMemberId && share.memberId === myMemberId;
                return (
                  <Pressable
                    key={share.id}
                    // Almashinuvni faqat O'Z ulushi uchun va faqat faol guruhda so'raladi.
                    disabled={!mine || !isActive}
                    onPress={() => setSwapFrom(share)}
                    style={({ pressed }) => [styles.row, { opacity: pressed ? 0.8 : 1 }]}
                  >
                    <View style={styles.pos}>
                      <Text style={styles.posText}>{share.queuePosition}</Text>
                    </View>
                    <View style={styles.rowBody}>
                      <Text style={styles.name} numberOfLines={1}>
                        {labels[share.id]}
                      </Text>
                      {share.riskWarning && share.riskNote ? (
                        <Text style={styles.risk}>{share.riskNote}</Text>
                      ) : null}
                      {mine && isActive ? (
                        <Text style={styles.swapHint}>{t('gap.swap.request')}</Text>
                      ) : null}

                      {/*
                        Kassa berish tugmasi AYNAN navbatdagi odam qatorida —
                        "kimning navbati bo'lsa o'shanga beriladi" qoidasi
                        shu yerda ko'rinib turadi.
                      */}
                      {(() => {
                        const round = roundOf(share.id);
                        // PAID ham kiradi: kassa berilgan, lekin davr hali
                        // yopilmagan. Ilgari bu holat tushib qolardi va
                        // "Navbatni tugatish" tugmasi ham yo'qolib ketardi.
                        const active = round
                          && round.status !== 'SCHEDULED'
                          && round.status !== 'CLOSED';
                        if (!round || !active) return null;

                        return (
                          <>
                            {/*
                              Bu qator KASSA holati: qancha berilgan va qancha
                              berilishi kerak. Ilgari bu yerda odamning O'Z
                              badali turardi va "kassadan 0 berilgan" deb
                              o'qilardi - badal esa umuman boshqa narsa.
                              Badal to'lash Davrlar ekranida.
                            */}
                            <Text style={styles.collected}>
                              {t('gap.queue.releasedSoFar', {
                                paid: formatGapAmount(round.paidOutAmount ?? 0, group),
                                expected: formatGapAmount(round.expectedAmount, group),
                              })}
                            </Text>


                            {/*
                              Navbatni tugatish - davrni yopadi va shundan
                              keyingina keyingi odamni tanlash yo'li ochiladi.
                              Kassa to'liq berilmagan bo'lsa server aytadi.
                            */}
                            {isOrganizer ? (
                              <Button
                                title={t('gap.queue.finishTurn')}
                                onPress={() =>
                                  runAction(() => closeGapRound(round.id, profile?.jwt))
                                }
                                loading={busy}
                                variant="secondary"
                                style={styles.releaseButton}
                              />
                            ) : null}


                            {/* Tashkilotchi: kassani beradi. */}
                            {isOrganizer && round.status !== 'PAID' ? (
                              <Button
                                title={t('gap.queue.releaseTitle')}
                                onPress={() => openRelease(round, share.memberName ?? '—')}
                                loading={busy}
                                style={styles.releaseButton}
                              />
                            ) : null}
                          </>
                        );
                      })()}
                    </View>
                    {share.riskWarning ? (
                      <Feather name="alert-triangle" size={15} color={colors.warning} />
                    ) : null}
                  </Pressable>
                );
              })
            ) : (
              <Text style={styles.muted}>{t('gap.queue.notAssigned')}</Text>
            )}

            {hiddenCount > 0 ? (
              <Text style={styles.sealed}>{t('gap.queue.hiddenNote')}</Text>
            ) : null}

            {group?.queueSealedDate ? (
              <Text style={styles.sealed}>{t('gap.queue.sealed')}</Text>
            ) : null}
          </Card>

          {isOrganizer && isDraft ? (
            sharesComplete ? (
              <View style={styles.actions}>
                {/* Usul guruh ochilishida hal qilingan - faqat o'shanga mos
                    tugma chiqadi. Tanlanmagan bo'lsa ikkalasi ham qoladi. */}
                {group?.queueOrderType === 'MANUAL' ? null : (
                <Button
                  title={t('gap.queue.assignRandom')}
                  onPress={() =>
                    runAction(() => assignGapQueue(groupId, { orderType: 'RANDOM' }, profile?.jwt))
                  }
                  loading={busy}
                  style={styles.actionButton}
                />
                )}
                {group?.queueOrderType === 'RANDOM' ? null : (
                <Button
                  title={t('gap.queue.assignManual')}
                  onPress={() => {
                    setManualError('');
                    setManualVisible(true);
                  }}
                  loading={busy}
                  variant="secondary"
                  style={styles.actionButton}
                />
                )}
              </View>
            ) : (
              <Text style={styles.hint}>
                {t('gap.queue.needAllShares')} ({group?.assignedShares ?? 0} / {group?.totalShares})
              </Text>
            )
          ) : null}

          {/* ------------------- almashinuv so'rovlari (TZ 10.4) ------------------- */}
          {isActive ? (
            <>
              {/* ---------------------- keyingi davr ---------------------- */}
              {isOrganizer && isActive && nextRound ? (
                <>
                  <Text style={styles.sectionTitle}>{t('gap.rounds.nextTitle')}</Text>
                  <Card style={styles.card}>
                    {openRound ? (
                      <>
                        {/* Nimani kutayotganini aniq aytamiz, aks holda odam
                            tugmani izlab topolmay qoladi. */}
                        <Text style={styles.muted}>
                          {t('gap.rounds.nextBlocked', {
                            name: openRound.recipientName ?? '\u2014',
                          })}
                        </Text>
                      </>
                    ) : (
                      <>
                        <Text style={styles.muted}>{t('gap.rounds.nextHint')}</Text>
                        <Text style={styles.nextPlanned}>
                          {nextRound.recipientChosen
                            ? t('gap.rounds.nextChosen', {
                                name: nextRound.recipientName ?? '\u2014',
                              })
                            : t('gap.rounds.nextNotChosen')}
                        </Text>
                        {nextError ? <Text style={styles.error}>{nextError}</Text> : null}
                        {/* FIXED rejimida navbat boshida muhrlangan: qayta
                            tashlash yo'q, faqat davrni boshlash qoladi. */}
                        <View style={styles.actions}>
                          {group?.queueMode === 'FIXED' ? null : (
                          <>
                          <Button
                            title={t('gap.rounds.nextLottery')}
                            onPress={() => chooseNext('RANDOM')}
                            loading={busy}
                            variant="secondary"
                            style={styles.actionButton}
                          />
                          {nextCandidates.length > 1 ? (
                            <Button
                              title={t('gap.rounds.nextChoose')}
                              onPress={() => {
                                setNextError('');
                                setNextVisible(true);
                              }}
                              loading={busy}
                              variant="secondary"
                              style={styles.actionButton}
                            />
                          ) : null}
                          </>
                          )}
                        </View>

                        {/* Davrni ochish AYNAN shu yerda: oluvchi tanlangach
                            navbatning tabiiy davomi shu. */}
                        {nextRound.recipientChosen ? (
                          <Button
                            title={t('gap.rounds.open')}
                            onPress={() =>
                              runAction(() => openGapRound(nextRound.id, profile?.jwt))
                            }
                            loading={busy}
                            style={styles.openButton}
                          />
                        ) : null}
                      </>
                    )}
                  </Card>
                </>
              ) : null}


              <Text style={styles.sectionTitle}>{t('gap.swap.title')}</Text>
              <Card style={styles.card}>
                {swaps.length === 0 ? (
                  <Text style={styles.muted}>{t('gap.swap.none')}</Text>
                ) : (
                  swaps.map((swap) => (
                    <View key={swap.id} style={styles.swapRow}>
                      <View style={styles.rowBody}>
                        <Text style={styles.name}>
                          {swap.requesterName} → {swap.targetName}
                        </Text>
                        <Text style={styles.muted}>
                          {t('gap.swap.line', {
                            from: swap.requesterPosition ?? '—',
                            to: swap.targetPosition ?? '—',
                          })}
                        </Text>
                      </View>
                      {swap.canRespond ? (
                        <View style={styles.swapActions}>
                          <Pressable
                            onPress={() => runAction(() => respondGapSwap(swap.id, true, profile?.jwt))}
                            style={({ pressed }) => [styles.accept, { opacity: pressed ? 0.8 : 1 }]}
                          >
                            <Feather name="check" size={16} color={colors.textOnPrimary} />
                          </Pressable>
                          <Pressable
                            onPress={() => runAction(() => respondGapSwap(swap.id, false, profile?.jwt))}
                            style={({ pressed }) => [styles.reject, { opacity: pressed ? 0.8 : 1 }]}
                          >
                            <Feather name="x" size={16} color={colors.danger} />
                          </Pressable>
                        </View>
                      ) : (
                        <Text style={styles.muted}>{t('gap.swap.waiting')}</Text>
                      )}
                    </View>
                  ))
                )}
              </Card>
            </>
          ) : null}
        </ScrollView>
      )}

      {/* --------------------- qur'a natijasi --------------------- */}
      <Modal
        visible={!!lotteryName}
        transparent
        animationType="fade"
        onRequestClose={() => setLotteryName(null)}
      >
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{t('gap.rounds.lotteryResult')}</Text>
            <Text style={styles.lotteryName}>{lotteryName}</Text>
            <Text style={styles.muted}>{t('gap.rounds.lotteryNote')}</Text>
            <View style={styles.actions}>
              <Button
                title={t('gap.rounds.lotteryRetry')}
                onPress={() => {
                  setLotteryName(null);
                  chooseNext('RANDOM');
                }}
                loading={busy}
                variant="secondary"
                style={styles.actionButton}
              />
              <Button
                title={t('gap.rounds.lotteryAccept')}
                onPress={() => setLotteryName(null)}
                style={styles.actionButton}
              />
            </View>
          </View>
        </View>
      </Modal>


      {/* ------------- keyingi oluvchini qo'lda tanlash oynasi ------------- */}
      <Modal
        visible={nextVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setNextVisible(false)}
      >
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{t('gap.rounds.nextChooseTitle')}</Text>
            {nextCandidates.map((candidate) => (
              <Pressable
                key={candidate.id}
                onPress={() => chooseNext('MANUAL', candidate.recipientShareId)}
                style={({ pressed }) => [styles.candidateRow, { opacity: pressed ? 0.7 : 1 }]}
              >
                <Text style={styles.name}>{candidate.recipientName ?? '\u2014'}</Text>
                <Feather name="chevron-right" size={18} color={colors.textSecondary} />
              </Pressable>
            ))}
            <Button
              title={t('common.cancel')}
              onPress={() => setNextVisible(false)}
              variant="secondary"
              style={styles.actionButton}
            />
          </View>
        </View>
      </Modal>


      <GapManualQueueModal
        visible={manualVisible}
        shares={queue}
        saving={busy}
        serverError={manualError}
        onClose={() => setManualVisible(false)}
        onSubmit={async (shareIdsInOrder) => {
          setBusy(true);
          setManualError('');
          try {
            await assignGapQueue(groupId, { orderType: 'MANUAL', shareIdsInOrder }, profile?.jwt);
            setManualVisible(false);
            await load(false);
          } catch (e) {
            setManualError(e instanceof Error ? e.message : t('common.error'));
          } finally {
            setBusy(false);
          }
        }}
      />

      {/* ------------------------- kassani berish ------------------------- */}
      <Modal
        visible={!!releaseFor}
        transparent
        animationType="slide"
        onRequestClose={() => setReleaseFor(null)}
      >
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{t('gap.queue.releaseTitle')}</Text>
            {releaseFor ? (
              <>
                <Text style={styles.muted}>
                  {t('gap.queue.releaseFor', {
                    name: releaseFor.name,
                    round: releaseFor.round.roundNo,
                  })}
                </Text>
                <Text style={styles.muted}>
                  {t('gap.queue.releaseCollected', {
                    collected: formatGapAmount(releaseFor.round.collectedAmount, group),
                    expected: formatGapAmount(releaseFor.round.expectedAmount, group),
                  })}
                </Text>
                {(releaseFor.round.declaredAmount ?? 0) > 0 ? (
                  <Text style={styles.releaseWarn}>
                    {t('gap.queue.releaseOnlyConfirmed', {
                      declared: formatGapAmount(releaseFor.round.declaredAmount ?? 0, group),
                    })}
                  </Text>
                ) : null}
              </>
            ) : null}

            <Input
              label={t('gap.queue.releaseAmount')}
              value={releaseAmount}
              onChangeText={setReleaseAmount}
              keyboardType="decimal-pad"
              containerStyle={styles.releaseField}
            />

            {/* Kam summa berish mumkin, lekin bu ko'rinib tursin: davr
                yopilmaydi va qolgani keyingi to'lovlardan yopiladi. */}
            {releaseFor
            && Number(releaseAmount.replace(/\s/g, '').replace(',', '.'))
              < remainingOf(releaseFor.round) ? (
              <Text style={styles.releaseWarn}>{t('gap.queue.releaseWarn')}</Text>
            ) : null}


            {releaseError ? <Text style={styles.error}>{releaseError}</Text> : null}

            <View style={styles.actions}>
              <Button
                title={t('common.cancel')}
                onPress={() => setReleaseFor(null)}
                variant="secondary"
                style={styles.actionButton}
              />
              <Button
                title={t('gap.queue.releaseTitle')}
                onPress={submitRelease}
                loading={busy}
                style={styles.actionButton}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* --------------------- almashinuv uchun tomon tanlash --------------------- */}
      <Modal
        visible={!!swapFrom}
        transparent
        animationType="slide"
        onRequestClose={() => setSwapFrom(null)}
      >
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{t('gap.swap.pick')}</Text>
            <ScrollView style={styles.pickList}>
              {queue
                // Bir a'zoning ikkinchi ulushi bilan almashish ma'nosiz.
                .filter((item) => item.memberId !== swapFrom?.memberId)
                .map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => {
                      const from = swapFrom;
                      setSwapFrom(null);
                      if (from) {
                        runAction(() =>
                          requestGapSwap(
                            groupId,
                            { requesterShareId: from.id, targetShareId: item.id },
                            profile?.jwt,
                          ),
                        );
                      }
                    }}
                    style={({ pressed }) => [styles.pickRow, { opacity: pressed ? 0.8 : 1 }]}
                  >
                    <View style={styles.rowBody}>
                      <Text style={styles.name}>{labels[item.id]}</Text>
                      <Text style={styles.muted}>
                        {t('gap.queue.position', { position: item.queuePosition ?? '—' })}
                      </Text>
                    </View>
                    <Feather name="repeat" size={18} color={colors.textSecondary} />
                  </Pressable>
                ))}
            </ScrollView>
            <Button title={t('common.cancel')} onPress={() => setSwapFrom(null)} variant="secondary" />
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
    row: {
      flexDirection: 'row',
      // Belgisi ism bilan bir qatorda tursin. 'center' bo'lganda qatordagi
      // tugmalar tufayli blok balandlashib, raqam o'rtada suzib qolardi.
      alignItems: 'flex-start',
      gap: spacing.sm,
      paddingVertical: spacing.xs,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    rowBody: { flex: 1 },
    pos: {
      width: 28,
      height: 28,
      // Ismning birinchi satri bilan tekislanadi.
      marginTop: 2,
      borderRadius: radius.pill,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    posText: {
      ...typography.caption,
      fontWeight: '700',
      color: colors.primaryPressed,
    },
    name: {
      ...typography.body,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    muted: {
      ...typography.bodySmall,
      color: colors.textSecondary,
    },
    risk: {
      ...typography.caption,
      color: colors.warning,
    },
    swapHint: {
      ...typography.caption,
      color: colors.primary,
      fontWeight: '600',
    },
    collected: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: spacing.xxs,
    },
    releaseButton: {
      marginTop: spacing.xs,
      // Tor ekranda tugma to'liq kenglikni egallaydi: yarim qolgan tugma
      // tasodifiy bosilishga qulay va chala ko'rinadi.
      alignSelf: 'stretch',
      paddingHorizontal: spacing.md,
    },
    releaseWarn: {
      ...typography.bodySmall,
      color: colors.warning,
      marginBottom: spacing.xs,
    },
    releaseField: {
      marginTop: spacing.sm,
    },
    declared: {
      ...typography.caption,
      color: colors.warning,
      fontWeight: '600',
      marginTop: spacing.xs,
    },
    sealed: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: spacing.xs,
    },
    actions: {
      flexDirection: 'row',
      gap: spacing.xs,
      marginBottom: spacing.sm,
    },
    actionButton: { flex: 1 },
    hint: {
      ...typography.caption,
      color: colors.warning,
      marginBottom: spacing.sm,
    },
    lotteryName: {
      ...typography.heading1,
      color: colors.primary,
      textAlign: 'center',
      marginVertical: spacing.sm,
    },

    openButton: { marginTop: spacing.xs },
    nextPlanned: {
      ...typography.body,
      fontWeight: '700',
      color: colors.textPrimary,
      marginTop: spacing.xs,
    },
    candidateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },

    sectionTitle: {
      ...typography.heading2,
      fontSize: 17,
      color: colors.textPrimary,
      marginBottom: spacing.xs,
    },
    swapRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.xs,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    swapActions: { flexDirection: 'row', gap: spacing.xxs },
    accept: {
      width: 30,
      height: 30,
      borderRadius: radius.sm,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    reject: {
      width: 30,
      height: 30,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: colors.danger,
      alignItems: 'center',
      justifyContent: 'center',
    },
    error: {
      ...typography.bodySmall,
      color: colors.danger,
      marginBottom: spacing.xs,
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
      maxHeight: '80%',
    },
    sheetTitle: {
      ...typography.heading2,
      color: colors.textPrimary,
      marginBottom: spacing.sm,
    },
    pickList: { marginBottom: spacing.sm },
    pickRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
  });

export default GapQueueScreen;
