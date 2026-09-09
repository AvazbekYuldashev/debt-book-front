import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
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
import { useFocusEffect } from '@react-navigation/native';
import AmbientBackground from '../../../shared/ui/AmbientBackground';
import EmptyState from '../../../shared/ui/EmptyState';
import EntranceView from '../../../shared/ui/EntranceView';
import FloatingActionButton from '../../../shared/ui/FloatingActionButton';
import SearchField from '../../../shared/ui/SearchField';
import SectionHeader from '../../../shared/ui/SectionHeader';
import StatusBanner from '../../../shared/ui/StatusBanner';
import { SkeletonContactList } from '../../../shared/ui/SkeletonShimmer';
import { useOnlineStatus } from '../../../shared/lib/networkStatus';
import ScreenTopBar from '../../../app/components/ScreenTopBar';
import DeviceContactsPickerModal from '../components/DeviceContactsPickerModal';
import { ContactsContext, type Contact } from '../context/ContactsContext';
import { WorkspaceContext } from '../../business/context/WorkspaceContext';
import { useContactBalances } from '../hooks/useContactBalances';
import { useNotifications } from '../../notifications/hooks/useNotifications';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { ROUTES } from '../../../app/navigation/routes';
import type { DebtsNavigation } from '../../../app/navigation/types';
import { CurrencyAmounts, netByCurrency } from '../../../shared/lib/currency';
import type { ActiveSort, SortDirection } from '../components/BalanceSummary';
import type { Currency } from '../../../shared/lib/currency';
import { confirmAction } from '../../../shared/lib/confirm';
import { canWrite } from '../../../shared/lib/permissions';
import { normalizePhone } from '../../../shared/lib/phone';
import { primeNotificationAudio } from '../../../shared/lib/webNotify';
import { requestNotificationPermission } from '../../../shared/lib/deviceNotifications';
import type { DeviceContact } from '../../../shared/lib/deviceContacts';
import { useI18n } from '../../../shared/i18n';
import BalanceSummary from '../components/BalanceSummary';
import ContactRow from '../components/ContactRow';
import ContactFormModal from '../components/ContactFormModal';
import ProfilePhotoModal from '../../profile/components/ProfilePhotoModal';
import { pickContactImage, useContactAvatars } from '../context/contactAvatars';

type Mode = 'create' | 'edit';
type SearchField = 'name' | 'phone';

const MIN_QUERY_LENGTH = 3;
const SEARCH_DEBOUNCE_MS = 300;

