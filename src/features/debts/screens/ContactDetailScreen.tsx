import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, type ListRenderItem, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import MoneyActionModal, { MoneyActionPayload } from '../components/MoneyActionModal';
import { Ionicons } from '@expo/vector-icons';
import AmbientBackground from '../../../shared/ui/AmbientBackground';
import EmptyState from '../../../shared/ui/EmptyState';
import EntranceView from '../../../shared/ui/EntranceView';
import PressableScale from '../../../shared/ui/PressableScale';
import SectionHeader from '../../../shared/ui/SectionHeader';
import SwipePager, { type SwipePage } from '../../../shared/ui/SwipePager';
import StatusBanner from '../../../shared/ui/StatusBanner';
import { SkeletonContactList } from '../../../shared/ui/SkeletonShimmer';
import { AuthContext } from '../../auth/context/AuthContext';
import { ContactsContext } from '../context/ContactsContext';
import { WorkspaceContext } from '../../business/context/WorkspaceContext';
import { useMoney } from '../hooks/useMoney';
import { useNotifications, useMarkNotificationRead } from '../../notifications/hooks/useNotifications';
import { useAccountContext } from '../../../shared/hooks/useAccountContext';
import { normalizePhone } from '../../../shared/lib/phone';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import type { DebtsScreenProps } from '../../../app/navigation/types';
import { ROUTES } from '../../../app/navigation/routes';
import { MoneyActionType } from '../../../shared/types/money';
import { netByCurrency } from '../../../shared/lib/currency';
import type { Currency, MoneyItemCreateDTO } from '../../../shared/types/money';
import { canWrite } from '../../../shared/lib/permissions';
import { useI18n } from '../../../shared/i18n';
import BusinessCatalogPane from '../../products/components/BusinessCatalogPane';
import ContactBalanceHeader from '../components/ContactBalanceHeader';
import TransactionRow from '../components/TransactionRow';
import TransactionDetailModal from '../components/TransactionDetailModal';
import { mapTransaction, MappedTransaction } from '../model/transactionMapping';
import { counterpartyPerformerPhone } from '../model/resolveTransactionPerformer';
import type { VoiceCommandPrefill } from '../../voice/model/resolveVoiceCommand';
import { resolveVoiceCommand } from '../../voice/model/resolveVoiceCommand';
import { clearPendingIntent, takePendingIntent } from '../../voice/model/pendingVoice';

type ContactDetailProps = DebtsScreenProps<typeof ROUTES.CONTACT_DETAIL>;

/** Ovozdan kelgan, formaga qo'yiladigan qiymatlar. */
interface VoicePrefill {
  amount?: number;
  description?: string;
  currency?: Currency;
  items?: MoneyItemCreateDTO[];
  calcNote?: string;
}

/** Navbatdagi valyuta: forma qiymatlari va qaysi tugma bilan ochilishi. */
interface QueuedSettlement {
  prefill: VoicePrefill;
  actionType: MoneyActionType;
}

