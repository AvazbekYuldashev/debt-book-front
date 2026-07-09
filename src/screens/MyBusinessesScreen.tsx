import React, { useCallback, useContext, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import { WorkspaceContext } from '../context/WorkspaceContext';
import { getMyBusinesses } from '../services/businessService';
import { BusinessDTO } from '../types/business';
import CreateBusinessModal from '../components/business/CreateBusinessModal';
import WorkspaceSwitcher from '../components/business/WorkspaceSwitcher';
import { ROUTES } from '../navigation/routes';
import type { ProfileNavigation } from '../navigation/types';
import { useI18n } from '../i18n';
import { useAppTheme } from '../theme';
import type { ThemeValue } from '../theme/ThemeProvider';
import BusinessCard from './businesses/BusinessCard';

const MyBusinessesScreen: React.FC<{ navigation: ProfileNavigation }> = ({ navigation }) => {
  const { t } = useI18n();
  const theme = useAppTheme();
  const { colors } = theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { profile } = useContext(AuthContext);
  const { workspace, setBusinessWorkspace } = useContext(WorkspaceContext);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [businesses, setBusinesses] = useState<BusinessDTO[]>([]);
  const [createModalVisible, setCreateModalVisible] = useState(false);

  const loadBusinesses = useCallback(
    async (showSpinner = true) => {
      if (!profile?.jwt) {
        setBusinesses([]);
        return;
      }
      if (showSpinner) setLoading(true);
      setError('');
      try {
        const response = await getMyBusinesses(profile.jwt);
        setBusinesses(response);
      } catch (e) {
        setError(e instanceof Error ? e.message : t('workspace.loadFailed'));
      } finally {
        if (showSpinner) setLoading(false);
      }
    },
    [profile?.jwt, t]
  );

  useFocusEffect(
    useCallback(() => {
      loadBusinesses(true);
    }, [loadBusinesses])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadBusinesses(false);
    setRefreshing(false);
  }, [loadBusinesses]);

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
        <WorkspaceSwitcher />
        <View style={styles.headerRow}>
          <Text style={styles.title}>{t('business.myBusinesses')}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={colors.primary} />
          </View>
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
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>

      <Pressable
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        onPress={() => setCreateModalVisible(true)}
        accessibilityRole="button"
        accessibilityLabel={t('business.myBusinesses')}
      >
        <Ionicons name="add" size={30} color={colors.textOnPrimary} />
      </Pressable>

      <CreateBusinessModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onCreated={(created) => {
          setBusinessWorkspace({ id: created.id, name: created.name, role: created.currentRole });
          loadBusinesses(false);
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
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
    },
    title: {
      ...typography.heading2,
      color: colors.textPrimary,
    },
    scroll: {
      flex: 1,
    },
    content: {
      padding: spacing.md,
      paddingBottom: 96,
    },
    loadingWrap: {
      minHeight: 120,
      alignItems: 'center',
      justifyContent: 'center',
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
    fab: {
      position: 'absolute',
      right: spacing.md + 2,
      bottom: spacing.lg,
      width: 60,
      height: 60,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 6,
    },
    fabPressed: {
      opacity: 0.9,
      transform: [{ scale: 0.96 }],
    },
  });

export default MyBusinessesScreen;
