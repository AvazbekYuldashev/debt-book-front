import React, { useCallback, useContext, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SkeletonCardList } from '../../../shared/ui/SkeletonShimmer';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import { AuthContext } from '../../auth/context/AuthContext';
import { ROUTES } from '../../../app/navigation/routes';
import type { GapNavigation } from '../../../app/navigation/types';
import GapGroupCard from '../components/GapGroupCard';
import GapCreateGroupModal from '../components/GapCreateGroupModal';
import { createGapGroup, getMyGapDashboard, getMyGapGroups } from '../services/gapService';
import type { GapGroupCreateDTO, GapGroupResponseDTO } from '../types/gap';

/**
 * Gap kassa bosh ekrani — foydalanuvchi qatnashgan barcha guruhlar.
 *
 * Har bir guruh uchun navbat raqami alohida so'rov bilan olinadi
 * (Promise.allSettled). Bitta guruh yuklanmasa qolganlari baribir ko'rinadi —
 * ro'yxat bitta xato tufayli butunlay bo'sh qolmasligi kerak.
 */
const GapGroupsScreen: React.FC<{ navigation: GapNavigation }> = ({ navigation }) => {
  const theme = useAppTheme();
  const { colors } = theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { profile } = useContext(AuthContext);

  const [groups, setGroups] = useState<GapGroupResponseDTO[]>([]);
  const [positions, setPositions] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [error, setError] = useState('');

  const loadPositions = useCallback(
    async (list: GapGroupResponseDTO[]) => {
      if (!profile?.jwt || list.length === 0) {
        setPositions({});
        return;
      }
      const results = await Promise.allSettled(
        list.map((group) => getMyGapDashboard(group.id, profile.jwt)),
      );
      const next: Record<string, number> = {};
      results.forEach((result, index) => {
        const groupId = list[index]?.id;
        if (!groupId || result.status !== 'fulfilled') return;
        const position = result.value.myShares?.[0]?.queuePosition;
        if (position) next[groupId] = position;
      });
      setPositions(next);
    },
    [profile?.jwt],
  );

  const load = useCallback(
    async (showSpinner = true) => {
      if (!profile?.jwt) {
        setGroups([]);
        return;
      }
      if (showSpinner) setLoading(true);
      setError('');
      try {
        const page = await getMyGapGroups({ page: 1, size: 30 }, profile.jwt);
        const list = page.content ?? [];
        setGroups(list);
        await loadPositions(list);
      } catch (e) {
        setError(e instanceof Error ? e.message : t('common.error'));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [profile?.jwt, loadPositions, t],
  );

  useFocusEffect(
    useCallback(() => {
      load(groups.length === 0);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [load]),
  );

  const handleCreate = async (dto: GapGroupCreateDTO) => {
    if (!profile?.jwt) return;
    setCreating(true);
    setError('');
    try {
      const created = await createGapGroup(dto, profile.jwt);
      setModalVisible(false);
      await load(false);
      navigation.navigate(ROUTES.GAP_GROUP_DETAIL, {
        groupId: created.id,
        groupName: created.name,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'));
    } finally {
      setCreating(false);
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + theme.spacing.xs }]}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>{t('gap.groups.title')}</Text>
          <Text style={styles.subtitle}>{t('gap.groups.subtitle')}</Text>
        </View>
        <Pressable
          onPress={() => setModalVisible(true)}
          style={({ pressed }) => [styles.addButton, { opacity: pressed ? 0.85 : 1 }]}
          accessibilityLabel={t('gap.groups.create')}
        >
          <Feather name="plus" size={22} color={colors.textOnPrimary} />
        </Pressable>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {loading ? (
        <SkeletonCardList count={3} containerStyle={styles.list} />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.list, groups.length === 0 && styles.listEmpty]}
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
          {groups.length === 0 ? (
            <View style={styles.empty}>
              <Feather name="users" size={40} color={colors.outline} />
              <Text style={styles.emptyTitle}>{t('gap.groups.empty')}</Text>
              <Text style={styles.emptyHint}>{t('gap.groups.emptyHint')}</Text>
            </View>
          ) : (
            groups.map((group) => (
              <GapGroupCard
                key={group.id}
                group={group}
                myPosition={positions[group.id]}
                onPress={() =>
                  navigation.navigate(ROUTES.GAP_GROUP_DETAIL, {
                    groupId: group.id,
                    groupName: group.name,
                  })
                }
              />
            ))
          )}
        </ScrollView>
      )}

      <GapCreateGroupModal
        visible={modalVisible}
        saving={creating}
        onClose={() => setModalVisible(false)}
        onSubmit={handleCreate}
      />
    </View>
  );
};

const createStyles = ({ colors, spacing, radius, typography }: ThemeValue) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.sm,
      gap: spacing.sm,
    },
    headerText: {
      flex: 1,
    },
    title: {
      ...typography.heading2,
      color: colors.textPrimary,
    },
    subtitle: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    addButton: {
      width: 44,
      height: 44,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
    },
    list: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.xl,
    },
    listEmpty: {
      flexGrow: 1,
      justifyContent: 'center',
    },
    empty: {
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.lg,
    },
    emptyTitle: {
      ...typography.body,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    emptyHint: {
      ...typography.bodySmall,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    error: {
      ...typography.bodySmall,
      color: colors.danger,
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.xs,
    },
  });

export default GapGroupsScreen;
