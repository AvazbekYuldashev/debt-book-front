import React, { useCallback, useContext, useState } from 'react';
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

const MyBusinessesScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
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
      setError(e instanceof Error ? e.message : 'Businesslar yuklanmadi');
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
          <Text style={styles.title}>My Businesses</Text>
          <TouchableOpacity style={styles.createBtn} onPress={() => setCreateModalVisible(true)}>
            <Text style={styles.createBtnText}>Create</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator />
          </View>
        ) : businesses.length === 0 ? (
          <Text style={styles.empty}>Business topilmadi</Text>
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
                <Text style={styles.metaText}>{business.address || 'Address yo‘q'}</Text>
                <Text style={styles.metaText}>Owner: {business.ownerName || '--'}</Text>
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
                    <Text style={styles.openBtnText}>{isActive ? 'Opened' : 'Open'}</Text>
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
                    <Text style={styles.membersBtnText}>Members</Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
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
    color: '#111827',
    fontWeight: '700',
  },
  createBtn: {
    minHeight: 34,
    borderRadius: 8,
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createBtnText: {
    color: '#FFFFFF',
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
    color: '#6B7280',
    marginTop: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  cardActive: {
    borderColor: '#93C5FD',
    backgroundColor: '#EFF6FF',
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
    color: '#111827',
    flex: 1,
  },
  roleBadge: {
    backgroundColor: '#DBEAFE',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  roleText: {
    color: '#1D4ED8',
    fontSize: 10,
    fontWeight: '700',
  },
  metaText: {
    marginTop: 4,
    fontSize: 12,
    color: '#6B7280',
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
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  openBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  membersBtn: {
    flex: 1,
    minHeight: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  membersBtnText: {
    color: '#111827',
    fontSize: 12,
    fontWeight: '700',
  },
  error: {
    marginTop: 6,
    color: '#DC2626',
    fontSize: 12,
  },
});

export default MyBusinessesScreen;
