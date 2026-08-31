import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, type ListRenderItem, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenHeader from '../../../shared/ui/ScreenHeader';
import { SkeletonCardList } from '../../../shared/ui/SkeletonShimmer';
import FloatingActionButton from '../../../shared/ui/FloatingActionButton';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import { ROUTES } from '../../../app/navigation/routes';
import type { GapScreenProps } from '../../../app/navigation/types';
import { useAddGapMember, useGapGroup, useGapMembers } from '../hooks/useGap';
import GapMemberRow from '../components/GapMemberRow';
import GapMemberFormModal from '../components/GapMemberFormModal';
import GapGroupBalanceCard from '../components/GapGroupBalanceCard';
import { GapMemberDTO, GapUnit, toAmount } from '../types/gap';

/**
 * Bitta gap kassa: a'zolar ro'yxati.
 *
 * Ro'yxat Qarzlar bo'limidagi mijozlar ro'yxati bilan bir xil ko'rinishda —
 * har qatorda ism, telefon va MENGA NISBATAN hisob: undan olganim, unga
 * berganim. Qatorga bosilsa o'sha odam bilan bo'lgan oldi-berdi tarixi
 * ochiladi va o'sha yerdan "Berdim" / "Oldim" qilinadi.
 *
 * Navbat, qur'a va davr yo'q: istalgan a'zo istalgan paytda istalgan a'zo
 * bilan hisob-kitob qiladi.
 */
const GapDetailScreen: React.FC<GapScreenProps<typeof ROUTES.GAP_DETAIL>> = ({
  navigation,
  route,
}) => {
  const theme = useAppTheme();
  const { colors } = theme;
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const { id, name, unitCode, unitLabel, unitType } = route.params;

  // Sarlavhadagi raqamlar a'zo qo'shilganda ham yangilanishi kerak —
  // shuning uchun route parametrlariga emas, so'rovga tayanamiz.
  const groupQuery = useGapGroup(id);
  const group = groupQuery.data;
  const organizer = group?.organizer ?? route.params.organizer;

  const membersQuery = useGapMembers(id);
  const members = useMemo(() => membersQuery.data ?? [], [membersQuery.data]);

  const addMemberMutation = useAddGapMember(id);
  const [memberModalOpen, setMemberModalOpen] = useState(false);

  const unit: GapUnit = useMemo(
    () => ({
      code: group?.unitCode ?? unitCode,
      label: group?.unitLabel ?? unitLabel,
      type: group?.unitType ?? unitType,
    }),
    [group, unitCode, unitLabel, unitType]
  );

  const openMember = useCallback(
    (member: GapMemberDTO) => {
      navigation.navigate(ROUTES.GAP_MEMBER, {
        memberId: member.memberId,
        groupId: id,
        memberName: member.memberName,
        unitCode: unit.code,
        unitLabel: unit.label,
        unitType: unit.type,
      });
    },
    [navigation, id, unit]
  );

  const renderItem: ListRenderItem<GapMemberDTO> = useCallback(
    ({ item, index }) => (
      <GapMemberRow
        item={item}
        unit={unit}
        isLast={index === members.length - 1}
        onPress={openMember}
      />
    ),
    [unit, members.length, openMember]
  );

  const keyExtractor = useCallback((item: GapMemberDTO) => item.memberId, []);

  const handleRefresh = useCallback(() => {
    groupQuery.refetch();
    membersQuery.refetch();
  }, [groupQuery, membersQuery]);

  const addError = (addMemberMutation.error as Error | null)?.message ?? null;

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={group?.name ?? name}
        subtitle={t('gap.memberCount', { count: String(members.length) })}
        onBack={navigation.goBack}
      />

      <GapGroupBalanceCard
        unit={unit}
        received={toAmount(group?.myTotalReceived)}
        given={toAmount(group?.myTotalGiven)}
        loading={groupQuery.isLoading}
      />

      {addError ? <Text style={styles.error}>{addError}</Text> : null}

      <FlatList
        style={styles.list}
        contentContainerStyle={styles.listCard}
        data={membersQuery.isLoading ? [] : members}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        showsVerticalScrollIndicator={false}
        initialNumToRender={14}
        refreshControl={
          <RefreshControl
            refreshing={membersQuery.isFetching && !membersQuery.isLoading}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          membersQuery.isLoading ? (
            <SkeletonCardList count={4} containerStyle={styles.skeleton} />
          ) : (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="people-outline" size={26} color={colors.textSecondary} />
              </View>
              <Text style={styles.emptyText}>
                {organizer ? t('gap.membersEmptyOrganizer') : t('gap.membersEmpty')}
              </Text>
            </View>
          )
        }
      />

      {/* A'zo qo'shish faqat guruhni yaratgan odamda. */}
      {organizer ? (
        <FloatingActionButton
          onPress={() => setMemberModalOpen(true)}
          accessibilityLabel={t('gap.addMemberTitle')}
          pulse={members.length === 0}
        />
      ) : null}

      <GapMemberFormModal
        visible={memberModalOpen}
        loading={addMemberMutation.isPending}
        error={addError}
        onClose={() => setMemberModalOpen(false)}
        onSubmit={(payload) =>
          addMemberMutation.mutate(payload, { onSuccess: () => setMemberModalOpen(false) })
        }
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
    error: {
      ...typography.caption,
      color: colors.danger,
      textAlign: 'center',
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.xs,
    },
    empty: {
      alignItems: 'center',
      paddingVertical: spacing.xl,
      gap: spacing.sm,
    },
    emptyIcon: {
      width: 52,
      height: 52,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceMuted,
    },
    emptyText: {
      ...typography.caption,
      color: colors.textSecondary,
      textAlign: 'center',
      paddingHorizontal: spacing.lg,
    },
  });

export default GapDetailScreen;
