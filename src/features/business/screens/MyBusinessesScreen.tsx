import React, { useCallback, useContext, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { AuthContext } from '../../auth/context/AuthContext';
import { WorkspaceContext } from '../context/WorkspaceContext';
import { useMyBusinesses, myBusinessesQueryKey } from '../hooks/useMyBusinesses';
import { BusinessDTO } from '../types/business';
import CreateBusinessModal from '../components/CreateBusinessModal';
import WorkspaceSwitcher from '../components/WorkspaceSwitcher';
import ScreenHeader from '../../../shared/ui/ScreenHeader';
import { SkeletonCardList } from '../../../shared/ui/SkeletonShimmer';
import { ROUTES } from '../../../app/navigation/routes';
import type { ProfileNavigation } from '../../../app/navigation/types';
import { useI18n } from '../../../shared/i18n';
import FloatingActionButton from '../../../shared/ui/FloatingActionButton';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import BusinessCard from '../components/BusinessCard';

const MyBusinessesScreen: React.FC<{ navigation: ProfileNavigation }> = ({ navigation }) => {
  const { t } = useI18n();
  const theme = useAppTheme();
  const { colors } = theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const queryClient = useQueryClient();
  const { profile } = useContext(AuthContext);
  const { workspace, setBusinessWorkspace } = useContext(WorkspaceContext);
  const [refreshing, setRefreshing] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);

  const { data: businesses = [], isLoading, error, refetch } = useMyBusinesses();
  const errorText = error instanceof Error ? error.message : '';

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  // Pull-to-refresh spinneri faqat foydalanuvchi tortganda (fon refetch'ida emas).
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleOpen = useCallback(
    (business: BusinessDTO) =>
      setBusinessWorkspace({ id: business.id, name: business.name, role: business.currentRole }),
    [setBusinessWorkspace]
  );

  const handleMembers = useCallback(
    (business: BusinessDTO) =>
      navigation.navigate(ROUTES.BUSINESS_MEMBERS, {
        businessId: business.id,
        businessName: business.name,
      }),
    [navigation]
  );

  const activeBusinessId = workspace.mode === 'business' ? workspace.activeBusinessId : undefined;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ScreenHeader title={t('business.myBusinesses')} onBack={navigation.goBack} />
        <WorkspaceSwitcher />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {isLoading ? (
          <SkeletonCardList count={3} />
        ) : businesses.length === 0 ? (
          <Text style={styles.empty}>{t('workspace.noBusiness')}</Text>
        ) : (
          businesses.map((business) => (
            <BusinessCard
              key={business.id}
              business={business}
              isActive={activeBusinessId === business.id}
              onOpen={handleOpen}
              onMembers={handleMembers}
            />
          ))
        )}
        {errorText ? <Text style={styles.error}>{errorText}</Text> : null}
      </ScrollView>

      <FloatingActionButton
        onPress={() => setCreateModalVisible(true)}
        accessibilityLabel={t('business.myBusinesses')}
      />

      <CreateBusinessModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onCreated={(created) => {
          setBusinessWorkspace({ id: created.id, name: created.name, role: created.currentRole });
          queryClient.invalidateQueries({ queryKey: myBusinessesQueryKey(profile?.id) });
        }}
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
    header: {
      backgroundColor: colors.background,
    },
    scroll: {
      flex: 1,
    },
    content: {
      padding: spacing.md,
      paddingBottom: 96,
    },
    empty: {
      ...typography.body,
      textAlign: 'center',
      color: colors.textSecondary,
      marginTop: spacing.md,
    },
    error: {
      ...typography.caption,
      marginTop: spacing.xs,
      color: colors.danger,
    },
  });

export default MyBusinessesScreen;
