import React, { useCallback, useContext, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Card from '../../../shared/ui/Card';
import Button from '../../../shared/ui/Button';
import ScreenHeader from '../../../shared/ui/ScreenHeader';
import { SkeletonCardList } from '../../../shared/ui/SkeletonShimmer';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import { AuthContext } from '../../auth/context/AuthContext';
import { formatCurrency } from '../../../shared/lib/currency';
import { formatGapAmount } from '../lib/gapUi';
import type { Currency } from '../../../shared/types/money';
import { ROUTES } from '../../../app/navigation/routes';
import type { GapScreenProps } from '../../../app/navigation/types';
import { getGapGroup, getGapSettlement, terminateGapGroup } from '../services/gapService';
import type { GapGroupResponseDTO, GapSettlementDTO, GapShareBalanceDTO } from '../types/gap';

/**
 * Yakuniy hisob-kitob (TZ 10.5).
 *
 * "Bu eng noqulay lahza va aynan shunda aniq yozuv bebaho bo'ladi."
 *
 * Ekran faol guruhda ham ochiq: a'zolar istalgan payt "hozir to'xtasak nima
 * bo'ladi" degan savolga javob ko'ra olishi kerak.
 */
const GapSettlementScreen: React.FC<GapScreenProps<typeof ROUTES.GAP_SETTLEMENT>> = ({
  navigation,
  route,
}) => {
  const { groupId, groupName } = route.params;
  const theme = useAppTheme();
  const { colors } = theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { profile } = useContext(AuthContext);

  const [group, setGroup] = useState<GapGroupResponseDTO | null>(null);
  const [settlement, setSettlement] = useState<GapSettlementDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');

  // Serverning javobi asosiy: saqlangan profilda `id` bo'lmasa ham
  // tashkilotchi o'z tugmalarini ko'radi.
  const isOrganizer = group?.organizer ?? (group?.organizerProfileId === profile?.id);
  const canTerminate =
    isOrganizer && (group?.status === 'ACTIVE' || group?.status === 'DRAFT');
  const currency = (settlement?.currency as Currency | undefined) ?? group?.currency;

  const load = useCallback(
    async (showSpinner = true) => {
      if (!profile?.jwt) return;
      if (showSpinner) setLoading(true);
      setError('');
      try {
        const [nextGroup, nextSettlement] = await Promise.all([
          getGapGroup(groupId, profile.jwt),
          getGapSettlement(groupId, profile.jwt),
        ]);
        setGroup(nextGroup);
        setSettlement(nextSettlement);
      } catch (e) {
        setError(e instanceof Error ? e.message : t('common.error'));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [groupId, profile?.jwt, t],
  );

  useFocusEffect(
    useCallback(() => {
      load(!settlement);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [load]),
  );

  const handleTerminate = async () => {
    if (!profile?.jwt) return;
    setBusy(true);
    setError('');
    try {
      setSettlement(await terminateGapGroup(groupId, undefined, profile.jwt));
      setConfirming(false);
      await load(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'));
    } finally {
      setBusy(false);
    }
  };

  const renderGroup = (title: string, items: GapShareBalanceDTO[], tone: 'debt' | 'credit' | 'flat') => {
    if (items.length === 0) return null;
    const color = tone === 'debt' ? colors.negative : tone === 'credit' ? colors.positive : colors.textSecondary;
    return (
      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {items.map((item) => (
          <View key={item.shareId} style={styles.row}>
            <Text style={styles.name} numberOfLines={1}>
              {item.memberName ?? '—'}
            </Text>
            <Text style={[styles.amount, { color }]}>
              {formatGapAmount(Math.abs(item.openRisk), group)}
            </Text>
          </View>
        ))}
      </Card>
    );
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScreenHeader
        title={t('gap.settlement.title')}
        subtitle={settlement?.groupName ?? groupName}
        onBack={() => navigation.goBack()}
      />

      {loading && !settlement ? (
        <SkeletonCardList count={3} containerStyle={styles.body} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load(false);
              }}
              tintColor={colors.primary}
            />
          }
        >
          {error ? <Text style={styles.error}>{error}</Text> : null}

          {!settlement ? (
            <Card style={styles.card}>
              <Text style={styles.muted}>{t('gap.settlement.empty')}</Text>
            </Card>
          ) : (
            <>
              <Card style={styles.card}>
                <Text style={styles.muted}>
                  {t('gap.settlement.progress', {
                    closed: settlement.closedRounds ?? 0,
                    total: settlement.totalRounds ?? 0,
                  })}
                </Text>
                <View style={styles.totals}>
                  <View style={styles.totalCell}>
                    <Text style={styles.totalLabel}>{t('gap.settlement.owedToGroup')}</Text>
                    <Text style={[styles.totalValue, { color: colors.negative }]}>
                      {formatGapAmount(settlement.totalOwedToGroup, group)}
                    </Text>
                  </View>
                  <View style={styles.totalCell}>
                    <Text style={styles.totalLabel}>{t('gap.settlement.owedByGroup')}</Text>
                    <Text style={[styles.totalValue, { color: colors.positive }]}>
                      {formatGapAmount(settlement.totalOwedByGroup, group)}
                    </Text>
                  </View>
                </View>
              </Card>

              {renderGroup(t('gap.settlement.debtors'), settlement.debtors, 'debt')}
              {renderGroup(t('gap.settlement.creditors'), settlement.creditors, 'credit')}
              {renderGroup(t('gap.settlement.settled'), settlement.settled, 'flat')}
            </>
          )}

          {canTerminate ? (
            <Card style={styles.card}>
              <Text style={styles.sectionTitle}>{t('gap.settlement.terminate')}</Text>
              <Text style={styles.muted}>{t('gap.settlement.terminateHint')}</Text>
              {confirming ? (
                <View style={styles.confirmRow}>
                  <Button
                    title={t('common.cancel')}
                    onPress={() => setConfirming(false)}
                    variant="secondary"
                    style={styles.confirmButton}
                  />
                  <Button
                    title={t('common.confirm')}
                    onPress={handleTerminate}
                    loading={busy}
                    style={styles.confirmButton}
                  />
                </View>
              ) : (
                <Button
                  title={t('gap.settlement.terminate')}
                  onPress={() => setConfirming(true)}
                  variant="outline"
                  style={styles.terminateButton}
                />
              )}
            </Card>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
};

const createStyles = ({ colors, spacing, typography }: ThemeValue) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    body: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
    card: { marginBottom: spacing.sm, gap: spacing.xxs },
    sectionTitle: {
      ...typography.body,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    muted: {
      ...typography.bodySmall,
      color: colors.textSecondary,
    },
    totals: {
      flexDirection: 'row',
      marginTop: spacing.xs,
      paddingTop: spacing.xs,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    totalCell: { flex: 1, gap: 2 },
    totalLabel: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    totalValue: {
      ...typography.body,
      fontWeight: '700',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: spacing.xs,
      paddingVertical: spacing.xs,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    name: {
      ...typography.bodySmall,
      color: colors.textPrimary,
      flex: 1,
    },
    amount: {
      ...typography.bodySmall,
      fontWeight: '700',
    },
    terminateButton: { marginTop: spacing.xs },
    confirmRow: {
      flexDirection: 'row',
      gap: spacing.xs,
      marginTop: spacing.xs,
    },
    confirmButton: { flex: 1 },
    error: {
      ...typography.bodySmall,
      color: colors.danger,
      marginBottom: spacing.xs,
    },
  });

export default GapSettlementScreen;