const DebtListScreen: React.FC<{ navigation: DebtsNavigation }> = ({ navigation }) => {
  const { t } = useI18n();
  const theme = useAppTheme();
  const { colors } = theme;
  const styles = useMemo(() => createStyles(theme), [theme]);

  const { workspace } = useContext(WorkspaceContext);
  const {
    contacts,
    loading,
    creating,
    updating,
    deleting,
    error,
    refreshContacts,
    filterContacts,
    addContact,
    updateContact,
    deleteContact,
  } = useContext(ContactsContext);
  const { avatars, setAvatar } = useContactAvatars();

  const {
    totalsByContact,
    latestDateByContact,
    isFetching: totalsLoading,
    isInitialLoading: balancesInitialLoading,
    refetch: refetchBalances,
  } = useContactBalances(contacts);

  const canEdit = canWrite(workspace.activeBusinessRole);
  const isOnline = useOnlineStatus();

  // Telegram uslubida: har kontaktning o'zida o'qilmagan xabarlar soni.
  // Inbox query'si keshdan ulashiladi (watcher baribir yangilab turadi).
  const { data: notifData } = useNotifications();
  const unreadByPhone = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of notifData?.content ?? []) {
      if (item.read) continue;
      const phone = item.actorPhone ? normalizePhone(item.actorPhone) : '';
      if (!phone) continue;
      map[phone] = (map[phone] ?? 0) + 1;
    }
    return map;
  }, [notifData]);

  // ---- Modal / forma holati ----
  const [modalVisible, setModalVisible] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [mode, setMode] = useState<Mode>('create');
  const [selectedId, setSelectedId] = useState('');

  // ---- Qidiruv holati ----
  const [activeSearch, setActiveSearch] = useState<SearchField | null>(null);
  const [filterName, setFilterName] = useState('');
  const [filterPhone, setFilterPhone] = useState('');
  const [searchResults, setSearchResults] = useState<typeof contacts>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');

  const editInitialName = useMemo(
    () => contacts.find((contact) => contact.id === selectedId)?.fullName ?? '',
    [contacts, selectedId],
  );

  // Qidiruv haqiqatan faolmi (kamida 3 belgi kiritilgan). Bo'sh natija
  // "hali kontakt yo'q" dan boshqa holat — ularni ajratish uchun kerak.
  const hasActiveQuery =
    filterName.trim().length >= MIN_QUERY_LENGTH ||
    filterPhone.replace(/\D/g, '').length >= MIN_QUERY_LENGTH;

  const filteredContacts = useMemo(
    () => (hasActiveQuery ? searchResults : contacts),
    [hasActiveQuery, contacts, searchResults],
  );

  // ---- Saralash holati ----
  // null = odatiy tartib (oxirgi amal bajargan kontakt birinchi, Telegram uslubi).
  // Aks holda tanlangan valyuta bo'yicha qarz/haq tomoniga saralanadi.
  const [sort, setSort] = useState<ActiveSort | null>(null);

  const handleSelectSort = useCallback((direction: SortDirection, currency: Currency) => {
    setSort((prev) =>
      prev && prev.direction === direction && prev.currency === currency
        ? null
        : { direction, currency },
    );
  }, []);

  const handleResetSort = useCallback(() => setSort(null), []);

  // Odatiy holatda oxirgi amal birinchi; valyuta tanlansa o'sha valyutaning sof
  // balansi (credit - debt) bo'yicha. 'debt' = eng katta qarzdan (eng manfiy) haqgacha,
  // 'credit' = teskarisiga. Tenglar oxirgi amal vaqti bo'yicha ajratiladi.
  const sortedContacts = useMemo(() => {
    const base = [...filteredContacts];
    const byRecent = (a: (typeof base)[number], b: (typeof base)[number]) =>
      (latestDateByContact[b.id] ?? 0) - (latestDateByContact[a.id] ?? 0);

    if (!sort) return base.sort(byRecent);

    const cur = sort.currency;
    const netOf = (id: string): number => {
      const totals = totalsByContact[id];
      if (!totals) return 0;
      return (totals.credit[cur] ?? 0) - (totals.debt[cur] ?? 0);
    };
    const dir = sort.direction === 'debt' ? 1 : -1;

    return base.sort((a, b) => {
      const diff = netOf(a.id) - netOf(b.id);
      if (diff !== 0) return dir * diff;
      return byRecent(a, b);
    });
  }, [filteredContacts, sort, totalsByContact, latestDateByContact]);

  // Jami balanslar HAR VALYUTA bo'yicha alohida yig'iladi — so'm hisobi so'mda,
  // dollar hisobi dollarda. Kursda aylantirish YO'Q (foydalanuvchi talabi).
  const aggregateTotals = useMemo(() => {
    const totalDebt: CurrencyAmounts = {};
    const totalCredit: CurrencyAmounts = {};
    for (const item of Object.values(totalsByContact)) {
      for (const { currency, amount } of netByCurrency(item.credit, item.debt)) {
        if (amount > 0) totalCredit[currency] = (totalCredit[currency] ?? 0) + amount;
        else totalDebt[currency] = (totalDebt[currency] ?? 0) + Math.abs(amount);
      }
    }
    return { totalDebt, totalCredit };
  }, [totalsByContact]);

  // Allaqachon qo'shilgan raqamlar — telefon kontaktlar ro'yxatida belgilash uchun.
  const existingPhones = useMemo(() => {
    const set = new Set<string>();
    for (const contact of contacts) {
      if (contact.phone) set.add(normalizePhone(contact.phone));
    }
    return set;
  }, [contacts]);

  const handleRefresh = useCallback(async () => {
    await refreshContacts();
    refetchBalances();
  }, [refreshContacts, refetchBalances]);

  // Detal ekranidan qaytganda balanslar o'zgargan bo'lishi mumkin — qayta yuklaymiz.
  // Birinchi fokusni o'tkazib yuboramiz (mount'da hook allaqachon yuklaydi).
  const hasFocused = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (!hasFocused.current) {
        hasFocused.current = true;
        return;
      }
      refetchBalances();
    }, [refetchBalances]),
  );

  // Telefon kontaktlaridan tanlanganlarni ketma-ket qo'shadi.
  const handleAddFromDevice = useCallback(
    async (selected: DeviceContact[]): Promise<{ added: number; failed: number }> => {
      let added = 0;
      let failed = 0;
      for (const contact of selected) {
        const ok = await addContact({ name: contact.name, targetType: 'PROFILE', phone: contact.phone });
        if (ok) added += 1;
        else failed += 1;
      }
      if (added > 0) refetchBalances();
      return { added, failed };
    },
    [addContact, refetchBalances],
  );

  // ---- Qidiruv (debounce) ----
  useEffect(() => {
    const nameQuery = filterName.trim();
    const phoneQuery = filterPhone.replace(/\D/g, '');
    if (nameQuery.length < MIN_QUERY_LENGTH && phoneQuery.length < MIN_QUERY_LENGTH) {
      setSearchResults([]);
      setSearchLoading(false);
      setSearchError('');
      return;
    }

    let cancelled = false;
    setSearchLoading(true);
    const timer = setTimeout(async () => {
      try {
        const result = await filterContacts({ name: nameQuery, phoneNumber: phoneQuery });
        if (!cancelled) {
          setSearchResults(result);
          setSearchError('');
        }
      } catch (e) {
        if (!cancelled) {
          setSearchResults([]);
          setSearchError(e instanceof Error ? e.message : t('debts.searchError'));
        }
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [filterContacts, filterName, filterPhone, t]);

  const toggleSearch = useCallback((field: SearchField) => {
    setActiveSearch((prev) => {
      if (prev === field) return null;
      if (field === 'name') setFilterPhone('');
      else setFilterName('');
      return field;
    });
  }, []);

  const openCreate = useCallback(() => {
    // Foydalanuvchi ishorasi — bildirishnoma ovozini "ochamiz" (brauzer autoplay bloki uchun).
    primeNotificationAudio();
    requestNotificationPermission();
    setMode('create');
    setSelectedId('');
    setModalVisible(true);
  }, []);

  const openEdit = useCallback((id: string) => {
    setMode('edit');
    setSelectedId(id);
    setModalVisible(true);
  }, []);

  const openContact = useCallback(
    (id: string) => navigation.navigate(ROUTES.CONTACT_DETAIL, { id }),
    [navigation],
  );

  // Tahrirlash modalidagi mijozning rasm kaliti va hozirgi rasmi.
  const selectedAvatarKey = useMemo(() => {
    const contact = contacts.find((item) => item.id === selectedId);
    return contact ? contact.partyId || contact.id : '';
  }, [contacts, selectedId]);

  const changeSelectedPhoto = useCallback(async () => {
    if (!selectedAvatarKey) return;
    const uri = await pickContactImage();
    if (uri) setAvatar(selectedAvatarKey, uri);
  }, [selectedAvatarKey, setAvatar]);

  // Ro'yxatdagi avatarga bosilganda rasmni to'liq ekranda ko'rsatamiz.
  const [photoViewUri, setPhotoViewUri] = useState('');
  const viewContactPhoto = useCallback(
    (key: string) => {
      const uri = avatars[key];
      if (uri) setPhotoViewUri(uri);
    },
    [avatars],
  );
  const closePhotoView = useCallback(() => setPhotoViewUri(''), []);

  // Virtualizatsiyalangan ro'yxat uchun bitta qatorni chizadi (FlatList renderItem).
  // Balans HAR VALYUTA bo'yicha alohida — kursda aralashtirmaymiz.
  const lastIndex = sortedContacts.length - 1;
  const renderContact = useCallback<ListRenderItem<Contact>>(
    ({ item, index }) => {
      const totals = totalsByContact[item.id];
      const balances = totals ? netByCurrency(totals.credit, totals.debt) : undefined;
      return (
        <ContactRow
          contact={item}
          balances={balances}
          unreadCount={item.phone ? unreadByPhone[normalizePhone(item.phone)] ?? 0 : 0}
          totalsLoading={totalsLoading}
          localPhoto={avatars[item.partyId || item.id]}
          canEdit={canEdit}
          isLast={index === lastIndex}
          onPress={openContact}
          onEdit={openEdit}
          onViewPhoto={viewContactPhoto}
        />
      );
    },
    [
      totalsByContact,
      unreadByPhone,
      totalsLoading,
      avatars,
      canEdit,
      lastIndex,
      openContact,
      openEdit,
      viewContactPhoto,
    ],
  );

  const keyExtractor = useCallback((item: Contact, index: number) => item.id || `contact-${index}`, []);

  const handleUpdate = useCallback(
    (name: string) => updateContact(selectedId, { name }),
    [updateContact, selectedId],
  );

  // O'chirish qoidasi: hisob TO'LIQ yopiq bo'lsagina ruxsat — tranzaksiya umuman
  // bo'lmagan yoki barcha valyutalarda sof balans 0. Aks holda taqiqlanadi.
  const canDeleteSelected = useMemo(() => {
    if (!selectedId) return false;
    const totals = totalsByContact[selectedId];
    if (!totals) return false; // balans hali aniqlanmagan — ehtiyotkorlik bilan taqiq
    return netByCurrency(totals.credit, totals.debt).length === 0;
  }, [selectedId, totalsByContact]);

  const handleDeleteContact = useCallback(() => {
    const contact = contacts.find((item) => item.id === selectedId);
    if (!contact) return;
    confirmAction(
      t('debts.deleteConfirm', { name: contact.fullName }),
      async () => {
        const ok = await deleteContact(contact.id);
        if (ok) {
          setModalVisible(false);
          refetchBalances();
        }
      },
      {
        title: t('debts.deleteContact'),
        confirmLabel: t('common.delete'),
        cancelLabel: t('common.cancel'),
      },
    );
  }, [contacts, selectedId, deleteContact, refetchBalances, t]);

  const isEmpty = sortedContacts.length === 0;
  const isBusy = loading || searchLoading;
  // Skeleton FAQAT ko'rsatadigan narsa bo'lmaganda chiqadi.
  //
  // Ilgari har qanday yangilanishda ro'yxat butunlay bo'shatilardi: modal
  // yopilgach (kontakt qo'shildi/tahrirlandi) fon yangilanishi boshlanar va
  // mavjud kontaktlar o'rnini kulrang skeleton egallardi. So'rov sekin
  // bo'lsa yoki uzilib qolsa, o'sha "chiziqlar" ekranda qolib ketardi.
  // Endi mavjud ma'lumot joyida turadi, yangilanish esa RefreshControl
  // aylanasi orqali ko'rinadi.
  const showSkeleton = isBusy && sortedContacts.length === 0;
  const hasBanner = Boolean(!isOnline || error || searchError);

  // FAB pulsatsiyasi — faqat ro'yxat bo'sh bo'lganda (birinchi mijozga undov) va
  // CHEKLI takror bilan. Avval cheksiz loop edi: web'da bu har frame'da style
  // yozadigan doimiy rAF ishi (batareya + Performance panelida uzluksiz faollik).
  const shouldPulseFab = canEdit && isEmpty && !isBusy && !hasActiveQuery;
  return (
    <View style={styles.container}>
      {/* Dekorativ fon — bosishni ushlamaydi, kontent ustidan o'tmaydi. */}
      <AmbientBackground />

      <EntranceView style={styles.header} duration={300} fromY={12}>
        <ScreenTopBar />

        <View style={styles.headerRow}>
          <View style={styles.titleWrap}>
            {/* Sarlavha tab nomi bilan BIR XIL: ilgari tabda "Qarzlar",
                ekranda "Mijozlar" turardi va foydalanuvchi qayerdaligini
                anglash uchun ikki xil lug'atni bog'lashiga to'g'ri kelardi. */}
            <Text style={styles.title} numberOfLines={1}>
              {t('tab.debts')}
            </Text>
          </View>

          <View style={styles.headerTools}>
            <SearchToggle
              label="ABC"
              active={activeSearch === 'name'}
              onPress={() => toggleSearch('name')}
              styles={styles}
              colors={colors}
            />
            <SearchToggle
              label="123"
              active={activeSearch === 'phone'}
              onPress={() => toggleSearch('phone')}
              styles={styles}
              colors={colors}
            />
          </View>
        </View>

        {activeSearch ? (
          <EntranceView duration={200} fromY={-6} style={styles.searchWrap}>
            {activeSearch === 'name' ? (
              <SearchField
                value={filterName}
                onChangeText={setFilterName}
                placeholder={t('debts.min3letters')}
                accessibilityLabel={t('debts.filterName')}
                autoFocus
              />
            ) : (
              <SearchField
                value={filterPhone}
                onChangeText={(value) => setFilterPhone(value.replace(/\D/g, '').slice(0, 12))}
                keyboardType="phone-pad"
                placeholder={t('debts.min3digits')}
                accessibilityLabel={t('debts.filterPhone')}
                autoFocus
              />
            )}
          </EntranceView>
        ) : null}

        <BalanceSummary
          totalDebt={aggregateTotals.totalDebt}
          totalCredit={aggregateTotals.totalCredit}
          loading={balancesInitialLoading}
          activeSort={sort}
          onSelect={handleSelectSort}
          onReset={handleResetSort}
        />

        {/* Holat bannerlari — bo'lmasa konteyner ham chizilmaydi. */}
        {hasBanner ? (
          <View style={styles.banners}>
            {!isOnline ? <StatusBanner tone="warning" message={t('common.offline')} /> : null}
            {error ? (
              <StatusBanner
                tone="error"
                message={error}
                actionLabel={t('common.retry')}
                onAction={handleRefresh}
              />
            ) : null}
            {searchError && !error ? <StatusBanner tone="error" message={searchError} /> : null}
          </View>
        ) : null}

        {/* Bo'lim sarlavhasida "qo'shish" tugmasi ATAYIN yo'q: pastdagi
            suzuvchi "+" tugmasi aynan shu amalni bajaradi va ikkita bir xil
            harakat ekranda raqobatlashib turardi. */}
        <View style={styles.sectionWrap}>
          <SectionHeader
            icon="people"
            iconBadge={false}
            title={t('debts.contactsSection')}
          />
        </View>
      </EntranceView>

      {/* Ro'yxat virtualizatsiyalangan (FlatList) — faqat ko'rinadigan qatorlar
          render qilinadi. Avval ScrollView + .map() barcha kontaktni bir vaqtda
          DOM'ga chiqarardi (katta ro'yxatda "qotish"). Karta ko'rinishi
          contentContainerStyle orqali saqlanadi. */}
      <FlatList
        style={styles.scroll}
        contentContainerStyle={styles.listCard}
        data={sortedContacts}
        renderItem={renderContact}
        keyExtractor={keyExtractor}
        showsVerticalScrollIndicator={false}
        initialNumToRender={12}
        windowSize={11}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          showSkeleton ? (
            <SkeletonContactList count={6} />
          ) : hasActiveQuery ? (
            // Qidiruvning bo'sh natijasi — "hali kontakt yo'q" dan BOSHQA holat.
            <EmptyState
              icon="search-outline"
              title={t('debts.noSearchResults')}
              description={t('debts.min3letters')}
            />
          ) : (
            <EmptyState
              icon="people-outline"
              title={t('debts.emptyAccount')}
              description={t('debts.emptyDescription')}
              actionLabel={canEdit ? t('debts.addNew') : undefined}
              onAction={canEdit ? openCreate : undefined}
            />
          )
        }
      />

      {canEdit ? (
        <FloatingActionButton
          onPress={openCreate}
          accessibilityLabel={t('debts.addClient')}
          pulse={shouldPulseFab}
        />
      ) : null}

      <ContactFormModal
        visible={modalVisible}
        mode={mode}
        initialName={editInitialName}
        submitting={creating || updating}
        canDelete={canDeleteSelected}
        deleting={deleting}
        photoUri={avatars[selectedAvatarKey]}
        onDelete={handleDeleteContact}
        onClose={() => setModalVisible(false)}
        onCreate={addContact}
        onUpdate={handleUpdate}
        onOpenDeviceContacts={() => {
          setModalVisible(false);
          setPickerVisible(true);
        }}
        onChangePhoto={changeSelectedPhoto}
      />

      <DeviceContactsPickerModal
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        existingPhones={existingPhones}
        onSubmit={handleAddFromDevice}
      />

      <ProfilePhotoModal
        visible={Boolean(photoViewUri)}
        photoUri={photoViewUri}
        error=""
        onClose={closePhotoView}
        onImageError={closePhotoView}
      />
    </View>
  );
};

interface SearchToggleProps {
  label: string;
  active: boolean;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
  colors: ThemeValue['colors'];
}

const SearchToggle: React.FC<SearchToggleProps> = ({ label, active, onPress, styles, colors }) => (
  <Pressable
    style={({ pressed }) => [
      styles.searchToggle,
      active && styles.searchToggleActive,
      pressed && styles.searchTogglePressed,
    ]}
    onPress={onPress}
    accessibilityRole="button"
    accessibilityState={{ selected: active }}
  >
    <Ionicons name="search-outline" size={18} color={active ? colors.primary : colors.textSecondary} />
    <Text style={[styles.searchToggleText, active && styles.searchToggleTextActive]}>{label}</Text>
  </Pressable>
);

const createStyles = ({ colors, spacing, radius, typography, shadows, glass }: ThemeValue) =>
  StyleSheet.create({
    container: {
      flex: 1,
      // Fon AmbientBackground'dan keladi — bu yerda tekis rang BERILMAYDI.
      backgroundColor: 'transparent',
    },
    header: {
      backgroundColor: 'transparent',
    },
    // Qidiruv tugmalari sarlavha bloki bilan vertikal MARKAZDA tekislanadi.
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.xxs,
    },
    titleWrap: {
      flexShrink: 1,
      minWidth: 0,
    },
    title: {
      ...typography.display,
      color: colors.textPrimary,
    },
    headerTools: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    // Qidiruv almashtirgichlari — alohida oq kartachalar.
    searchToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xxs + 1,
      height: 48,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.lg,
      ...glass.surface,
    },
    searchToggleActive: {
      backgroundColor: colors.primarySoft,
      shadowOpacity: 0,
      elevation: 0,
    },
    searchTogglePressed: {
      opacity: 0.6,
    },
    searchToggleText: {
      ...typography.label,
      fontSize: 14,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    searchToggleTextActive: {
      color: colors.primary,
    },
    searchWrap: {
      marginHorizontal: spacing.md,
      marginBottom: spacing.md,
    },
    banners: {
      marginTop: spacing.md,
    },
    sectionWrap: {
      marginTop: spacing.sm,
    },
    scroll: {
      flex: 1,
    },
    // Ro'yxat tugagach karta ham tugaydi, ostida fon ko'rinadi va "+" tugmasi
    // o'sha bo'sh joyda suzadi. Bo'shliq karta TASHQARISIDA (margin) —
    // ichkarida (padding) berilsa oq karta ekran ostigacha cho'zilib,
    // tugma uni bosib turardi.
    listCard: {
      ...glass.surface,
      borderRadius: radius.xxl,
      // Chetdan chekinish KARTAning ozida — FlatList style'iga qoyilsa
      // react-native-web uni tashqi va ichki blokka ikki marta qollab,
      // karta boshqa ekranlardagidan ikki barobar ichkariga tushib qolardi.
      marginHorizontal: spacing.md,
      marginBottom: 88,
      overflow: 'hidden',
    },
  });

export default DebtListScreen;
