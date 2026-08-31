import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  type ListRenderItem,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenHeader from '../../../shared/ui/ScreenHeader';
import { SkeletonCardList } from '../../../shared/ui/SkeletonShimmer';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import type { GapScreenProps } from '../../../app/navigation/types';
import { ROUTES } from '../../../app/navigation/routes';
import Button from '../../../shared/ui/Button';
import GapMemberFormModal from '../components/GapMemberFormModal';
import GapReceiverPickerModal from '../components/GapReceiverPickerModal';
import {
  useAddGapMember,
  useCloseGapPeriod,
  useGapGroup,
  useGapMembers,
  useRedrawPeriod,
  useSetPeriodReceiver,
  useStartGap,
} from '../hooks/useGap';
import GapMemberRow from '../components/GapMemberRow';
import type { GapMemberDTO, GapUnit } from '../types/gap';

/**
 * Gap kassa ichi — a'zolar ro'yxati.
 *
 * Ekranda ataylab faqat to'rt narsa bor: ism-familiya, telefon, shu oygi
 * to'lov summasi va to'ladi/to'lamadi holati.
 */
const GapDetailScreen: React.FC<GapScreenProps<typeof ROUTES.GAP_DETAIL>> = ({
  navigation,
  route,
}) => {
  const theme = useAppTheme();
  const { colors } = theme;
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const { id, name, unitCode, unitLabel, unitType } = route.params;

  /**
   * O'zgaruvchan maydonlar backenddan olinadi, route parametri esa faqat
   * birinchi render uchun zaxira: shunda ekran yangilangach o'z joyida
   * qoladi va foydalanuvchini ro'yxatga qaytarishga hojat qolmaydi.
   */
  const groupQuery = useGapGroup(id);
  const group = groupQuery.data;
  const currentPeriod = group?.currentPeriod ?? route.params.currentPeriod;
  const totalPeriods = group?.totalPeriods ?? route.params.totalPeriods;
  const status = group?.status ?? route.params.status;
  const queueMode = group?.queueMode ?? route.params.queueMode;
  const organizer = group?.organizer ?? route.params.organizer;
  const unit: GapUnit = useMemo(
    () => ({ code: unitCode, label: unitLabel, type: unitType }),
    [unitCode, unitLabel, unitType]
  );

  const startMutation = useStartGap();
  const addMemberMutation = useAddGapMember(id);
  const receiverMutation = useSetPeriodReceiver(id);
  const redrawMutation = useRedrawPeriod(id);
  const closeMutation = useCloseGapPeriod(id);
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const isDraft = status === 'DRAFT';

  const membersQuery = useGapMembers(id);
  const members = membersQuery.data ?? [];

  const openMember = useCallback(
    (member: GapMemberDTO) => {
      navigation.navigate(ROUTES.GAP_MEMBER, {
        shareId: member.shareId,
        memberName: member.memberName,
        unitCode,
        unitLabel,
        unitType,
      });
    },
    [navigation, unitCode, unitLabel, unitType]
  );

  // Joriy davrning oluvchisi belgilanganmi — a'zolar ro'yxatidan chiqariladi.
  // Belgilanmagan bo'lsa to'lov qatorlari hali yo'q, ya'ni "to'lamadi" emas.
  const periodReady = members.some((member) => member.receiverThisPeriod);

  /**
   * Navbati hali belgilanmagan ENG YAQIN davr.
   *
   * "Har oyda" rejimida navbat davr-ma-davr belgilanadi, shuning uchun bittasini
   * belgilagach tugma yo'qolmasligi kerak — u keyingi ochiq davrga o'tadi.
   * Belgilangan davrlar `queuePosition` orqali bilinadi: oluvchi tayinlanganda
   * uning ulushiga o'sha davr raqami yoziladi.
   */
  const nextOpenPeriod = useMemo(() => {
    const taken = new Set(
      members.map((member) => member.queuePosition).filter((n): n is number => n != null)
    );
    for (let period = 1; period <= totalPeriods; period++) {
      if (!taken.has(period)) return period;
    }
    return null;
  }, [members, totalPeriods]);

  /**
   * Eng oxirgi belgilangan davr va uning oluvchisi.
   *
   * Qayta qur'a shunga tegishli: qur'a ULUSHni tanlaydi, bir odamda esa ikki
   * ulush bo'lishi mumkin — o'shanda guruh qayta tashlashni xohlashi normal.
   * Backend faqat to'lov boshlanmagan davrga ruxsat beradi.
   */
  const lastAssigned = useMemo(() => {
    let best: GapMemberDTO | null = null;
    for (const member of members) {
      if (member.queuePosition == null) continue;
      if (best == null || member.queuePosition > (best.queuePosition ?? 0)) best = member;
    }
    return best;
  }, [members]);

  /**
   * Qayta qur'a faqat almashtirishga NOMZOD BOR bo'lsa mumkin.
   *
   * Barcha o'rin to'lgach yangi qur'ada qatnashadigan ulush qolmaydi va
   * backend "boshqa a'zo qolmadi" deb rad etadi — tugmani ko'rsatib turib
   * xato chiqarish o'rniga uni yashiramiz.
   */
  const canRedraw =
    organizer &&
    queueMode === 'MONTHLY' &&
    status === 'ACTIVE' &&
    lastAssigned != null &&
    members.some((member) => member.queuePosition == null);

  /**
   * Kelgusi davrni oldindan belgilash — bu ixtiyoriy, shuning uchun asosiy
   * tugma emas, yordamchi havola. Joriy davr navbati ochiq bo'lsa u yerda
   * baribir asosiy amal sifatida chiqadi, takrorlash shart emas.
   */
  const futureOpenPeriod =
    nextOpenPeriod != null && nextOpenPeriod !== currentPeriod ? nextOpenPeriod : null;

  /** Ko'rsatiladigan xato — qaysi amal yiqilgan bo'lsa o'shaniki. */
  const actionError =
    (receiverMutation.error as Error | null)?.message ??
    (redrawMutation.error as Error | null)?.message ??
    (closeMutation.error as Error | null)?.message ??
    null;

  // Navbat tugmalari: faqat tashkilotchiga, faqat "har oyda" rejimida
  // va ochiq davr qolgan bo'lsa (TZ 11).
  const canSetQueue =
    organizer && queueMode === 'MONTHLY' && status === 'ACTIVE' && !periodReady;

  /**
   * Davrni yopish: navbat belgilangan bo'lsa keyingi oyga o'tish mumkin.
   * Qolgan to'lovlar bilan nima bo'lishini guruh qoidasi hal qiladi (TZ 10.1),
   * shuning uchun tugma bu yerda to'siqsiz — qoidani backend qo'llaydi.
   */
  const canClosePeriod =
    organizer && status === 'ACTIVE' && periodReady && currentPeriod <= totalPeriods;

  // Har bir ulush sikl davomida bir marta oladi — navbati kelganlar chiqmaydi.
  const candidates = useMemo(
    () => members.filter((member) => member.queuePosition == null),
    [members]
  );

  const assignReceiver = useCallback(
    (shareId: string | null) => {
      if (nextOpenPeriod == null) return;
      receiverMutation.mutate(
        { periodNumber: nextOpenPeriod, shareId },
        { onSuccess: () => setPickerOpen(false) }
      );
    },
    [receiverMutation, nextOpenPeriod]
  );

  const renderItem: ListRenderItem<GapMemberDTO> = useCallback(
    ({ item }) => (
      <GapMemberRow item={item} unit={unit} periodReady={periodReady} onPress={openMember} />
    ),
    [unit, periodReady, openMember]
  );

  const keyExtractor = useCallback((item: GapMemberDTO) => item.shareId, []);

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={name}
        subtitle={
          isDraft
            ? t('gap.draftHint')
            : status === 'FINISHED'
              ? t('gap.finished')
              : t('gap.periodOf', {
                  current: String(currentPeriod),
                  total: String(totalPeriods),
                })
        }
        onBack={navigation.goBack}
      />

      <FlatList
        style={styles.list}
        contentContainerStyle={styles.listCard}
        data={membersQuery.isLoading ? [] : members}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        showsVerticalScrollIndicator={false}
        initialNumToRender={12}
        windowSize={11}
        refreshControl={
          <RefreshControl
            refreshing={membersQuery.isFetching && !membersQuery.isLoading}
            onRefresh={membersQuery.refetch}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          membersQuery.isLoading ? (
            <SkeletonCardList count={5} containerStyle={styles.listSkeleton} />
          ) : (
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={26} color={colors.textSecondary} />
              <Text style={styles.emptyText}>
                {isDraft ? t('gap.membersEmptyDraft') : t('gap.membersEmpty')}
              </Text>
            </View>
          )
        }
      />

      {/*
        Pastki amal paneli — bitta bar.

        Ilgari uchta panel ustma-ust turardi va ekran pastini egallab olgandi.
        Endi bitta asosiy tugma qoladi, ixtiyoriy amallar esa uning ustidagi
        mayda havolalarga yig'ilgan: bosqichda nima qilish kerakligi darrov
        ko'rinadi, qolgani ko'zni chalg'itmaydi.
      */}
      {isDraft || canSetQueue || canClosePeriod ? (
        <View style={styles.actionBar}>
          {actionError ? <Text style={styles.actionError}>{actionError}</Text> : null}

          {/* Ixtiyoriy amallar: faqat asosiy qadam bloklanmagan bo'lsa */}
          {!isDraft && !canSetQueue && (canRedraw || futureOpenPeriod != null) ? (
            <View style={styles.links}>
              {canRedraw ? (
                <Pressable
                  onPress={() => redrawMutation.mutate(lastAssigned?.queuePosition ?? null)}
                  disabled={redrawMutation.isPending}
                  accessibilityRole="button"
                >
                  <Text style={styles.link}>{t('gap.redraw')}</Text>
                </Pressable>
              ) : null}
              {canRedraw && futureOpenPeriod != null ? (
                <Text style={styles.linkDot}>·</Text>
              ) : null}
              {futureOpenPeriod != null ? (
                <Pressable onPress={() => setPickerOpen(true)} accessibilityRole="button">
                  <Text style={styles.link}>
                    {t('gap.queueNextShort', { period: String(futureOpenPeriod) })}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {isDraft ? (
            <>
              <View style={styles.links}>
                <Pressable onPress={() => setMemberModalOpen(true)} accessibilityRole="button">
                  <Text style={styles.link}>{t('gap.addMember')}</Text>
                </Pressable>
              </View>
              <Button
                title={t('gap.start')}
                onPress={() => startMutation.mutate(id)}
                loading={startMutation.isPending}
                disabled={members.length < 2}
              />
            </>
          ) : canSetQueue ? (
            /* Navbat belgilanmaguncha boshqa amal ma'nosiz — shu bosqich bloklovchi */
            <View style={styles.row}>
              <View style={styles.cell}>
                <Button
                  title={t('gap.setQueue')}
                  variant="outline"
                  onPress={() => setPickerOpen(true)}
                />
              </View>
              <View style={styles.cell}>
                <Button
                  title={t('gap.drawLots')}
                  onPress={() => assignReceiver(null)}
                  loading={receiverMutation.isPending && !pickerOpen}
                />
              </View>
            </View>
          ) : (
            <>
              {/* Yopish qaytarib bolmaydigan amal - ogohlantirish qoladi (TZ 09) */}
              <Text style={styles.actionHint}>{t('gap.closePeriodHint')}</Text>
              <Button
                title={t('gap.closePeriod')}
                onPress={() => closeMutation.mutate()}
                loading={closeMutation.isPending}
              />
            </>
          )}
        </View>
      ) : null}

      <GapReceiverPickerModal
        visible={pickerOpen}
        candidates={candidates}
        periodNumber={nextOpenPeriod ?? currentPeriod}
        loading={receiverMutation.isPending}
        onClose={() => setPickerOpen(false)}
        onPick={assignReceiver}
      />

      <GapMemberFormModal
        visible={memberModalOpen}
        loading={addMemberMutation.isPending}
        error={addMemberMutation.error ? (addMemberMutation.error as Error).message : null}
        onClose={() => setMemberModalOpen(false)}
        onSubmit={(value) =>
          addMemberMutation.mutate(value, { onSuccess: () => setMemberModalOpen(false) })
        }
      />
    </View>
  );
};

const createStyles = ({ colors, spacing, radius, typography }: ThemeValue) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    list: {
      flex: 1,
    },
    listCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      marginHorizontal: spacing.md,
      marginBottom: spacing.md,
      overflow: 'hidden',
    },
    listSkeleton: {
      padding: spacing.md,
    },
    empty: {
      alignItems: 'center',
      paddingVertical: spacing.xl,
      gap: spacing.sm,
    },
    emptyText: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    actionBar: {
      padding: spacing.md,
      gap: spacing.xs,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    actionHint: {
      ...typography.caption,
      fontSize: 11,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    actionError: {
      ...typography.caption,
      fontSize: 11,
      color: colors.danger,
      textAlign: 'center',
    },
    links: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
    },
    link: {
      ...typography.caption,
      fontSize: 12,
      fontWeight: '700',
      color: colors.primary,
      paddingVertical: 2,
    },
    linkDot: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    row: {
      flexDirection: 'row',
      gap: spacing.xs,
    },
    cell: {
      flex: 1,
    },
  });

export default GapDetailScreen;
