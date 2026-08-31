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
import { useConfirmGapTransfer, useCreateGapTransfer, useGapMemberDetail } from '../hooks/useGap';
import Button from '../../../shared/ui/Button';
import GapTransferRow from '../components/GapTransferRow';
import GapTransferFormModal from '../components/GapTransferFormModal';
import { GapTransferDTO, GapTransferDirection, GapUnit, toAmount } from '../types/gap';
import { formatGapAmount } from '../model/gapFormat';

interface Section {
  direction: 'in' | 'out';
  title: string;
  total: string;
  data: GapTransferDTO[];
}

/**
 * Bitta a'zoning hisob-kitobi — Qarzlar bo'limidagi mijoz ekrani bilan bir
 * xil tuzilishda: yuqorida oldi-berdi tarixi, pastda ikkita to'la enli tugma.
 *
 * Ikki bo'lim: unga kim qancha bergan (kirim) va u kimga qancha bergan
 * (chiqim). Bo'lim sarlavhasidagi jami — faqat ikki tomon tasdiqlagan
 * yozuvlardan (TZ 09).
 *
 * "Berdim" va "Oldim" istalgan paytda bosiladi: navbat ham, davr ham yo'q.
 * Yozuvni kiritgan odam uni o'zi tasdiqlamaydi — tasdiq qarama-qarshi
 * tomonda qoladi. Tasdig'imni kutayotgan yozuvni qator ustiga bosib
 * tasdiqlayman.
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

  const sections = useMemo<Section[]>(() => {
    if (!detail) return [];
    return [
      {
        direction: 'in',
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
    ({ item, section, index }: { item: GapTransferDTO; section: Section; index: number }) => (
      <GapTransferRow
        item={item}
        unit={unit}
        direction={section.direction}
        isLast={index === section.data.length - 1}
        onPress={item.canConfirm ? confirmRow : undefined}
      />
    ),
    [unit, confirmRow]
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

  const keyExtractor = useCallback((item: GapTransferDTO) => item.transferId, []);

  const actionError =
    (createMutation.error as Error | null)?.message ??
    (confirmMutation.error as Error | null)?.message ??
    null;

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

      {actionError ? <Text style={styles.error}>{actionError}</Text> : null}

      {/* Qarzlar bo'limidagi kabi: ikkita to'la enli tugma — "Oldim" qizil,
          "Berdim" yashil. O'z hisobimda amal yo'q. */}
      {isSelf ? (
        <Text style={styles.actionHint}>
          {detail?.incoming.some((item) => item.canConfirm)
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
