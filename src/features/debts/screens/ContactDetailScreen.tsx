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
import { canWrite } from '../../../shared/lib/permissions';
import { useI18n } from '../../../shared/i18n';
import ContactBalanceHeader from '../components/ContactBalanceHeader';
import TransactionRow from '../components/TransactionRow';
import TransactionDetailModal from '../components/TransactionDetailModal';
import { mapTransaction, MappedTransaction } from '../model/transactionMapping';
import { counterpartyPerformerPhone } from '../model/resolveTransactionPerformer';

type ContactDetailProps = DebtsScreenProps<typeof ROUTES.CONTACT_DETAIL>;

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
      if (ok) setModalVisible(false);
    },
    [contact, createMoney, actionType],
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

  if (!contact) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>{t('contact.notFound')}</Text>
      </View>
    );
  }

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

        <SectionHeader icon="time" iconBadge={false} title={t('debts.history')} />
      </EntranceView>

      <EntranceView delay={90} duration={320} fromY={14} style={styles.listWrap}>
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
        onClose={() => setModalVisible(false)}
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
