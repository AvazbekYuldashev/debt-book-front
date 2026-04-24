import React, { useCallback, useContext, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { AuthContext } from '../../context/AuthContext';
import { WorkspaceContext } from '../../context/WorkspaceContext';
import { getMyBusinesses } from '../../services/businessService';
import { BusinessDTO } from '../../types/business';
import CreateBusinessModal from './CreateBusinessModal';
import { ROUTES } from '../../navigation/routes';

const WorkspaceSwitcher: React.FC = () => {
  const navigation = useNavigation<any>();
  const { profile } = useContext(AuthContext);
  const { workspace, setPersonalWorkspace, setBusinessWorkspace } = useContext(WorkspaceContext);
  const [businesses, setBusinesses] = useState<BusinessDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [visible, setVisible] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);

  const loadBusinesses = useCallback(async () => {
    if (!profile?.jwt) {
      setBusinesses([]);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await getMyBusinesses(profile.jwt);
      setBusinesses(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Businesslar yuklanmadi');
    } finally {
      setLoading(false);
    }
  }, [profile?.jwt]);

  useFocusEffect(
    useCallback(() => {
      loadBusinesses();
    }, [loadBusinesses])
  );

  const openBusiness = (business: BusinessDTO) => {
    setBusinessWorkspace({
      id: business.id,
      name: business.name,
      role: business.currentRole,
    });
    setVisible(false);
  };

  const contextLabel =
    workspace.mode === 'business' && workspace.activeBusinessName
      ? `${workspace.activeBusinessName} workspace`
      : 'Personal Workspace';

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity style={styles.trigger} onPress={() => setVisible(true)}>
        <View style={styles.labelWrap}>
          <Text numberOfLines={1} style={styles.label}>
            {contextLabel}
          </Text>
          {workspace.mode === 'business' && workspace.activeBusinessRole ? (
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>{workspace.activeBusinessRole}</Text>
            </View>
          ) : null}
        </View>
        <Ionicons name="chevron-down-outline" size={18} color="#374151" />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <TouchableOpacity style={styles.backdrop} onPress={() => setVisible(false)} activeOpacity={1}>
          <View style={styles.card}>
            <Text style={styles.title}>Workspace</Text>
            <TouchableOpacity
              style={[
                styles.optionRow,
                workspace.mode === 'personal' ? styles.optionActive : null,
              ]}
              onPress={() => {
                setPersonalWorkspace();
                setVisible(false);
              }}
            >
              <Text style={styles.optionText}>Personal</Text>
              {workspace.mode === 'personal' ? <Ionicons name="checkmark" size={16} color="#2563EB" /> : null}
            </TouchableOpacity>

            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>My businesses</Text>
              <TouchableOpacity
                onPress={() => {
                  setVisible(false);
                  navigation.navigate(ROUTES.PROFILE, { screen: ROUTES.MY_BUSINESSES });
                }}
              >
                <Text style={styles.linkText}>Manage</Text>
              </TouchableOpacity>
            </View>

            {loading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator />
              </View>
            ) : businesses.length === 0 ? (
              <Text style={styles.emptyText}>Business topilmadi</Text>
            ) : (
              businesses.map((business) => {
                const isActive = workspace.mode === 'business' && workspace.activeBusinessId === business.id;
                return (
                  <TouchableOpacity
                    key={business.id}
                    style={[styles.optionRow, isActive ? styles.optionActive : null]}
                    onPress={() => openBusiness(business)}
                  >
                    <View style={styles.businessMeta}>
                      <Text style={styles.optionText}>{business.name}</Text>
                      <Text style={styles.businessSub}>{business.currentRole}</Text>
                    </View>
                    {isActive ? <Ionicons name="checkmark" size={16} color="#2563EB" /> : null}
                  </TouchableOpacity>
                );
              })
            )}
            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity
              style={styles.createBtn}
              onPress={() => {
                setVisible(false);
                setCreateModalVisible(true);
              }}
            >
              <Ionicons name="add-circle-outline" size={16} color="#FFFFFF" />
              <Text style={styles.createBtnText}>Create business</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <CreateBusinessModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onCreated={(created) => {
          setBusinessWorkspace({ id: created.id, name: created.name, role: created.currentRole });
          loadBusinesses();
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 34,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 10,
    backgroundColor: '#F9FAFB',
  },
  labelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    paddingRight: 8,
  },
  label: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '600',
    flexShrink: 1,
  },
  roleBadge: {
    backgroundColor: '#DBEAFE',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.28)',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    maxHeight: '75%',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  sectionRow: {
    marginTop: 10,
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
  linkText: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '600',
  },
  optionRow: {
    minHeight: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 10,
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
  },
  optionActive: {
    borderColor: '#93C5FD',
    backgroundColor: '#EFF6FF',
  },
  optionText: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },
  businessMeta: {
    flexShrink: 1,
  },
  businessSub: {
    marginTop: 2,
    fontSize: 11,
    color: '#6B7280',
  },
  loadingWrap: {
    minHeight: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 13,
    marginBottom: 8,
  },
  error: {
    color: '#DC2626',
    fontSize: 12,
    marginTop: 2,
  },
  createBtn: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 10,
    backgroundColor: '#2563EB',
    minHeight: 40,
  },
  createBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});

export default WorkspaceSwitcher;
