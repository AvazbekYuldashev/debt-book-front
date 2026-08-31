import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, type ListRenderItem, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SkeletonCardList } from '../../../shared/ui/SkeletonShimmer';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import type { GapScreenProps } from '../../../app/navigation/types';
import type { ROUTES } from '../../../app/navigation/routes';
import { useConfirmGapTransfer, useCreateGapTransfer, useGapMemberDetail } from '../hooks/useGap';
import Button from '../../../shared/ui/Button';
import GapTransferRow from '../components/GapTransferRow';
import GapMemberBalanceHeader from '../components/GapMemberBalanceHeader';
import GapTransferFormModal from '../components/GapTransferFormModal';
import { GapTransferDTO, GapTransferDirection, GapUnit, toAmount } from '../types/gap';

/** Ro'yxat qatori: yozuv va uning men uchun yo'nalishi. */
interface LedgerItem {
  transfer: GapTransferDTO;
  direction: 'in' | 'out';
}

/**
 * Bitta a'zoning hisob-kitobi — Qarzlar bo'limidagi mijoz ekrani bilan bir
 * xil tuzilishda: tepada balans kartasi, o'rtada BITTA tekis tarix, pastda
 * ikkita to'la enli tugma.
 *
 * Tarix bo'limlarga bo'linmaydi: oldi ham, berdi ham bitta ro'yxatda, yangisi
 * birinchi. Yo'nalishni ikonka va rang bildiradi — undan olganim yashil,
 * unga berganim qizil. Vaqt tartibida o'qilgani hisobni tushunishni
 * osonlashtiradi: ikki ustunni solishtirib o'tirish shart emas.
 *
 * Ro'yxatda FAQAT men shu odam bilan qilgan oldi-berdi turadi — uning
 * boshqalar bilan hisobi menga aloqador emas.
 *
 * "Berdim" va "Oldim" istalgan paytda bosiladi: navbat ham, davr ham yo'q.
 * Yozuvni kiritgan odam uni o'zi tasdiqlamaydi — tasdiq qarama-qarshi
 * tomonda qoladi, shu sababli tasdig'imni kutayotgan qator bosiladigan
 * bo'ladi.
 */
