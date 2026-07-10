import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Input from '../components/atoms/Input';
import { SkeletonCardList } from '../components/ui/SkeletonShimmer';
import WorkspaceSwitcher from '../components/business/WorkspaceSwitcher';
import FadeInView from '../components/animations/FadeInView';
import DeviceContactsPickerModal from '../components/contacts/DeviceContactsPickerModal';
import { ContactsContext } from '../context/ContactsContext';
import { WorkspaceContext } from '../context/WorkspaceContext';
import { useContactBalances } from '../hooks/useContactBalances';
import { useUnreadNotificationCount } from '../hooks/useNotifications';
import { useAppTheme } from '../theme';
import type { ThemeValue } from '../theme/ThemeProvider';
import { ROUTES } from '../navigation/routes';
import type { DebtsNavigation } from '../navigation/types';
import { CurrencyAmounts, netByCurrency } from '../utils/currency';
import { canWrite } from '../utils/permissions';
import { normalizePhone } from '../utils/phone';
import { primeNotificationAudio, requestNotificationPermission } from '../utils/webNotify';
import type { DeviceContact } from '../utils/deviceContacts';
import { useI18n } from '../i18n';
import BalanceSummary from './debts/BalanceSummary';
import ContactRow from './debts/ContactRow';
import ContactFormModal from './debts/ContactFormModal';
import { pickContactImage, useContactAvatars } from '../shared/contactAvatars';

type Mode = 'create' | 'edit';
type SearchField = 'name' | 'phone';

const MIN_QUERY_LENGTH = 3;
const SEARCH_DEBOUNCE_MS = 300;
const FAB_PULSE_MS = 1000;
const ROW_STAGGER_MS = 55;
const ROW_STAGGER_CAP_MS = 420;

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
    error,
    refreshContacts,
    filterContacts,
    addContact,
    updateContact,
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

  // Eng oxirgi amal bajarilgan kontakt birinchi chiqsin. Vaqti aniqlanmaganlar pastda.
  const sortedContacts = useMemo(
    () =>
      [...filteredContacts].sort(
        (a, b) => (latestDateByContact[b.id] ?? 0) - (latestDateByContact[a.id] ?? 0),
      ),
    [filteredContacts, latestDateByContact],
  );

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

  const changeContactPhoto = useCallback(
    async (key: string) => {
      const uri = await pickContactImage();
      if (uri) setAvatar(key, uri);
    },
    [setAvatar],
  );

  const handleUpdate = useCallback(
    (name: string) => updateContact(selectedId, { name }),
    [updateContact, selectedId],
  );

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

        <BalanceSummary totalDebt={aggregateTotals.totalDebt} totalCredit={aggregateTotals.totalCredit} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
      >
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

        <View style={styles.listCard}>
          {isBusy ? (
            <SkeletonCardList count={5} containerStyle={styles.listSkeleton} />
          ) : isEmpty ? (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="people-outline" size={26} color={colors.textSecondary} />
              </View>
              <Text style={styles.emptyText}>{t('debts.emptyAccount')}</Text>
            </View>
          ) : (
            sortedContacts.map((item, index) => {
              const totals = totalsByContact[item.id];
              const balances = totals ? netByCurrency(totals.credit, totals.debt) : undefined;
              return (
                <FadeInView
                  key={item.id || `contact-${index}`}
                  delay={Math.min(index * ROW_STAGGER_MS, ROW_STAGGER_CAP_MS)}
                  duration={320}
                  fromY={12}
                >
                  <ContactRow
                    contact={item}
                    balances={balances}
                    totalsLoading={totalsLoading}
                    localPhoto={avatars[item.partyId || item.id]}
                    canEdit={canEdit}
                    isLast={index === sortedContacts.length - 1}
                    onPress={openContact}
                    onEdit={openEdit}
                    onChangePhoto={changeContactPhoto}
                  />
                </FadeInView>
              );
            })
          )}
        </View>
      </ScrollView>

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
        onClose={() => setModalVisible(false)}
        onCreate={addContact}
        onUpdate={handleUpdate}
        onOpenDeviceContacts={() => {
          setModalVisible(false);
          setPickerVisible(true);
        }}
      />

      <DeviceContactsPickerModal
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        existingPhones={existingPhones}
        onSubmit={handleAddFromDevice}
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
    },
    content: {
      padding: spacing.md,
      paddingBottom: 96,
    },
    errorRow: {
      padding: spacing.sm,
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
