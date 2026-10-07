import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  type ListRenderItem,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NestedGlass, useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import { SkeletonContactList } from '../../../shared/ui/SkeletonShimmer';
import AmbientBackground from '../../../shared/ui/AmbientBackground';
import { FAB_CLEARANCE } from '../../../shared/ui/fabLayout';
import EmptyState from '../../../shared/ui/EmptyState';
import EntranceView from '../../../shared/ui/EntranceView';
import SectionHeader from '../../../shared/ui/SectionHeader';
import ScreenTopBar from '../../../app/components/ScreenTopBar';
import { useRegisterVoiceAction } from '../../voice/model/VoiceActionProvider';
import FloatingActionButton from '../../../shared/ui/FloatingActionButton';
import { ROUTES } from '../../../app/navigation/routes';
import type { GapNavigation } from '../../../app/navigation/types';
import { useGapSummary, useGapUnits, useMyGaps } from '../hooks/useGap';
import GapSummaryCard from '../components/GapSummaryCard';
import GapRow from '../components/GapRow';
import GapCreateModal from '../components/GapCreateModal';
import {
  GapResponseDTO,
  GapSort,
  GapSortDirection,
  GapUnitFilter,
  toAmount,
} from '../types/gap';
import type { VoiceGapMember, VoiceIntent } from '../../voice/api/voice';
import {
  resolveGapCommand,
  type GapVoiceCommand,
  type GapVoicePrefill,
} from '../../voice/model/resolveGapCommand';
import { clearPendingIntent, savePendingIntent, takePendingIntent } from '../../voice/model/pendingVoice';
import GapVoiceResultModal from '../../voice/components/GapVoiceResultModal';

/**
 * Gap kassa bosh ekrani.
 *
 * Odatiy holat — 'ALL': foydalanuvchi obuna bo'lgan BARCHA gap kassalar
 * ko'rinadi, statistika esa har valyutani alohida qator qilib chiqaradi.
 * Valyuta tanlansa ikkalasi ham o'sha valyutaga qisqaradi.
 */
