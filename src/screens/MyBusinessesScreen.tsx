import React, { useCallback, useContext, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import { WorkspaceContext } from '../context/WorkspaceContext';
import { getMyBusinesses } from '../services/businessService';
import { BusinessDTO } from '../types/business';
import CreateBusinessModal from '../components/business/CreateBusinessModal';
import WorkspaceSwitcher from '../components/business/WorkspaceSwitcher';
import { ROUTES } from '../navigation/routes';
import { useI18n } from '../i18n';
import { useAppTheme } from '../theme';
import { ColorTokens } from '../theme/colors';

const MyBusinessesScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { t } = useI18n();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { profile } = useContext(AuthContext);
  const { workspace, setBusinessWorkspace } = useContext(WorkspaceContext);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [businesses, setBusinesses] = useState<BusinessDTO[]>([]);
  const [createModalVisible, setCreateModalVisible] = useState(false);

  const loadBusinesses = useCallback(async (showSpinner = true) => {
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
  }, [profile?.jwt]);

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

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <WorkspaceSwitcher />
        <View style={styles.headerRow}>
          <Text style={styles.title}>{t('business.myBusinesses')}</Text>
          <TouchableOpacity style={styles.createBtn} onPress={() => setCreateModalVisible(true)}>
            <Text style={styles.createBtnText}>{t('business.createBtn')}</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator />
          </View>
        ) : businesses.length === 0 ? (
          <Text style={styles.empty}>{t('workspace.noBusiness')}</Text>
        ) : (
          businesses.map((business) => {
            const isActive = workspace.mode === 'business' && workspace.activeBusinessId === business.id;
            return (
              <View key={business.id} style={[styles.card, isActive ? styles.cardActive : null]}>
                <View style={styles.cardTop}>
                  <Text style={styles.businessName}>{business.name}</Text>
                  <View style={styles.roleBadge}>
                    <Text style={styles.roleText}>{business.currentRole}</Text>
                  </View>
                </View>
                <Text style={styles.metaText}>{business.address || t('business.noAddress')}</Text>
                <Text style={styles.metaText}>{t('business.ownerLabel')}: {business.ownerName || '--'}</Text>
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.openBtn}
                    onPress={() =>
                      setBusinessWorkspace({
                        id: business.id,
                        name: business.name,
                        role: business.currentRole,
                      })
                    }
                  >
                    <Text style={styles.openBtnText}>{isActive ? t('business.opened') : t('business.open')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.membersBtn}
                    onPress={() =>
                      navigation.navigate(ROUTES.BUSINESS_MEMBERS, {
                        businessId: business.id,
                        businessName: business.name,
                      })
                    }
                  >
                    <Text style={styles.membersBtnText}>{t('business.members')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>

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

const createStyles = (colors: ColorTokens) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 26,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  createBtn: {
    minHeight: 34,
    borderRadius: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createBtnText: {
    color: colors.textOnPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  loadingWrap: {
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    textAlign: 'center',
    color: colors.textSecondary,
    marginTop: 16,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  cardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  businessName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
  },
  roleBadge: {
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  roleText: {
    color: colors.primaryPressed,
    fontSize: 10,
    fontWeight: '700',
  },
  metaText: {
    marginTop: 4,
    fontSize: 12,
    color: colors.textSecondary,
  },
  cardActions: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 8,
  },
  openBtn: {
    flex: 1,
    minHeight: 34,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  openBtnText: {
    color: colors.textOnPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  membersBtn: {
    flex: 1,
    minHeight: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  membersBtnText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  error: {
    marginTop: 6,
    color: colors.danger,
    fontSize: 12,
  },
});

export default MyBusinessesScreen;
