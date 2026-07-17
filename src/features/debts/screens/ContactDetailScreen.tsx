import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import FadeInView from '../../../shared/ui/FadeInView';
import MoneyActionModal, { MoneyActionPayload } from '../components/MoneyActionModal';
import Button from '../../../shared/ui/Button';
import { SkeletonCardList } from '../../../shared/ui/SkeletonShimmer';
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

const ROW_STAGGER_MS = 50;
const ROW_STAGGER_CAP_MS = 380;

type ContactDetailProps = DebtsScreenProps<typeof ROUTES.CONTACT_DETAIL>;

const ContactDetailScreen: React.FC<ContactDetailProps> = ({ route, navigation }) => {
  const { t } = useI18n();
  const theme = useAppTheme();
  const { colors } = theme;
  const styles = useMemo(() => createStyles(theme), [theme]);

  const contactId = route.params.id;
  const { profile } = useContext(AuthContext);
  const { workspace } = useContext(WorkspaceContext);
  const { accountType } = useAccountContext();
  const { contacts } = useContext(ContactsContext);

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
    () =>
      history.map((item) =>
        mapTransaction(
          item,
          {
            partyType:
              workspace.mode === 'business' && workspace.activeBusinessId ? 'BUSINESS_ACCOUNT' : 'PROFILE',
            partyId: workspace.mode === 'business' ? workspace.activeBusinessId || '' : profile?.id || '',
          },
          selectedCounterparty || undefined,
        ),
      ),
    [history, profile?.id, selectedCounterparty, workspace.activeBusinessId, workspace.mode],
  );

  // Biznes ishtirok etgan tranzaksiyada amalni bajargan xodim telefoni.
  const performerPhone = useMemo(() => {
    if (!selectedTransaction) return '';
    const businessInvolved = Boolean(
      selectedTransaction.creditorBusinessId || selectedTransaction.debtorBusinessId,
    );
    if (!businessInvolved) return '';
    return (
      selectedTransaction.creditorBusinessProfilePhone ||
      selectedTransaction.debtorBusinessProfilePhone ||
      selectedTransaction.createdByProfilePhone ||
      ''
    );
  }, [selectedTransaction]);

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

  if (!contact) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>{t('contact.notFound')}</Text>
      </View>
    );
  }

  const isEmpty = mappedHistory.length === 0;

  return (
    <View style={styles.container}>
      <ContactBalanceHeader contact={contact} balances={balances} onBack={navigation.goBack} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadScreenData} tintColor={colors.primary} />
        }
      >
        {error ? (
          <Pressable style={styles.errorBox} onPress={loadScreenData}>
            <Text style={styles.errorText}>{error}</Text>
            <Text style={styles.retryText}>{t('common.retry')}</Text>
          </Pressable>
        ) : null}

        <View style={styles.listCard}>
          {loading && isEmpty ? (
            <SkeletonCardList count={4} containerStyle={styles.listSkeleton} />
          ) : isEmpty ? (
            <Text style={styles.emptyText}>{t('debts.emptyAccount')}</Text>
          ) : (
            mappedHistory.map((item, index) => (
              <FadeInView
                key={item.id}
                delay={Math.min(index * ROW_STAGGER_MS, ROW_STAGGER_CAP_MS)}
                duration={300}
                fromY={10}
              >
                <TransactionRow
                  tx={item}
                  isLast={index === mappedHistory.length - 1}
                  onPress={setSelectedTransaction}
                />
              </FadeInView>
            ))
          )}
        </View>
      </ScrollView>

      {allowWrite ? (
        <View style={styles.bottomActions}>
          <Button
            title={t('contact.took')}
            onPress={() => openModal('TAKE')}
            style={[styles.actionBtn, styles.takeBtn]}
          />
          <Button
            title={t('contact.gave')}
            onPress={() => openModal('GIVE')}
            style={[styles.actionBtn, styles.giveBtn]}
          />
        </View>
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

const createStyles = ({ colors, spacing, radius, typography }: ThemeValue) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scroll: {
      flex: 1,
    },
    content: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.xxs,
      paddingBottom: spacing.md,
    },
    errorBox: {
      borderWidth: 1,
      borderColor: colors.danger,
      backgroundColor: colors.dangerMuted,
      borderRadius: radius.sm,
      padding: spacing.sm,
      marginBottom: spacing.sm,
    },
    errorText: {
      ...typography.caption,
      fontSize: 13,
      color: colors.negative,
    },
    retryText: {
      ...typography.caption,
      marginTop: spacing.xxs,
      fontWeight: '600',
      color: colors.primary,
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
    emptyText: {
      ...typography.body,
      textAlign: 'center',
      color: colors.textSecondary,
      paddingVertical: spacing.lg,
    },
    bottomActions: {
      flexDirection: 'row',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      paddingBottom: spacing.md,
      backgroundColor: colors.background,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    actionBtn: {
      flex: 1,
    },
    takeBtn: {
      backgroundColor: colors.danger,
      borderWidth: 0,
    },
    giveBtn: {
      backgroundColor: colors.primary,
      borderWidth: 0,
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
  });

export default ContactDetailScreen;
