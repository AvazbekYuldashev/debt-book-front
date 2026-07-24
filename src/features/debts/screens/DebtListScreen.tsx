import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
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
import Input from '../../../shared/ui/Input';
import { SkeletonCardList } from '../../../shared/ui/SkeletonShimmer';
import WorkspaceSwitcher from '../../business/components/WorkspaceSwitcher';
import DeviceContactsPickerModal from '../components/DeviceContactsPickerModal';
import { ContactsContext, type Contact } from '../context/ContactsContext';
import { WorkspaceContext } from '../../business/context/WorkspaceContext';
import { useContactBalances } from '../hooks/useContactBalances';
import { useNotifications, useUnreadNotificationCount } from '../../notifications/hooks/useNotifications';
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
const FAB_PULSE_MS = 1000;

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
    refetch: refetchBalances,
  } = useContactBalances(contacts);

  const canEdit = canWrite(workspace.activeBusinessRole);

  const unreadQuery = useUnreadNotificationCount();
  const unreadCount = unreadQuery.data ?? 0;

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

  const fabScale = useRef(new Animated.Value(1)).current;

  const filteredContacts = useMemo(() => {
    const nameQuery = filterName.trim();
    const phoneQuery = filterPhone.replace(/\D/g, '');
    if (nameQuery.length < MIN_QUERY_LENGTH && phoneQuery.length < MIN_QUERY_LENGTH) return contacts;
    return searchResults;
  }, [contacts, filterName, filterPhone, searchResults]);

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

  const openNotifications = useCallback(() => {
    requestNotificationPermission();
    primeNotificationAudio();
    navigation.navigate(ROUTES.NOTIFICATIONS);
  }, [navigation]);

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

  // FAB pulsatsiyasi — faqat ro'yxat bo'sh bo'lganda (birinchi mijozga undov) va
  // CHEKLI takror bilan. Avval cheksiz loop edi: web'da bu har frame'da style
  // yozadigan doimiy rAF ishi (batareya + Performance panelida uzluksiz faollik).
  const shouldPulseFab = canEdit && isEmpty && !isBusy;
  useEffect(() => {
    if (!shouldPulseFab) return undefined;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(fabScale, {
          toValue: 1.1,
          duration: FAB_PULSE_MS,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(fabScale, {
          toValue: 1,
          duration: FAB_PULSE_MS,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
      { iterations: 4 },
    );
    loop.start();
    return () => {
      loop.stop();
      fabScale.setValue(1);
    };
  }, [shouldPulseFab, fabScale]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <WorkspaceSwitcher />
        <View style={styles.headerRow}>
          <Text style={styles.title}>{t('debts.clientsTitle')}</Text>
          <View style={styles.headerTools}>
            <Pressable
              style={({ pressed }) => [styles.bellBtn, pressed && styles.searchTogglePressed]}
              onPress={openNotifications}
              accessibilityRole="button"
              accessibilityLabel={t('notifications.title')}
            >
              <Ionicons name="notifications-outline" size={18} color={colors.textSecondary} />
              {unreadCount > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                </View>
              ) : null}
            </Pressable>
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

        {activeSearch === 'name' ? (
          <Input
            label={t('debts.filterName')}
            value={filterName}
            onChangeText={setFilterName}
            placeholder={t('debts.min3letters')}
            containerStyle={styles.searchInput}
            autoFocus
          />
        ) : null}
        {activeSearch === 'phone' ? (
          <Input
            label={t('debts.filterPhone')}
            value={filterPhone}
            onChangeText={(value) => setFilterPhone(value.replace(/\D/g, '').slice(0, 12))}
            keyboardType="phone-pad"
            placeholder={t('debts.min3digits')}
            containerStyle={styles.searchInput}
            autoFocus
          />
        ) : null}

        <BalanceSummary
          totalDebt={aggregateTotals.totalDebt}
          totalCredit={aggregateTotals.totalCredit}
          activeSort={sort}
          onSelect={handleSelectSort}
          onReset={handleResetSort}
        />

        {error ? (
          <View style={styles.errorRow}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
        {searchError && !error ? (
          <View style={styles.errorRow}>
            <Text style={styles.errorText}>{searchError}</Text>
          </View>
        ) : null}
      </View>

      {/* Ro'yxat virtualizatsiyalangan (FlatList) — faqat ko'rinadigan qatorlar
          render qilinadi. Avval ScrollView + .map() barcha kontaktni bir vaqtda
          DOM'ga chiqarardi (katta ro'yxatda "qotish"). Karta ko'rinishi
          contentContainerStyle orqali saqlanadi. */}
      <FlatList
        style={styles.scroll}
        contentContainerStyle={styles.listCard}
        data={isBusy ? [] : sortedContacts}
        renderItem={renderContact}
        keyExtractor={keyExtractor}
        showsVerticalScrollIndicator={false}
        initialNumToRender={12}
        windowSize={11}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          isBusy ? (
            <SkeletonCardList count={5} containerStyle={styles.listSkeleton} />
          ) : (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="people-outline" size={26} color={colors.textSecondary} />
              </View>
              <Text style={styles.emptyText}>{t('debts.emptyAccount')}</Text>
            </View>
          )
        }
      />

      {canEdit ? (
        <Animated.View style={[styles.fabWrap, { transform: [{ scale: fabScale }] }]}>
          <Pressable
            style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
            onPress={openCreate}
            accessibilityRole="button"
            accessibilityLabel={t('debts.addClient')}
          >
            <Ionicons name="add" size={30} color={colors.textOnPrimary} />
          </Pressable>
        </Animated.View>
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
    <Ionicons name="search" size={16} color={active ? colors.primary : colors.textSecondary} />
    <Text style={[styles.searchToggleText, active && styles.searchToggleTextActive]}>{label}</Text>
  </Pressable>
);

const createStyles = ({ colors, spacing, radius, typography }: ThemeValue) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      backgroundColor: colors.background,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.md,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
    },
    title: {
      ...typography.heading2,
      color: colors.textPrimary,
    },
    headerTools: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    bellBtn: {
      width: 34,
      height: 34,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badge: {
      position: 'absolute',
      top: -5,
      right: -5,
      minWidth: 18,
      height: 18,
      borderRadius: radius.pill,
      paddingHorizontal: 4,
      backgroundColor: colors.danger,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: colors.background,
    },
    badgeText: {
      ...typography.caption,
      fontSize: 10,
      fontWeight: '800',
      color: colors.textOnPrimary,
    },
    searchToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: spacing.xs,
      paddingVertical: spacing.xxs + 2,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    searchToggleActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
    },
    searchTogglePressed: {
      opacity: 0.6,
    },
    searchToggleText: {
      ...typography.caption,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    searchToggleTextActive: {
      color: colors.primary,
    },
    searchInput: {
      marginBottom: spacing.sm,
      marginHorizontal: spacing.md,
    },
    scroll: {
      flex: 1,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
      paddingBottom: 96,
    },
    errorRow: {
      padding: spacing.sm,
      marginHorizontal: spacing.md,
      borderWidth: 1,
      borderColor: colors.danger,
      backgroundColor: colors.dangerMuted,
      borderRadius: radius.sm,
      marginBottom: spacing.md,
    },
    errorText: {
      ...typography.caption,
      fontSize: 13,
      color: colors.negative,
    },
    listCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      paddingVertical: spacing.xxs,
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 20,
      elevation: 6,
      overflow: 'hidden',
    },
    listSkeleton: {
      padding: spacing.sm,
    },
    empty: {
      alignItems: 'center',
      paddingVertical: spacing.xl,
      gap: spacing.sm,
    },
    emptyIcon: {
      width: 56,
      height: 56,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceMuted,
    },
    emptyText: {
      ...typography.body,
      textAlign: 'center',
      color: colors.textSecondary,
    },
    fabWrap: {
      position: 'absolute',
      right: spacing.md + 2,
      bottom: spacing.lg,
    },
    fab: {
      width: 60,
      height: 60,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.5,
      shadowRadius: 14,
      elevation: 10,
    },
    fabPressed: {
      opacity: 0.9,
      transform: [{ scale: 0.96 }],
    },
  });

export default DebtListScreen;
