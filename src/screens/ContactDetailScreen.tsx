import React, { useCallback, useContext, useMemo, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import FadeInView from '../components/animations/FadeInView';
import MoneyActionModal, { MoneyActionPayload } from '../components/money/MoneyActionModal';
import Button from '../components/atoms/Button';
import { SkeletonCardList } from '../components/ui/SkeletonShimmer';
import { AuthContext } from '../context/AuthContext';
import { ContactsContext } from '../context/ContactsContext';
import { WorkspaceContext } from '../context/WorkspaceContext';
import { useMoney } from '../hooks/useMoney';
import { useAccountContext } from '../hooks/useAccountContext';
import { useContactAvatars } from '../shared/contactAvatars';
import { useAppTheme } from '../theme';
import type { ThemeValue } from '../theme/ThemeProvider';
import type { DebtsScreenProps } from '../navigation/types';
import { ROUTES } from '../navigation/routes';
import { MoneyActionType } from '../types/money';
import { netByCurrency } from '../utils/currency';
import { canWrite } from '../utils/permissions';
import { useI18n } from '../i18n';
import ContactBalanceHeader from './debts/ContactBalanceHeader';
import TransactionRow from './debts/TransactionRow';
import TransactionDetailModal from './debts/TransactionDetailModal';
import { mapTransaction, MappedTransaction } from './debts/transactionMapping';

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
  const { avatars } = useContactAvatars();

  const [modalVisible, setModalVisible] = useState(false);
  const [actionType, setActionType] = useState<MoneyActionType>('TAKE');
  const [selectedTransaction, setSelectedTransaction] = useState<MappedTransaction | null>(null);
  const [avatarPreviewVisible, setAvatarPreviewVisible] = useState(false);

  const { history, currencyTotals, selectedCounterparty, loading, creating, error, fetchData, createMoney } =
    useMoney({ token: profile?.jwt });

  const contact = useMemo(() => contacts.find((item) => item.id === contactId), [contacts, contactId]);
  const avatarUri = contact ? avatars[contact.partyId || contact.id] : undefined;

  // Har valyuta balansi MUSTAQIL — so'm alohida, dollar alohida (kurs aralashmaydi).
  const balances = useMemo(
    () => netByCurrency(currencyTotals.credit, currencyTotals.debt),
    [currencyTotals],
  );

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

  const handleAvatarPress = useCallback(() => {
    if (avatarUri) setAvatarPreviewVisible(true);
  }, [avatarUri]);

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
      <ContactBalanceHeader
        contact={contact}
        balances={balances}
        avatarUri={avatarUri}
        onBack={navigation.goBack}
        onAvatarPress={handleAvatarPress}
      />

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

      <Modal
        visible={avatarPreviewVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAvatarPreviewVisible(false)}
      >
        <Pressable style={styles.avatarPreviewBackdrop} onPress={() => setAvatarPreviewVisible(false)}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatarPreviewImage} resizeMode="contain" />
          ) : null}
        </Pressable>
      </Modal>

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
    avatarPreviewBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.85)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarPreviewImage: {
      width: '90%',
      height: '70%',
      borderRadius: radius.lg,
    },
  });

export default ContactDetailScreen;