const GapListScreen: React.FC<{ navigation: GapNavigation }> = ({ navigation }) => {
  const theme = useAppTheme();
  const { colors } = theme;
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [unitCode, setUnitCode] = useState<GapUnitFilter>('ALL');
  const [sort, setSort] = useState<GapSort | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [createVisible, setCreateVisible] = useState(false);

  const unitsQuery = useGapUnits();
  const summaryQuery = useGapSummary(unitCode);
  const listQuery = useMyGaps(unitCode);

  const isBusy = listQuery.isLoading;

  /**
   * Statistikadagi raqamga bosilsa, ro'yxat o'sha ko'rsatkich bo'yicha
   * eng kattadan saralanadi — Qarzlar ekranidagi bilan bir xil xatti-harakat.
   * Saralash yo'q bo'lsa odatiy tartib (yangi guruh birinchi) saqlanadi.
   */
  const items = useMemo(() => {
    const list = listQuery.data?.content ?? [];
    if (!sort) return list;
    // Bosilgan raqam bitta birlikka tegishli — solishtirish ham faqat
    // o'sha birlik bo'yicha. So'm bilan dollarni taqqoslab bo'lmaydi.
    const value = (item: GapResponseDTO) => {
      const source = sort.direction === 'received' ? item.myTotalReceived : item.myTotalGiven;
      const match = (source ?? []).find((entry) => entry.unitCode === sort.unitCode);
      return match ? toAmount(match.amount) : 0;
    };
    return [...list].sort((a, b) => value(b) - value(a));
  }, [listQuery.data, sort]);

  /** Bir xil raqam qayta bosilsa saralash bekor bo'ladi. */
  const handleAmountPress = useCallback(
    (direction: GapSortDirection, unit: string) => {
      setSort((prev) =>
        prev && prev.direction === direction && prev.unitCode === unit
          ? null
          : { direction, unitCode: unit }
      );
      // Bosilgan raqam bitta birlikka tegishli — ro'yxat ham o'shanga qisqaradi.
      setUnitCode(unit);
    },
    []
  );

  // ---- Ovozli buyruq ----

  const [voiceCommand, setVoiceCommand] = useState<GapVoiceCommand | null>(null);
  const [voiceTranscript, setVoiceTranscript] = useState('');

  const openMemberWithVoice = useCallback(
    (member: VoiceGapMember, prefill: GapVoicePrefill) => {
      setVoiceCommand(null);
      navigation.navigate(ROUTES.GAP_MEMBER, {
        memberId: member.memberId,
        groupId: member.groupId,
        memberName: member.memberName,
        unitCode: member.unitCode,
        unitLabel: member.unitLabel,
        unitType: member.unitType,
        voice: prefill,
      });
    },
    [navigation]
  );

  /**
   * Aytilgani tushunilgach.
   *
   * A'zo aniq bo'lsa — to'g'ridan-to'g'ri uning ekraniga o'tamiz. Aks
   * holda natija oynasi chiqadi: dastur taxmin qilmaganda odam NIMA
   * bo'lganini ko'rishi kerak, aks holda tugma "ishlamadi" deb qabul
   * qilinardi.
   */
  const handleVoiceResult = useCallback(
    (intent: VoiceIntent, persist = true) => {
      // Tanilgan gap darhol saqlanadi: ovozni yuborish pul turadi va
      // shu daqiqadan keyin dastur yopilsa ham, uni qaytadan aytish
      // kerak bo'lmasligi lozim.
      if (persist) void savePendingIntent(intent);

      const command = resolveGapCommand(intent);
      setVoiceTranscript(intent.text ?? '');

      if (command.kind === 'OPEN_MEMBER') {
        openMemberWithVoice(command.member, command.prefill);
        return;
      }
      setVoiceCommand(command);
    },
    [openMemberWithVoice]
  );

  /** Dastur qayta ishga tushganda yoki qulf ochilganda gap tiklanadi. */
  useEffect(() => {
    let alive = true;
    takePendingIntent().then((intent) => {
      if (alive && intent?.gapOutcome) handleVoiceResult(intent, false);
    });
    return () => {
      alive = false;
    };
  }, [handleVoiceResult]);

  /**
   * Ovoz tugmasi pastki panelda - bu ekrandan tashqarida. Natijani esa
   * shu ekran qayta ishlaydi (ism kassa a'zolari orasidan qidiriladi),
   * shuning uchun ishlovchi fokusdalik paytida e'lon qilinadi.
   */
  const voiceAction = useMemo(
    () => ({ kind: 'GAP' as const, onResult: handleVoiceResult }),
    [handleVoiceResult],
  );
  useRegisterVoiceAction(voiceAction);

  const handleRefresh = useCallback(() => {
    summaryQuery.refetch();
    listQuery.refetch();
  }, [summaryQuery, listQuery]);

  const openDetail = useCallback(
    (item: GapResponseDTO) => {
      navigation.navigate(ROUTES.GAP_DETAIL, {
        id: item.id,
        name: item.name,
        unitCode: item.unitCode,
        unitLabel: item.unitLabel,
        unitType: item.unitType,
        organizer: item.organizer,
      });
    },
    [navigation]
  );

  const renderItem: ListRenderItem<GapResponseDTO> = useCallback(
    ({ item, index }) => (
      <View
        style={[
          styles.rowSlice,
          index === 0 && styles.rowFirst,
          index === items.length - 1 && styles.rowLast,
        ]}
      >
        <GapRow
          item={item}
          isLast={index === items.length - 1}
          expanded={expanded}
          onPress={openDetail}
        />
      </View>
    ),
    [openDetail, items.length, expanded, styles]
  );

  const keyExtractor = useCallback((item: GapResponseDTO) => item.id, []);
  // Karta ortidagi yagona muzli shisha (qatorlar orasida chok qolmasin).

  return (
    <View style={styles.container}>
      {/* Dekorativ fon — barcha bosh ekranlarda bir xil "imzo" qatlami. */}
      <AmbientBackground />

      <EntranceView style={styles.header} duration={300} fromY={12}>
        {/* Ish maydoni almashtirgichi barcha bosh ekranlarda bir xil joyda va
            bir xil ko'rinishda turadi — chetdan chetga, sarlavhadan yuqorida. */}
        <ScreenTopBar />
        <View style={styles.headerRow}>
          <View style={styles.titleWrap}>
            <Text style={styles.title} numberOfLines={1}>
              {t('gap.title')}
            </Text>
          </View>
        </View>
        <GapSummaryCard
          summary={summaryQuery.data}
          units={unitsQuery.data ?? []}
          unitCode={unitCode}
          onUnitChange={(next) => {
            setUnitCode(next);
            setSort(null);
          }}
          sort={sort}
          onAmountPress={handleAmountPress}
          loading={summaryQuery.isLoading}
          expanded={expanded}
          onToggleExpand={() => setExpanded((prev) => !prev)}
        />

        <View style={styles.sectionWrap}>
          <SectionHeader icon="people" iconBadge={false} title={t('gap.section')} />
        </View>
      </EntranceView>

      <NestedGlass>
        <FlatList
          style={styles.list}
          contentContainerStyle={styles.listCard}
          data={items}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          showsVerticalScrollIndicator={false}
          initialNumToRender={12}
          windowSize={11}
          refreshControl={
            <RefreshControl
              refreshing={listQuery.isFetching && !isBusy}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyCard}>
            {/* Skeleton faqat BIRINCHI yuklashda: mavjud ro'yxat fon
                yangilanishida kulrang chiziqlarga almashmaydi. */}
            {isBusy ? (
              <SkeletonContactList count={4} />
            ) : (
              <EmptyState
                icon="people-outline"
                title={t('gap.empty')}
                description={t('gap.emptyHint')}
              />
            )}
            </View>
          }
        />
      </NestedGlass>

      {/* Yangi gap to'yona. Tugma barcha ekranlar bilan bitta komponentdan. */}
      <FloatingActionButton
        onPress={() => setCreateVisible(true)}
        accessibilityLabel={t('gap.createTitle')}
        pulse={!isBusy && items.length === 0}
      />

      <GapVoiceResultModal
        command={voiceCommand}
        transcript={voiceTranscript}
        onPickMember={(member) => {
          if (!voiceCommand) return;
          openMemberWithVoice(member, voiceCommand.prefill);
        }}
        onClose={() => {
          setVoiceCommand(null);
          // Yopish "kerak emas" degani - qayta ochilmasin.
          void clearPendingIntent();
        }}
      />

      <GapCreateModal visible={createVisible} onClose={() => setCreateVisible(false)} />
    </View>
  );
};

