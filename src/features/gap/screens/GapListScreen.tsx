import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  type ListRenderItem,
  RefreshControl,
  StyleSheet,
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
import SearchField from '../../../shared/ui/SearchField';
import ScreenTopBar from '../../../app/components/ScreenTopBar';
import { useRegisterVoiceAction } from '../../voice/model/VoiceActionProvider';
import FloatingActionButton from '../../../shared/ui/FloatingActionButton';
import { ROUTES } from '../../../app/navigation/routes';
import type { GapNavigation } from '../../../app/navigation/types';
import { useGapSummary, useGapUnits, useMyGaps } from '../hooks/useGap';
import GapSummaryCard from '../components/GapSummaryCard';
import GapRow from '../components/GapRow';
import GapCreateModal from '../components/GapCreateModal';
// Balans kartasi Qarzlar ekranidan QAYTA ISHLATILADI: ikkala ekranda bir xil
// ko'rinishi talab, nusxasi esa vaqt o'tib ajralib ketardi.
import BalanceHero, { HERO_OVERLAP } from '../../debts/components/BalanceHero';
import { useCurrency } from '../../debts/context/CurrencyContext';
import {
  GapResponseDTO,
  GapSort,
  GapSortDirection,
  GapUnitFilter,
  hasGoods,
  moneyAmounts,
  netByUnit,
  splitNet,
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
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<GapSort | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [createVisible, setCreateVisible] = useState(false);

  const unitsQuery = useGapUnits();
  const summaryQuery = useGapSummary(unitCode);
  const listQuery = useMyGaps(unitCode);

  const isBusy = listQuery.isLoading;

  /**
   * Tepadagi UMUMIY BALANS uchun sof qoldiqning PUL qismi.
   *
   * Karta ichidagi kataklar bilan bir manbadan hisoblanadi (`netByUnit` ->
   * `splitNet`), aks holda tepadagi raqam pastdagi qatorlar bilan mos
   * kelmay qolardi. Mahsulot (GOODS) qatorlari bu yerda tushib qoladi:
   * ularni so'mga aylantirib bo'lmaydi. Shunday qator bo'lsa, hero ostida
   * izoh chiqadi — katta raqam hamma narsani qamramaganini odam bilsin.
   */
  const { baseCurrency } = useCurrency();
  const heroTotals = useMemo(() => {
    const net = netByUnit(summaryQuery.data?.totalGiven, summaryQuery.data?.totalReceived);
    const { haq, qarz } = splitNet(net);
    return {
      totalCredit: moneyAmounts(haq),
      totalDebt: moneyAmounts(qarz),
      goods: hasGoods(net),
    };
  }, [summaryQuery.data]);

  /**
   * Statistikadagi raqamga bosilsa, ro'yxat o'sha ko'rsatkich bo'yicha
   * eng kattadan saralanadi — Qarzlar ekranidagi bilan bir xil xatti-harakat.
   * Saralash yo'q bo'lsa odatiy tartib (yangi guruh birinchi) saqlanadi.
   */
  /**
   * Qidiruv QURILMADA filtrlaydi, serverga so'rov yubormaydi.
   *
   * Qarzlar ekranida kontaktlar minglab bo'lishi mumkin va u yerda
   * qidiruvni backend bajaradi. Guruhlar esa sanoqli va ro'yxat allaqachon
   * to'liq yuklangan: shu sababli filtr darhol ishlaydi, eng kam harf
   * sharti ham, kutish ham kerak emas.
   *
   * Faqat NOM bo'yicha: boshqa ustunlar (a'zo soni, summa) yozib
   * qidiriladigan narsa emas.
   */
  const items = useMemo(() => {
    const all = listQuery.data?.content ?? [];
    const needle = query.trim().toLowerCase();
    const list = needle
      ? all.filter((item) => item.name.toLowerCase().includes(needle))
      : all;
    if (!sort) return list;
    // Bosilgan raqam bitta birlikka tegishli — solishtirish ham faqat
    // o'sha birlik bo'yicha. So'm bilan dollarni taqqoslab bo'lmaydi.
    const value = (item: GapResponseDTO) => {
      const source = sort.direction === 'received' ? item.myTotalReceived : item.myTotalGiven;
      const match = (source ?? []).find((entry) => entry.unitCode === sort.unitCode);
      return match ? toAmount(match.amount) : 0;
    };
    return [...list].sort((a, b) => value(b) - value(a));
  }, [listQuery.data, query, sort]);

  /** Ro'yxatni qisqartirib turgan biror narsa bormi. */
  const hasActiveFilter = query.trim().length > 0 || unitCode !== 'ALL' || sort !== null;

  /** Uchala filtrni birdan tozalaydi — to'liq ro'yxatga qaytish yo'li. */
  const handleShowAll = useCallback(() => {
    setQuery('');
    setUnitCode('ALL');
    setSort(null);
  }, []);

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
        {/* Sarlavha ALMASHTIRGICH QATORIDA, alohida blok emas: u ekranda
            o'ziga bir qator egallab turardi va ro'yxat shuncha pastga
            surilardi. */}
        <ScreenTopBar title={t('gap.title')} />
        {/* BALANS BLOKI: Qarzlar ekranidagi bilan bir xil — tepada yakuniy
            raqam, ostida tafsilot kartasi unga MINIB turadi. */}
        <BalanceHero
          totalDebt={heroTotals.totalDebt}
          totalCredit={heroTotals.totalCredit}
          currency={baseCurrency}
          note={heroTotals.goods ? t('gap.goodsSeparate') : undefined}
        />
        <View style={styles.summaryOverlap}>
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
        </View>

        {/* "Barchasi" — qidiruv, birlik filtri va saralashni tozalaydi:
            filtr qolib ketgani sezilmay, odam "guruhlarim qani" deb
            o'ylardi. */}
        <View style={styles.sectionWrap}>
          <SectionHeader
            icon="people"
            iconBadge={false}
            title={t('gap.section')}
            actionLabel={hasActiveFilter ? t('gap.seeAll') : undefined}
            actionIcon="chevron-forward"
            onAction={hasActiveFilter ? handleShowAll : undefined}
          />
        </View>
        {/* QIDIRUV: Qarzlar ekranidagi bilan bir xil maydon va bir xil
            joyda — balans blokidan keyin, bo'lim sarlavhasidan oldin.
            Rejim almashtirgichi YO'Q: u yerda ism/telefon tanlovi uchun
            kerak, guruhda esa telefon degan narsa yo'q. */}
        <View style={styles.searchRow}>
          <SearchField
            value={query}
            onChangeText={setQuery}
            placeholder={t('gap.searchPlaceholder')}
            accessibilityLabel={t('gap.searchPlaceholder')}
          />
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
            ) : hasActiveFilter ? (
              // Qidiruvning bo'sh natijasi — "hali guruh yo'q" dan BOSHQA
              // holat: bu yerda "+" tugmasiga undash noo'rin bo'lardi.
              <EmptyState
                icon="search-outline"
                title={t('gap.noSearchResults')}
                description={t('gap.noSearchHint')}
              />
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

const createStyles = ({ colors, spacing, radius, glass, activeTheme }: ThemeValue) =>
  StyleSheet.create({
    container: {
      flex: 1,
      // Fon AmbientBackground'dan keladi — tekis rang berilmaydi.
      backgroundColor: 'transparent',
    },
    header: {
      backgroundColor: 'transparent',
    },
    /* Tafsilot kartasi balans kartasining ostki bo'shlig'iga MINADI.
       Son HERO_OVERLAP dan keladi: hero ham shuncha bo'shliq qoldiradi —
       Qarzlar ekranidagi bilan bitta manbadan. */
    summaryOverlap: {
      marginTop: -HERO_OVERLAP,
    },
    // Qarzlar ekranidagi qidiruv qatori bilan bir xil chekinishlar.
    searchRow: {
      paddingHorizontal: spacing.md,
      marginTop: spacing.xs,
      // Pastdagi bo'shliq SHART: ilgari bu o'rinda bo'lim sarlavhasi
      // turardi va bo'shliqni uning o'z `marginBottom` i berardi.
      // Sarlavha tepaga ko'chgach maydon ro'yxatga yopishib qolgandi.
      marginBottom: spacing.xs,
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
