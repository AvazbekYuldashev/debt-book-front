import React, { useCallback, useContext, useMemo, useState } from 'react';
import {
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AppTextInput from '../components/form/AppTextInput';
import PrimaryButton from '../components/ui/PrimaryButton';
import BusinessMembersTable from '../components/business/BusinessMembersTable';
import WorkspaceSwitcher from '../components/business/WorkspaceSwitcher';
import { AuthContext } from '../context/AuthContext';
import { WorkspaceContext } from '../context/WorkspaceContext';
import { addBusinessMember, getBusinessMembers } from '../services/businessService';
import { BusinessProfileDTO } from '../types/business';

type MemberRole = 'ADMIN' | 'MEMBER';

const BusinessMembersScreen: React.FC<{ route: any }> = ({ route }) => {
  const { profile } = useContext(AuthContext);
  const { workspace } = useContext(WorkspaceContext);
  const routeBusinessId = String(route.params?.businessId || '');
  const routeBusinessName = String(route.params?.businessName || '');
  const businessId = routeBusinessId || workspace.activeBusinessId || '';
  const businessName = routeBusinessName || workspace.activeBusinessName || 'Business';
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [members, setMembers] = useState<BusinessProfileDTO[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [profileId, setProfileId] = useState('');
  const [role, setRole] = useState<MemberRole>('MEMBER');
  const [saving, setSaving] = useState(false);

  const canLoad = useMemo(() => Boolean(profile?.jwt && businessId), [profile?.jwt, businessId]);

  const loadMembers = useCallback(async (showSpinner = true) => {
    if (!profile?.jwt || !businessId) {
      setMembers([]);
      return;
    }
    if (showSpinner) setLoading(true);
    setError('');
    try {
      const result = await getBusinessMembers(businessId, profile.jwt);
      setMembers(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Members yuklanmadi');
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, [businessId, profile?.jwt]);

  useFocusEffect(
    useCallback(() => {
      loadMembers(true);
    }, [loadMembers])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadMembers(false);
    setRefreshing(false);
  }, [loadMembers]);

  const closeModal = () => {
    if (saving) return;
    setModalVisible(false);
    setProfileId('');
    setRole('MEMBER');
  };

  const submitMember = async () => {
    if (!profile?.jwt) {
      setError('Token topilmadi. Qayta login qiling.');
      return;
    }
    if (!businessId) {
      setError('Business tanlanmagan.');
      return;
    }
    if (!profileId.trim()) {
      setError('Profile ID kiriting.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await addBusinessMember(
        { businessId, profileId: profileId.trim(), role },
        profile.jwt
      );
      closeModal();
      await loadMembers(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Member qo'shib bo‘lmadi");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <WorkspaceSwitcher />
        <View style={styles.headerRow}>
          <View style={styles.titleWrap}>
            <Text style={styles.title}>Business Members</Text>
            <Text style={styles.subtitle}>{businessName}</Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)} disabled={!canLoad}>
            <Text style={styles.addBtnText}>Add member</Text>
          </TouchableOpacity>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <BusinessMembersTable members={members} loading={loading} />
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={closeModal}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Member</Text>
            <AppTextInput
              label="Profile ID"
              value={profileId}
              onChangeText={setProfileId}
              placeholder="uuid"
              containerStyle={styles.field}
            />
            <Text style={styles.roleLabel}>Role</Text>
            <View style={styles.roleRow}>
              <TouchableOpacity
                style={[styles.roleBtn, role === 'ADMIN' ? styles.roleBtnActive : null]}
                onPress={() => setRole('ADMIN')}
              >
                <Text style={[styles.roleBtnText, role === 'ADMIN' ? styles.roleBtnTextActive : null]}>ADMIN</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.roleBtn, role === 'MEMBER' ? styles.roleBtnActive : null]}
                onPress={() => setRole('MEMBER')}
              >
                <Text style={[styles.roleBtnText, role === 'MEMBER' ? styles.roleBtnTextActive : null]}>MEMBER</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalActions}>
              <PrimaryButton title="Cancel" variant="secondary" onPress={closeModal} style={styles.actionBtn} />
              <PrimaryButton title="Save" onPress={submitMember} loading={saving} style={styles.actionBtn} />
            </View>
          </View>
        </View>
      </Modal>
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
    paddingBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  titleWrap: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    color: '#6B7280',
  },
  addBtn: {
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  error: {
    color: '#DC2626',
    fontSize: 12,
    marginBottom: 8,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 10,
  },
  field: {
    marginBottom: 8,
  },
  roleLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 6,
  },
  roleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  roleBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleBtnActive: {
    borderColor: '#93C5FD',
    backgroundColor: '#EFF6FF',
  },
  roleBtnText: {
    color: '#374151',
    fontSize: 12,
    fontWeight: '700',
  },
  roleBtnTextActive: {
    color: '#1D4ED8',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
  },
});

export default BusinessMembersScreen;
