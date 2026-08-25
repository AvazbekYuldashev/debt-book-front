import React, { useCallback, useContext, useMemo, useState } from 'react';
import { Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
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
import { ROUTES } from '../../../app/navigation/routes';
import type { GapScreenProps } from '../../../app/navigation/types';
import { findMyMember, formatGapAmount } from '../lib/gapUi';
import { formatCurrency } from '../../../shared/lib/currency';
import {
  addGapMember,
  assignGapGuarantor,
  getGapGroup,
  getGapMembers,
  getGapRoundContributions,
  getGapRounds,
  removeGapMember,
  replaceGapMember,
} from '../services/gapService';
import type {
  GapContributionResponseDTO,
  GapGroupResponseDTO,
  GapMemberResponseDTO,
  GapRoundResponseDTO,
} from '../types/gap';

/**
 * A'zolar: qo'shish, kafil biriktirish, chiqarish, o'rniga boshqa odam.
 *
 * Navbat va almashinuv bu yerda EMAS — ular alohida ekranda (GapQueueScreen).
 * Pastdagi havola o'sha yerga olib boradi.
 */
const GapMembersScreen: React.FC<GapScreenProps<typeof ROUTES.GAP_MEMBERS>> = ({
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
  const [members, setMembers] = useState<GapMemberResponseDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  /**
   * MENING davrim va unga tushgan badallar.
   *
   * Gap kassada badal har oy navbatdagi odamga beriladi — demak "menga kim
   * berdi" degani men kassa oladigan davrdagi badallar. Shu ma'lumot a'zolar
   * ro'yxatida darhol ko'rinishi kerak: kim to'lagan, kim yo'q.
   */
  const [myRound, setMyRound] = useState<GapRoundResponseDTO | null>(null);
  const [myRoundContributions, setMyRoundContributions] = useState<GapContributionResponseDTO[]>([]);

  const [addVisible, setAddVisible] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [shareCount, setShareCount] = useState('1');
  /** Bitta forma ikki vazifada: yangi a'zo qo'shish va a'zo o'rnini almashtirish. */
  const [replaceFor, setReplaceFor] = useState<GapMemberResponseDTO | null>(null);

  /** Forma xatosi — oyna ICHIDA ko'rsatiladi, ekran ortida emas. */
  const [formError, setFormError] = useState('');

  const [guarantorFor, setGuarantorFor] = useState<GapMemberResponseDTO | null>(null);

  // Serverning javobi asosiy: saqlangan profilda `id` bo'lmasa ham
  // tashkilotchi o'z tugmalarini ko'radi.
  const isOrganizer = group?.organizer ?? (group?.organizerProfileId === profile?.id);
  const isDraft = group?.status === 'DRAFT';
  const isActive = group?.status === 'ACTIVE';
  const assignedShares = members.reduce((sum, member) => sum + (member.shares?.length ?? 0), 0);
  /** Nechta ulush bo'sh qolgan — qo'shish tugmasi shunga qarab ko'rinadi. */
  const slotsLeft = Math.max((group?.totalShares ?? 0) - assignedShares, 0);

  const load = useCallback(
    async (showSpinner = true) => {
      if (!profile?.jwt) return;
      if (showSpinner) setLoading(true);
      setError('');
      try {
        const [nextGroup, nextMembers, nextRounds] = await Promise.all([
          getGapGroup(groupId, profile.jwt),
          getGapMembers(groupId, profile.jwt),
          getGapRounds(groupId, profile.jwt),
        ]);
        setGroup(nextGroup);
        setMembers(nextMembers);

        // Mening ulushlarim -> men kassa oladigan davr.
        const mine = findMyMember(nextMembers, profile);
        const myShareIds = new Set((mine?.shares ?? []).map((share) => share.id));
        const myRounds = nextRounds.filter(
          (round) => round.recipientShareId && myShareIds.has(round.recipientShareId),
        );
        // Yopilmagan davr muhimroq; hammasi yopilgan bo'lsa oxirgisini ko'rsatamiz.
        const round = myRounds.find((item) => item.status !== 'CLOSED')
          ?? myRounds[myRounds.length - 1]
          ?? null;
        setMyRound(round);
        setMyRoundContributions(
          round ? await getGapRoundContributions(round.id, profile.jwt) : [],
        );
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
      load(members.length === 0);
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

  /**
   * Shu a'zo MENGA qancha bergani.
   *
   * Ko'p ulushli a'zo bir necha badal to'laydi — shuning uchun uning barcha
   * ulushlari bo'yicha yig'iladi. Faqat TASDIQLANGAN to'lov sanaladi:
   * "to'ladim" deb belgilangan, lekin tasdiqlanmagani hali hisobga kirmaydi.
   *
   * null qaytsa — bu a'zoning menga to'lovi yo'q (o'zim, yoki davr ochilmagan).
   */
  const paidToMe = (member: GapMemberResponseDTO) => {
    if (!myRound) return null;
    const shareIds = new Set((member.shares ?? []).map((share) => share.id));
    const rows = myRoundContributions.filter((row) => shareIds.has(row.shareId));
    if (rows.length === 0) return null;

    const paid = rows
      .filter((row) => row.status === 'CONFIRMED')
      .reduce((sum, row) => sum + row.amount, 0);
    const expected = rows.reduce((sum, row) => sum + row.amount, 0);
    return { paid, expected, done: expected > 0 && paid >= expected };
  };

  const closeAddForm = () => {
    setAddVisible(false);
    setReplaceFor(null);
    setName('');
    setPhone('');
    setShareCount('1');
    setFormError('');
  };

  /**
   * Xato ATAYLAB ekran holatiga emas, `formError` ga yoziladi: oyna ochiq
   * turganda ekran ortidagi xabar ko'rinmaydi va foydalanuvchi nima
   * bo'lganini tushunmaydi.
   */
  const handleAdd = async () => {
    if (!name.trim() || !phone.trim()) return;
    const dto = {
      name: name.trim(),
      phone: phone.trim(),
      shareCount: Number(shareCount) || 1,
    };
    const target = replaceFor;

    setBusy(true);
    setFormError('');
    try {
      if (target) {
        // O'rniga boshqa odam: ulush (va u bilan birga navbat hamda butun
        // to'lov tarixi) yangi a'zoga o'tadi.
        await replaceGapMember(groupId, target.id, dto, profile?.jwt);
      } else {
        await addGapMember(groupId, dto, profile?.jwt);
      }
      closeAddForm();
      await load(false);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : t('common.error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScreenHeader
        title={t('gap.members.title')}
        subtitle={group?.name ?? groupName}
        onBack={() => navigation.goBack()}
      />

      {loading && members.length === 0 ? (
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

          {group ? (
            <Text style={styles.slots}>
              {t('gap.members.slots', { filled: assignedShares, total: group.totalShares })}
            </Text>
          ) : null}

          {myRound ? (
            <Text style={styles.myRoundHint}>
              {t('gap.members.myRoundHint', { round: myRound.roundNo })}
            </Text>
          ) : null}

          {members.length === 0 ? (
            <Card style={styles.card}>
              <Text style={styles.muted}>{t('gap.members.empty')}</Text>
            </Card>
          ) : (
            members.map((member) => (
              <Card key={member.id} style={styles.card}>
                <View style={styles.memberHeader}>
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{member.name}</Text>
                    <Text style={styles.muted}>{member.phone}</Text>
                  </View>
                  <Text style={styles.shareCount}>
                    {t('gap.groups.shares', { count: member.shares?.length ?? 0 })}
                  </Text>
                </View>

                <View style={styles.guarantorRow}>
                  <Feather name="shield" size={13} color={colors.textSecondary} />
                  <Text style={styles.muted}>
                    {member.guarantorName
                      ? `${t('gap.members.guarantor')}: ${member.guarantorName}`
                      : t('gap.members.noGuarantor')}
                  </Text>
                </View>

                {/* Menga bergan-bermagani — o'z davrim bo'yicha. */}
                {(() => {
                  const info = paidToMe(member);
                  if (!info) return null;
                  const tone = info.done ? colors.positive : colors.warning;
                  return (
                    <View
                      style={[
                        styles.paidRow,
                        { backgroundColor: info.done ? colors.positiveSoft : colors.dangerMuted },
                      ]}
                    >
                      <Feather
                        name={info.done ? 'check-circle' : 'clock'}
                        size={14}
                        color={tone}
                      />
                      <Text style={[styles.paidLabel, { color: tone }]}>
                        {info.done ? t('gap.members.paidMe') : t('gap.members.notPaidMe')}
                      </Text>
                      <Text style={[styles.paidAmount, { color: tone }]}>
                        {formatGapAmount(info.paid, group)}
                        {' / '}
                        {formatGapAmount(info.expected, group)}
                      </Text>
                    </View>
                  );
                })()}

                {isOrganizer && isDraft ? (
                  <View style={styles.memberActions}>
                    <Pressable
                      onPress={() => setGuarantorFor(member)}
                      style={({ pressed }) => [styles.smallAction, { opacity: pressed ? 0.8 : 1 }]}
                    >
                      <Text style={styles.smallActionText}>{t('gap.members.assignGuarantor')}</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => runAction(() => removeGapMember(groupId, member.id, profile?.jwt))}
                      style={({ pressed }) => [styles.smallAction, { opacity: pressed ? 0.8 : 1 }]}
                    >
                      <Text style={[styles.smallActionText, { color: colors.danger }]}>
                        {t('gap.members.remove')}
                      </Text>
                    </Pressable>
                  </View>
                ) : null}

                {/* Sikl o'rtasida o'rinni boshqa odam egallashi (TZ 10.3).
                    Kassani olgan a'zoni backend almashtirishga yo'l qo'ymaydi. */}
                {isOrganizer && isActive ? (
                  <View style={styles.memberActions}>
                    <Pressable
                      onPress={() => {
                        setReplaceFor(member);
                        setAddVisible(true);
                      }}
                      style={({ pressed }) => [styles.smallAction, { opacity: pressed ? 0.8 : 1 }]}
                    >
                      <Text style={styles.smallActionText}>{t('gap.members.replace')}</Text>
                    </Pressable>
                  </View>
                ) : null}
              </Card>
            ))
          )}

          {/*
            Ulushlar to'lgach qo'shish TO'XTAYDI. Backend ham rad etadi
            (gap.share.limit.exceeded), lekin bosib bo'lmaydigan tugmani
            ko'rsatib turish — foydalanuvchini xatoga taklif qilish demak.
          */}
          {isOrganizer && isDraft ? (
            slotsLeft > 0 ? (
              <Button
                title={t('gap.members.add')}
                onPress={() => setAddVisible(true)}
                variant="secondary"
                style={styles.addButton}
              />
            ) : (
              <Text style={styles.fullNote}>{t('gap.members.full')}</Text>
            )
          ) : null}

          {/*
            Navbat va almashinuv ALOHIDA ekranda. Ilgari ular bu yerda ham,
            guruh ekranida ham turardi — ikki joyda bir xil narsa ko'rinardi
            va qaysi biri "haqiqiy" ekani tushunarsiz edi.
          */}
          <Pressable
            onPress={() =>
              navigation.navigate(ROUTES.GAP_QUEUE, { groupId, groupName: group?.name })
            }
            style={({ pressed }) => [styles.linkRow, { opacity: pressed ? 0.8 : 1 }]}
          >
            <Feather name="shuffle" size={18} color={colors.textSecondary} />
            <Text style={styles.linkLabel}>{t('gap.queue.title')}</Text>
            <Feather name="chevron-right" size={18} color={colors.textSecondary} />
          </Pressable>
        </ScrollView>
      )}

      {/* --------------------------- a'zo qo'shish --------------------------- */}
      <Modal visible={addVisible} transparent animationType="slide" onRequestClose={closeAddForm}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>
              {replaceFor ? t('gap.members.replaceTitle') : t('gap.members.add')}
            </Text>
            {replaceFor ? (
              <Text style={styles.replaceHint}>
                {replaceFor.name} · {t('gap.members.replaceHint')}
              </Text>
            ) : null}
            <Input label={t('gap.members.name')} value={name} onChangeText={setName} containerStyle={styles.field} />
            <Input
              label={t('gap.members.phone')}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              containerStyle={styles.field}
            />
            <Input
              label={t('gap.members.shareCount')}
              value={shareCount}
              onChangeText={setShareCount}
              keyboardType="numeric"
              containerStyle={styles.field}
            />
            {formError ? <Text style={styles.formError}>{formError}</Text> : null}
            <View style={styles.sheetActions}>
              <Button
                title={t('common.cancel')}
                onPress={closeAddForm}
                variant="secondary"
                style={styles.sheetButton}
              />
              <Button
                title={replaceFor ? t('gap.members.replace') : t('common.add')}
                onPress={handleAdd}
                loading={busy}
                style={styles.sheetButton}
              />
            </View>
          </View>
        </View>
      </Modal>


      {/* ------------------------- kafil biriktirish ------------------------- */}
      <Modal
        visible={!!guarantorFor}
        transparent
        animationType="slide"
        onRequestClose={() => setGuarantorFor(null)}
      >
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{t('gap.members.assignGuarantor')}</Text>
            <ScrollView style={styles.guarantorList}>
              {members
                .filter((item) => item.id !== guarantorFor?.id)
                .map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => {
                      const target = guarantorFor;
                      setGuarantorFor(null);
                      if (target) {
                        runAction(() =>
                          assignGapGuarantor(groupId, target.id, item.id, profile?.jwt),
                        );
                      }
                    }}
                    style={({ pressed }) => [styles.guarantorRowItem, { opacity: pressed ? 0.8 : 1 }]}
                  >
                    <Text style={styles.memberName}>{item.name}</Text>
                    <Feather name="chevron-right" size={18} color={colors.textSecondary} />
                  </Pressable>
                ))}
            </ScrollView>
            <Button
              title={t('common.cancel')}
              onPress={() => setGuarantorFor(null)}
              variant="secondary"
            />
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
    card: { marginBottom: spacing.sm, gap: spacing.xxs },
    slots: {
      ...typography.caption,
      color: colors.textSecondary,
      marginBottom: spacing.xs,
    },
    memberHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.xs,
    },
    memberInfo: { flex: 1 },
    memberName: {
      ...typography.body,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    shareCount: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    muted: {
      ...typography.bodySmall,
      color: colors.textSecondary,
    },
    myRoundHint: {
      ...typography.caption,
      color: colors.primaryPressed,
      backgroundColor: colors.primarySoft,
      borderRadius: radius.md,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      marginBottom: spacing.sm,
    },
    paidRow: {
      flexDirection: 'row',
      alignItems: 'center',
      // Uzun summa ("1 000 000 so'm / 1 000 000 so'm") qatordan chiqib
      // ketmasin - tor ekranda keyingi satrga tushadi.
      flexWrap: 'wrap',
      gap: spacing.xxs,
      marginTop: spacing.xs,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: radius.md,
    },
    paidLabel: {
      ...typography.caption,
      fontWeight: '700',
      flex: 1,
    },
    paidAmount: {
      ...typography.bodySmall,
      fontWeight: '700',
    },
    guarantorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xxs,
      marginTop: spacing.xxs,
    },
    memberActions: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.xs,
      paddingTop: spacing.xs,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    smallAction: { paddingVertical: 4 },
    smallActionText: {
      ...typography.caption,
      fontWeight: '700',
      color: colors.primary,
    },
    addButton: { marginBottom: spacing.md },
    fullNote: {
      ...typography.caption,
      color: colors.textSecondary,
      textAlign: 'center',
      paddingVertical: spacing.sm,
      marginBottom: spacing.xs,
    },
    sectionTitle: {
      ...typography.heading2,
      fontSize: 17,
      color: colors.textPrimary,
      marginTop: spacing.xs,
      marginBottom: spacing.xs,
    },
    queueRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.xs,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    positionBadge: {
      width: 28,
      height: 28,
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
    queueInfo: { flex: 1 },
    riskNote: {
      ...typography.caption,
      color: colors.warning,
    },
    swapHint: {
      ...typography.caption,
      color: colors.primary,
      fontWeight: '600',
    },
    swapRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.xs,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    swapActions: {
      flexDirection: 'row',
      gap: spacing.xxs,
    },
    acceptButton: {
      width: 30,
      height: 30,
      borderRadius: radius.sm,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rejectButton: {
      width: 30,
      height: 30,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: colors.danger,
      alignItems: 'center',
      justifyContent: 'center',
    },
    replaceHint: {
      ...typography.caption,
      color: colors.textSecondary,
      marginBottom: spacing.sm,
    },
    formError: {
      ...typography.bodySmall,
      color: colors.danger,
      marginBottom: spacing.xs,
    },
    linkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
    },
    linkLabel: {
      ...typography.body,
      color: colors.textPrimary,
      flex: 1,
    },
    queueActions: {
      flexDirection: 'row',
      gap: spacing.xs,
      marginTop: spacing.xs,
    },
    queueButton: { flex: 1 },
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
    field: { marginBottom: spacing.sm },
    sheetActions: {
      flexDirection: 'row',
      gap: spacing.xs,
      marginTop: spacing.xs,
    },
    sheetButton: { flex: 1 },
    guarantorList: { marginBottom: spacing.sm },
    guarantorRowItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
  });

export default GapMembersScreen;