const ContactDetailScreen: React.FC<ContactDetailProps> = ({ route, navigation }) => {
  const { t } = useI18n();
  const theme = useAppTheme();
  const { colors } = theme;
  const styles = useMemo(() => createStyles(theme), [theme]);

  const contactId = route.params.id;
  const { profile } = useContext(AuthContext);
  const { workspace } = useContext(WorkspaceContext);
  const { accountType, partyType, accountId } = useAccountContext();
  const { contacts } = useContext(ContactsContext);

  // Joriy hisob (shaxsiy profil yoki faol biznes) — tranzaksiya tomonlarini
  // shu bo'yicha aniqlaymiz. Yagona manba useAccountContext.
  const owner = useMemo(() => ({ partyType, partyId: accountId }), [partyType, accountId]);

  const [modalVisible, setModalVisible] = useState(false);
  const [actionType, setActionType] = useState<MoneyActionType>('TAKE');
  const [selectedTransaction, setSelectedTransaction] = useState<MappedTransaction | null>(null);
  const [voicePrefill, setVoicePrefill] = useState<VoicePrefill | undefined>();

  /**
   * "Barcha qarzimni qaytardim" bir nechta valyutaga tegsa, ular NAVBAT
   * bilan kiritiladi.
   *
   * Bitta yozuv bitta valyutada bo'ladi: so'm bilan dollarni qo'shish
   * kursni o'ylab topish bo'lardi, eng kattasini olib qolganini tashlash
   * esa pulni jimgina yo'qotardi. Shuning uchun har biri uchun forma
   * alohida ochiladi.
   *
   * Navbat faqat SAQLANGANDAN keyin suriladi. Bekor qilish "to'xta"
   * degani - aks holda odam ketma-ket ochilayotgan oynalarni yopib
   * chiqishga majbur bo'lardi.
   */
  const [settlementQueue, setSettlementQueue] = useState<QueuedSettlement[]>([]);

  /**
   * Ovozli buyruqdan kelgan qiymatlar bilan oldi-berdi oynasini ochish.
   *
   * Parametr DARHOL tozalanadi: aks holda foydalanuvchi orqaga qaytib shu
   * kontaktga kirganda oyna o'z-o'zidan yana ochilaverardi va eski summa
   * qayta paydo bo'lardi.
   */
  const applyVoicePrefill = useCallback((spoken: VoiceCommandPrefill) => {
    setActionType(spoken.direction === 'GAVE' ? 'GIVE' : 'TAKE');
    setVoicePrefill({
      amount: spoken.amount,
      description: spoken.note,
      currency: spoken.currency,
      items: spoken.items?.map((item) => ({ productId: item.productId, quantity: item.quantity })),
      calcNote: spoken.calcNote,
    });
    // Birinchi valyuta yuqoridagi amount/currency'da keldi, qolganlari
    // navbatda kutadi.
    setSettlementQueue(
      (spoken.settlements ?? []).slice(1).map((line) => ({
        actionType: line.direction === 'GAVE' ? ('GIVE' as const) : ('TAKE' as const),
        prefill: { amount: line.amount, currency: line.currency, description: spoken.note },
      })),
    );
    setModalVisible(true);
  }, []);

  const voiceParam = route.params.voice as VoiceCommandPrefill | undefined;
  useEffect(() => {
    if (!voiceParam) return;
    navigation.setParams({ voice: undefined });
    applyVoicePrefill(voiceParam);
  }, [voiceParam, navigation, applyVoicePrefill]);

  /**
   * Dastur qayta ishga tushganda oxirgi tanilgan gap TIKLANADI.
   *
   * Ovozni yuborish pul turadi. Ilgari oyna ochiq turganda dasturdan
   * chiqib kirilsa, React holati yo'qolar va odam aynan shu gapni
   * qaytadan aytishga majbur bo'lardi - ya'ni bekorga to'lardi.
   *
   * Gap FAQAT shu kontaktniki bo'lsa tiklanadi: boshqa odamning summasi
   * bu yerda ochilib qolsa, e'tiborsizlikda noto'g'ri yozuv saqlanardi.
   */
  useEffect(() => {
    if (voiceParam) return;

    let alive = true;
    takePendingIntent().then((intent) => {
      if (!alive || !intent) return;
      const command = resolveVoiceCommand(intent);
      if (command.kind !== 'OPEN_CONTACT' || command.contactId !== contactId) return;
      applyVoicePrefill(command.prefill);
    });
    return () => {
      alive = false;
    };
  }, [voiceParam, contactId, applyVoicePrefill]);

  const { history, currencyTotals, selectedCounterparty, loading, creating, error, fetchData, createMoney } =
    useMoney({ token: profile?.jwt });

  const contact = useMemo(() => contacts.find((item) => item.id === contactId), [contacts, contactId]);

  // Har valyuta balansi MUSTAQIL — so'm alohida, dollar alohida (kurs aralashmaydi).
  const balances = useMemo(
    () => netByCurrency(currencyTotals.credit, currencyTotals.debt),
    [currencyTotals],
  );

  // Telegram uslubida: kontakt ochilganda AYNAN SHU kontaktdan kelgan o'qilmagan
  // bildirishnomalar o'qilgan deb belgilanadi — ro'yxatdagi badge tozalanadi.
  const { data: notifData } = useNotifications();
  const { mutate: markNotificationRead } = useMarkNotificationRead();
  const markedIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const phone = contact?.phone ? normalizePhone(contact.phone) : '';
    if (!phone) return;
    for (const item of notifData?.content ?? []) {
      if (item.read || markedIdsRef.current.has(item.id)) continue;
      if (!item.actorPhone || normalizePhone(item.actorPhone) !== phone) continue;
      markedIdsRef.current.add(item.id);
      markNotificationRead(item.id);
    }
  }, [contact?.phone, notifData, markNotificationRead]);

  // Biznes kontekstida MEMBER faqat ko'rishi mumkin — yozish tugmalari yashiriladi.
  const allowWrite = canWrite(workspace.activeBusinessRole);

  const mappedHistory = useMemo(
    () => history.map((item) => mapTransaction(item, owner, selectedCounterparty || undefined)),
    [history, owner, selectedCounterparty],
  );

  // QARAMA-QARSHI tomon xodimi: men tanlagan odam menga, men esa ularga ko'rinaman.
  const performerPhone = useMemo(
    () => (selectedTransaction ? counterpartyPerformerPhone(selectedTransaction, owner, profile?.id) : ''),
    [selectedTransaction, owner, profile?.id],
  );

  const loadScreenData = useCallback(async () => {
    if (!contact?.partyType) return;
    await fetchData({
      partyType: contact.partyType,
      partyId: contact.partyId,
      phoneFallback: contact.partyType === 'PROFILE' ? contact.phone : undefined,
    });
  }, [contact?.partyId, contact?.partyType, contact?.phone, fetchData]);

  useFocusEffect(
    useCallback(() => {
      loadScreenData();
    }, [loadScreenData]),
  );

  const handleCreate = useCallback(
    async (payload: MoneyActionPayload) => {
      if (!contact) return;
      const ok = await createMoney(actionType, {
        ...payload,
        targetPartyType: contact.partyType,
        targetPartyId: contact.partyId,
        targetPhone: contact.partyType === 'PROFILE' ? contact.phone : undefined,
      });
      if (!ok) return;
      setModalVisible(false);

      const [next, ...rest] = settlementQueue;
      if (!next) {
        setVoicePrefill(undefined);
        // Yozuv saqlandi - saqlangan gap endi kerak emas. Qoldirilsa,
        // keyingi kirishda o'sha summa yana ochilib, ikkinchi marta
        // saqlanib ketishi mumkin edi.
        void clearPendingIntent();
        return;
      }
      setSettlementQueue(rest);
      setActionType(next.actionType);
      setVoicePrefill(next.prefill);
      setModalVisible(true);
    },
    [contact, createMoney, actionType, settlementQueue],
  );

  const openModal = useCallback((type: MoneyActionType) => {
    setActionType(type);
    setModalVisible(true);
  }, []);

  // Tarix virtualizatsiyalangan (FlatList) — bir kontaktda minglab yozuv bo'lishi
  // mumkin; avval ScrollView + .map() hammasini bir vaqtda render qilardi ("qotish").
  const lastIndex = mappedHistory.length - 1;
  const renderTransaction = useCallback<ListRenderItem<MappedTransaction>>(
    ({ item, index }) => (
      <TransactionRow tx={item} isLast={index === lastIndex} onPress={setSelectedTransaction} />
    ),
    [lastIndex],
  );

  const keyExtractor = useCallback((item: MappedTransaction) => item.id, []);

  /**
   * Narxnoma FAQAT biznes kontaktida bo'ladi.
   *
   * Shaxsiy kontaktda mahsulot tushunchasi yo'q — u yerda umuman sahifalagich
   * ko'rsatilmaydi, tarixning o'zi chiqadi.
   *
   * Biznes kontaktida narxnoma BIRINCHI sahifa: do'konni ochgan odam odatda
   * "nima bor va qancha turadi" deb qaraydi, oldi-berdi tarixini esa ataylab
   * izlaydi. Shu sababli katalog kech emas, DARHOL yuklanadi — ilgari u
   * ikkinchi sahifa bo'lgani uchun surilgandan keyin yuklanardi.
   */
  const showCatalog = contact?.partyType === 'BUSINESS_ACCOUNT' && Boolean(contact?.partyId);

  if (!contact) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>{t('contact.notFound')}</Text>
      </View>
    );
  }

  const renderHistory = () => (
    <FlatList
      contentContainerStyle={styles.listCard}
      data={mappedHistory}
      renderItem={renderTransaction}
      keyExtractor={keyExtractor}
      showsVerticalScrollIndicator={false}
      initialNumToRender={14}
      windowSize={11}
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={loadScreenData}
          tintColor={colors.primary}
          colors={[colors.primary]}
          progressBackgroundColor={colors.surface}
        />
      }
      ListEmptyComponent={
        // Skeleton faqat BIRINCHI yuklashda: tarix allaqachon ekranda
        // bo'lsa, modal yopilgandan keyingi fon yangilanishi uni
        // kulrang chiziqlarga almashtirmaydi.
        loading && mappedHistory.length === 0 ? (
          <SkeletonContactList count={5} />
        ) : (
          <EmptyState
            icon="swap-horizontal-outline"
            title={t('debts.emptyAccount')}
            description={allowWrite ? t('contact.emptyHint') : undefined}
          />
        )
      }
    />
  );

  const pages: SwipePage[] = [
    {
      key: 'catalog',
      label: t('products.title'),
      icon: 'pricetags-outline',
      // Birinchi sahifa bo'lgani uchun `active` doim rost: kechiktirishning
      // ma'nosi yo'q, u baribir darhol ko'rinadi.
      render: () => (
        <BusinessCatalogPane businessId={contact.partyId} token={profile?.jwt} active />
      ),
    },
    { key: 'history', label: t('debts.history'), icon: 'time-outline', render: renderHistory },
  ];

  return (
    <View style={styles.container}>
      {/* Dekorativ fon — Qarzlar ro'yxati bilan bir xil "imzo" qatlami. */}
      <AmbientBackground />

      <EntranceView duration={300} fromY={12}>
        <ContactBalanceHeader contact={contact} balances={balances} onBack={navigation.goBack} />

        {error ? (
          <View style={styles.banner}>
            <StatusBanner
              tone="error"
              message={error}
              actionLabel={t('common.retry')}
              onAction={loadScreenData}
            />
          </View>
        ) : null}

        {showCatalog ? null : (
          <SectionHeader icon="time" iconBadge={false} title={t('debts.history')} />
        )}
      </EntranceView>

      <EntranceView delay={90} duration={320} fromY={14} style={styles.listWrap}>
        {showCatalog ? (
          <SwipePager pages={pages} />
        ) : (
          renderHistory()
        )}
      </EntranceView>

      {allowWrite ? (
        <EntranceView delay={180} duration={300} fromY={16} style={styles.bottomActions}>
          <PressableScale
            containerStyle={styles.actionSlot}
            style={[styles.actionBtn, styles.takeBtn]}
            onPress={() => openModal('TAKE')}
            accessibilityRole="button"
            accessibilityLabel={t('contact.took')}
          >
            <Ionicons name="arrow-down" size={18} color={colors.textOnPrimary} />
            <Text style={styles.actionText}>{t('contact.took')}</Text>
          </PressableScale>
          <PressableScale
            containerStyle={styles.actionSlot}
            style={[styles.actionBtn, styles.giveBtn]}
            onPress={() => openModal('GIVE')}
            accessibilityRole="button"
            accessibilityLabel={t('contact.gave')}
          >
            <Ionicons name="arrow-up" size={18} color={colors.textOnPrimary} />
            <Text style={styles.actionText}>{t('contact.gave')}</Text>
          </PressableScale>
        </EntranceView>
      ) : (
        <Text style={styles.readOnlyNote}>{t('contact.readOnly')}</Text>
      )}

      <MoneyActionModal
        visible={modalVisible}
        actionType={actionType}
        loading={creating}
        fixedCounterpartyId={contact.partyId}
        fixedCounterpartyType={contact.partyType}
        ownerAccountType={accountType}
        token={profile?.jwt}
        prefill={voicePrefill}
        onClose={() => {
          setModalVisible(false);
          setVoicePrefill(undefined);
          setSettlementQueue([]);
          // Bekor qilish "kerak emas" degani - qayta ochilmasin.
          void clearPendingIntent();
        }}
        onSubmit={handleCreate}
      />

      <TransactionDetailModal
        tx={selectedTransaction}
        performerPhone={performerPhone}
        onClose={() => setSelectedTransaction(null)}
      />
    </View>
  );
};