const GapMemberDetailScreen: React.FC<GapScreenProps<typeof ROUTES.GAP_MEMBER>> = ({
  navigation,
  route,
}) => {
  const theme = useAppTheme();
  const { colors } = theme;
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const { memberId, groupId, memberName, unitCode, unitLabel, unitType } = route.params;
  const unit: GapUnit = useMemo(
    () => ({ code: unitCode, label: unitLabel, type: unitType }),
    [unitCode, unitLabel, unitType]
  );

  const detailQuery = useGapMemberDetail(memberId);
  const detail = detailQuery.data;

  const createMutation = useCreateGapTransfer(groupId);
  const confirmMutation = useConfirmGapTransfer();

  const [direction, setDirection] = useState<GapTransferDirection | null>(null);

  /** O'z hisobimda oldi-berdi tugmalari ma'nosiz — pul o'zimda qoladi. */
  const isSelf = detail?.me ?? false;

  const submitTransfer = useCallback(
    (amount: number, note: string | null) => {
      createMutation.mutate(
        {
          counterpartyMemberId: memberId,
          amount,
          note: note ?? undefined,
          direction: direction ?? 'GIVE',
        },
        { onSuccess: () => setDirection(null) }
      );
    },
    [createMutation, memberId, direction]
  );

  /** Tasdig'imni kutayotgan yozuvni qator ustiga bosib tasdiqlash. */
  const confirmRow = useCallback(
    (item: GapTransferDTO) => confirmMutation.mutate(item.transferId),
    [confirmMutation]
  );

  /**
   * Ikki oqim bitta ro'yxatga qo'shilib, sana bo'yicha teskari saralanadi —
   * hisob-kitobni vaqt tartibida o'qish uchun shu tabiiy.
   */
  const items = useMemo<LedgerItem[]>(() => {
    if (!detail) return [];
    const merged: LedgerItem[] = [
      ...detail.incoming.map((transfer) => ({ transfer, direction: 'in' as const })),
      ...detail.outgoing.map((transfer) => ({ transfer, direction: 'out' as const })),
    ];
    return merged.sort((a, b) => {
      const left = a.transfer.date ? Date.parse(a.transfer.date) : 0;
      const right = b.transfer.date ? Date.parse(b.transfer.date) : 0;
      return right - left;
    });
  }, [detail]);

  const renderItem: ListRenderItem<LedgerItem> = useCallback(
    ({ item, index }) => (
      <GapTransferRow
        item={item.transfer}
        unit={unit}
        direction={item.direction}
        isLast={index === items.length - 1}
        onPress={item.transfer.canConfirm ? confirmRow : undefined}
      />
    ),
    [unit, items.length, confirmRow]
  );

  const keyExtractor = useCallback((item: LedgerItem) => item.transfer.transferId, []);

  const actionError =
    (createMutation.error as Error | null)?.message ??
    (confirmMutation.error as Error | null)?.message ??
    null;

  return (
    <View style={styles.container}>
      <GapMemberBalanceHeader
        memberName={detail?.memberName ?? memberName}
        memberPhone={detail?.memberPhone ?? null}
        unit={unit}
        received={toAmount(detail?.totalReceived)}
        given={toAmount(detail?.totalGiven)}
        onBack={navigation.goBack}
      />

      <FlatList
        style={styles.list}
        contentContainerStyle={styles.listCard}
        data={detailQuery.isLoading ? [] : items}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        showsVerticalScrollIndicator={false}
        initialNumToRender={14}
        windowSize={11}
        refreshControl={
          <RefreshControl
            refreshing={detailQuery.isFetching && !detailQuery.isLoading}
            onRefresh={detailQuery.refetch}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          detailQuery.isLoading ? (
            <SkeletonCardList count={4} containerStyle={styles.skeleton} />
          ) : (
            <Text style={styles.emptyText}>{t('gap.noTransfers')}</Text>
          )
        }
      />

      {actionError ? <Text style={styles.error}>{actionError}</Text> : null}

      {/* Qarzlar bo'limidagi kabi: ikkita to'la enli tugma — "Oldim" qizil,
          "Berdim" yashil. O'z hisobimda amal yo'q. */}
      {isSelf ? (
        <Text style={styles.actionHint}>
          {items.some((item) => item.transfer.canConfirm)
            ? t('gap.tapToConfirm')
            : t('gap.selfLedger')}
        </Text>
      ) : (
        <View style={styles.actionBar}>
          <Button
            title={t('gap.take')}
            onPress={() => setDirection('TAKE')}
            style={[styles.actionBtn, styles.takeBtn]}
          />
          <Button
            title={t('gap.give')}
            onPress={() => setDirection('GIVE')}
            style={[styles.actionBtn, styles.giveBtn]}
          />
        </View>
      )}

      <GapTransferFormModal
        visible={direction != null}
        direction={direction ?? 'GIVE'}
        memberName={memberName}
        unit={unit}
        loading={createMutation.isPending}
        error={(createMutation.error as Error | null)?.message ?? null}
        onClose={() => setDirection(null)}
        onSubmit={submitTransfer}
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
    listCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      marginHorizontal: spacing.md,
      marginBottom: spacing.md,
      overflow: 'hidden',
    },
    skeleton: {
      padding: spacing.md,
    },
    emptyText: {
      ...typography.body,
      textAlign: 'center',
      color: colors.textSecondary,
      paddingVertical: spacing.lg,
    },
    error: {
      ...typography.caption,
      color: colors.danger,
      textAlign: 'center',
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.xs,
    },
    actionBar: {
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
    actionHint: {
      ...typography.caption,
      fontSize: 11,
      color: colors.textSecondary,
      textAlign: 'center',
      paddingVertical: spacing.sm,
      backgroundColor: colors.surface,
    },
  });

export default GapMemberDetailScreen;
