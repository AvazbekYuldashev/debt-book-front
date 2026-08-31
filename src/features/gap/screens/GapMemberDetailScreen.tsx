import React, { useCallback, useMemo, useState } from 'react';
import { RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenHeader from '../../../shared/ui/ScreenHeader';
import { SkeletonCardList } from '../../../shared/ui/SkeletonShimmer';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import { formatPhoneDisplay } from '../../../shared/lib/phone';
import type { GapScreenProps } from '../../../app/navigation/types';
import type { ROUTES } from '../../../app/navigation/routes';
import { useGapPaymentAction, useGapShareDetail } from '../hooks/useGap';
import Button from '../../../shared/ui/Button';
import GapTransferRow from '../components/GapTransferRow';
import GapPaymentActionModal, {
  type GapPaymentAction,
} from '../components/GapPaymentActionModal';
import { GapTransferDTO, GapUnit, toAmount } from '../types/gap';
import { formatGapAmount } from '../model/gapFormat';

interface Section {
  direction: 'in' | 'out';
  title: string;
  total: string;
  data: GapTransferDTO[];
}

/**
 * Bitta a'zoning hisob-kitobi.
 *
 * Ikki bo'lim: unga kim qancha bergan (kirim) va u kimga qancha bergan (chiqim).
 * Bo'lim sarlavhasidagi jami — faqat ikki tomon tasdiqlagan yozuvlardan (TZ 09).
 */
const GapMemberDetailScreen: React.FC<GapScreenProps<typeof ROUTES.GAP_MEMBER>> = ({
  navigation,
  route,
}) => {
  const theme = useAppTheme();
  const { colors } = theme;
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const { shareId, memberName, unitCode, unitLabel, unitType } = route.params;
  const unit: GapUnit = useMemo(
    () => ({ code: unitCode, label: unitLabel, type: unitType }),
    [unitCode, unitLabel, unitType]
  );

  const detailQuery = useGapShareDetail(shareId);
  const detail = detailQuery.data;

  const actionMutation = useGapPaymentAction();
  const [action, setAction] = useState<GapPaymentAction | null>(null);
  /** Qatordan tanlangan to'lov — o'z hisobimda tasdiqlash shu orqali. */
  const [rowPayment, setRowPayment] = useState<GapTransferDTO | null>(null);

  /**
   * Tugmalar joriy foydalanuvchi bilan shu a'zo orasidagi yozuvga tegishli.
   *
   * "Berdim"  — men shu a'zoga to'laydigan yozuv (u kirimda: menga tegishli
   *             qator), hali tasdiqlanmagan bo'lsa.
   * "Oldim"   — shu a'zo menga to'lagan yozuv (u chiqimda), to'landi deb
   *             belgilangan, lekin men hali tasdiqlamagan (TZ 09).
   */
  /**
   * O'z hisobim ochilgan bo'lsa amal yo'q.
   *
   * Bir odam ikki ulush olishi mumkin, o'shanda uning bir ulushi ikkinchisiga
   * "to'laydigan" yozuv paydo bo'ladi. Yozuv hisob uchun kerak, lekin uni
   * o'zimga "berdim / oldim" deb tasdiqlash ma'nosiz.
   *
   * Boshqalar menga to'lagan pulni tasdiqlash ular ochilganda amalga oshadi:
   * har bir yozuv o'z egasining ekranida turadi.
   */
  const isSelf = detail?.me ?? false;

  const payable = useMemo(
    () =>
      isSelf
        ? null
        : detail?.incoming.find(
            (item) => item.counterpartyMe && !item.confirmed && !item.periodClosed
          ) ?? null,
    [detail, isSelf]
  );
  const confirmable = useMemo(
    () =>
      isSelf
        ? null
        : detail?.outgoing.find(
            (item) =>
              item.counterpartyMe &&
              item.status === 'PAID' &&
              !item.confirmed &&
              !item.periodClosed
          ) ?? null,
    [detail, isSelf]
  );

  const activePayment = rowPayment ?? (action === 'give' ? payable : confirmable);

  const closeAction = useCallback(() => {
    setAction(null);
    setRowPayment(null);
  }, []);

  /**
   * O'z hisobimda kutilayotgan to'lovni qator orqali tasdiqlash.
   *
   * Tasdiq aynan shu yerda bo'lgani qulay: kim menga to'laganini bir joyda
   * ko'rib, o'sha qatorning o'zidan tasdiqlayman. O'z ulushlarim orasidagi
   * yozuv esa chiqmaydi — u tasdiq talab qilmaydi.
   */
  const confirmRow = useCallback(
    (item: GapTransferDTO) => {
      setRowPayment(item);
      setAction('take');
    },
    []
  );

  const rowConfirmable = useCallback(
    (item: GapTransferDTO) =>
      isSelf &&
      !item.counterpartyMe &&
      item.status === 'PAID' &&
      !item.confirmed &&
      !item.periodClosed,
    [isSelf]
  );

  const submitAction = useCallback(
    (amount: number | null) => {
      if (!activePayment) return;
      actionMutation.mutate(
        { paymentId: activePayment.paymentId, amount, confirm: action === 'take' },
        { onSuccess: closeAction }
      );
    },
    [activePayment, action, actionMutation, closeAction]
  );

  const sections = useMemo<Section[]>(() => {
    if (!detail) return [];
    return [
      {
        direction: 'in',
        // O'z hisobimda sarlavha birinchi shaxsda: "menga kim bergan".
        title: isSelf ? t('gap.incomingTitleSelf') : t('gap.incomingTitle'),
        total: formatGapAmount(toAmount(detail.totalReceived), unit),
        data: detail.incoming,
      },
      {
        direction: 'out',
        title: isSelf ? t('gap.outgoingTitleSelf') : t('gap.outgoingTitle'),
        total: formatGapAmount(toAmount(detail.totalGiven), unit),
        data: detail.outgoing,
      },
    ];
  }, [detail, unit, isSelf, t]);

  const renderItem = useCallback(
    ({ item, section }: { item: GapTransferDTO; section: Section }) => (
      <GapTransferRow
        item={item}
        unit={unit}
        direction={section.direction}
        onPress={
          section.direction === 'in' && rowConfirmable(item) ? confirmRow : undefined
        }
      />
    ),
    [unit, rowConfirmable, confirmRow]
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: Section }) => (
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{section.title}</Text>
        <Text
          style={[
            styles.sectionTotal,
            { color: section.direction === 'in' ? colors.positive : colors.negative },
          ]}
        >
          {section.total}
        </Text>
      </View>
    ),
    [styles, colors]
  );

  const keyExtractor = useCallback((item: GapTransferDTO) => item.paymentId, []);

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={memberName}
        subtitle={formatPhoneDisplay(detail?.memberPhone ?? undefined, '')}
        onBack={navigation.goBack}
      />

      {detailQuery.isLoading ? (
        <SkeletonCardList count={5} containerStyle={styles.skeleton} />
      ) : (
        <SectionList
          style={styles.list}
          contentContainerStyle={styles.listContent}
          sections={sections}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={keyExtractor}
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
          initialNumToRender={14}
          refreshControl={
            <RefreshControl
              refreshing={detailQuery.isFetching}
              onRefresh={detailQuery.refetch}
              tintColor={colors.primary}
            />
          }
          renderSectionFooter={({ section }) =>
            section.data.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="swap-horizontal-outline" size={20} color={colors.textSecondary} />
                <Text style={styles.emptyText}>{t('gap.noTransfers')}</Text>
              </View>
            ) : null
          }
        />
      )}

      {/* Qarzlar ekranidagi kabi: pastda ikki amal. O'z hisobimda panel yo'q. */}
      {isSelf ? (
        <Text style={styles.actionHint}>
          {detail?.incoming.some(rowConfirmable) ? t('gap.tapToConfirm') : t('gap.selfLedger')}
        </Text>
      ) : (
      <View style={styles.actionBar}>
        <View style={styles.actionCell}>
          <Button
            title={t('gap.take')}
            variant="outline"
            onPress={() => setAction('take')}
            disabled={confirmable == null}
          />
        </View>
        <View style={styles.actionCell}>
          <Button
            title={t('gap.give')}
            onPress={() => setAction('give')}
            disabled={payable == null}
          />
        </View>
      </View>
      )}
      {!isSelf && payable == null && confirmable == null ? (
        <Text style={styles.actionHint}>{t('gap.nothingToGive')}</Text>
      ) : null}

      <GapPaymentActionModal
        visible={action != null}
        action={action ?? 'give'}
        payment={activePayment}
        memberName={memberName}
        unit={unit}
        loading={actionMutation.isPending}
        error={actionMutation.error ? (actionMutation.error as Error).message : null}
        onClose={closeAction}
        onSubmit={submitAction}
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
    listContent: {
      paddingBottom: spacing.md,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
      marginTop: spacing.sm,
      marginHorizontal: spacing.md,
      marginBottom: spacing.xs,
    },
    sectionTitle: {
      ...typography.caption,
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
      flexShrink: 1,
    },
    sectionTotal: {
      ...typography.caption,
      fontSize: 14,
      fontWeight: '800',
      fontVariant: ['tabular-nums'],
    },
    skeleton: {
      padding: spacing.md,
    },
    empty: {
      alignItems: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.lg,
      marginHorizontal: spacing.md,
      borderRadius: radius.lg,
      backgroundColor: colors.surface,
    },
    emptyText: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    actionBar: {
      flexDirection: 'row',
      gap: spacing.xs,
      padding: spacing.md,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    actionCell: {
      flex: 1,
    },
    actionHint: {
      ...typography.caption,
      fontSize: 11,
      color: colors.textSecondary,
      textAlign: 'center',
      paddingBottom: spacing.xs,
      backgroundColor: colors.surface,
    },
  });

export default GapMemberDetailScreen;