const createStyles = ({ colors, spacing, radius, typography, shadows, glass }: ThemeValue) =>
  StyleSheet.create({
    container: {
      flex: 1,
      // Fon AmbientBackground'dan keladi — tekis rang berilmaydi.
      backgroundColor: 'transparent',
    },
    listWrap: {
      flex: 1,
    },
    banner: {
      marginBottom: spacing.sm,
    },
    listCard: {
      ...glass.pane,
      borderRadius: radius.xxl,
      marginHorizontal: spacing.md,
      marginBottom: spacing.md,
      overflow: 'hidden',
      ...shadows.card,
    },
    // Ikki asosiy amal — ekranning eng pastida, bosh barmoq yetadigan joyda.
    // Ustki "qattiq" chegara olib tashlandi: ajratishni soya va bo'shliq beradi.
    bottomActions: {
      flexDirection: 'row',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      paddingBottom: spacing.md,
    },
    // Ikkala tugma qatorni TENG ikkiga bo'ladi. `flex` animatsiya
    // konteyneriga beriladi — tugmaning o'ziga berilsa, uni o'rab turgan
    // konteyner kontent bo'yicha kichrayib qolardi.
    actionSlot: {
      flex: 1,
    },
    actionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      minHeight: 52,
      borderRadius: radius.lg,
      ...shadows.card,
    },
    actionText: {
      ...typography.button,
      fontSize: 16,
      color: colors.textOnPrimary,
    },
    takeBtn: {
      backgroundColor: colors.danger,
    },
    giveBtn: {
      backgroundColor: colors.primary,
    },
    readOnlyNote: {
      ...typography.bodySmall,
      textAlign: 'center',
      color: colors.textSecondary,
      marginTop: spacing.md,
      paddingVertical: spacing.sm,
    },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
    },
    emptyText: {
      ...typography.body,
      textAlign: 'center',
      color: colors.textSecondary,
      paddingVertical: spacing.lg,
    },
  });

export default ContactDetailScreen;