const createStyles = ({ colors, spacing, radius, typography, glass, activeTheme }: ThemeValue) =>
  StyleSheet.create({
    container: {
      flex: 1,
      // Fon AmbientBackground'dan keladi — tekis rang berilmaydi.
      backgroundColor: 'transparent',
    },
    header: {
      backgroundColor: 'transparent',
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.xxs,
    },
    /**
     * Sarlavha O'Z SIRTIDA.
     *
     * U kartalardan tashqarida, to'g'ridan-to'g'ri fon ustida turadi.
     * Kontur (matn soyasi) ingichka va to'q rasmda to'q matnni
     * qutqarmasdi - sirt esa kafolat beradi.
     *
     * Kenglik MAZMUNGA qarab: butun qator bo'ylab cho'zilsa, u sarlavha
     * emas, bo'sh panel bo'lib ko'rinardi.
     */
    titleWrap: {
      alignSelf: 'flex-start',
      paddingVertical: spacing.xxs,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.lg,
      ...glass.surface,
      flexShrink: 1,
      minWidth: 0,
    },
    title: {
      ...typography.display,
      color: colors.textPrimary,
    },
    sectionWrap: {
      marginTop: spacing.sm,
    },
    list: {
      flex: 1,
    },
    // Ro'yxat tugagach karta ham tugaydi, ostida fon ko'rinadi va "+" tugmasi
    // o'sha bo'sh joyda suzadi.
    // Bo'shliq KARTA ICHIDA (padding), tashqarisida (margin) EMAS:
    // react-native `contentContainerStyle` dagi margin'ni aylantiriladigan
    // balandlikka QO'SHMAYDI — ro'yxat oxiriga yetilganda bo'shliq umuman
    // paydo bo'lmasdi va oxirgi qator "+" tugmasi ostida qolaverardi.
    // Padding esa kontent o'lchamiga kiradi, shuning uchun ishlaydi
    // (Xarajatlar bo'limi boshidan shunday qilingan).
    // Bo'sh holat va skeleton ilgari karta ICHIDA chizilardi. Karta endi
    // qatorlardan yig'ilgani uchun ular yalang'och fonda qolmasin — o'ziga
    // xos karta sirtini shu yerda beramiz.
    emptyCard: {
      ...glass.pane,
      borderRadius: radius.xxl,
      marginHorizontal: spacing.md,
      overflow: 'hidden',
    },
    // Ro'yxat kontenti: karta emas, faqat pastki bo'shliq.
    listCard: {
      paddingBottom: FAB_CLEARANCE,
    },
    // Karta qatorlarning o'zidan yig'iladi: birinchi qator tepasi, oxirgisi
    // pasti yumaloq. Shu sababli karta oxirgi qatorda TUGAYDI va ostidagi
    // bo'shliq undan tashqarida qoladi — "+" fon ustida suzadi.
    // Ilgari karta kontent konteyneri edi, bo'shliq uning ichiga tushib
    // karta ekran ostiga yopishib qolardi.
    rowSlice: {
      // Sirt MAVZUDAN olinadi, xom tokendan emas: daraja o'zgarsa
      // qator ham u bilan birga o'zgaradi.
      backgroundColor: glass.surface.backgroundColor,
      marginHorizontal: spacing.md,
    },
    rowFirst: {
      borderTopLeftRadius: radius.xxl,
      borderTopRightRadius: radius.xxl,
      overflow: 'hidden',
    },
    rowLast: {
      borderBottomLeftRadius: radius.xxl,
      borderBottomRightRadius: radius.xxl,
      overflow: 'hidden',
    },
  });

export default GapListScreen;
