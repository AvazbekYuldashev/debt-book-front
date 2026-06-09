import React, { useCallback, useContext, useMemo, useState } from 'react';
import {
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import PrimaryButton from '../components/ui/PrimaryButton';
import BusinessMembersTable from '../components/business/BusinessMembersTable';
import WorkspaceSwitcher from '../components/business/WorkspaceSwitcher';
import { AuthContext } from '../context/AuthContext';
import { WorkspaceContext } from '../context/WorkspaceContext';
import {
  AddBusinessMemberError,
  addBusinessMember,
  getBusinessMembers,
  removeBusinessMember,
  updateBusinessMemberRole,
} from '../services/businessService';
import { BusinessMemberRole, BusinessProfileDTO } from '../types/business';
import { normalizePhone } from '../utils/phone';
import { canManageMembers, isBusinessOwner } from '../utils/permissions';
import { confirmAction } from '../utils/confirm';

const PHONE_DIGITS = 9;

const sanitizeLocalPhone = (value: string): string => {
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('998')) digits = digits.slice(3);
  return digits.slice(0, PHONE_DIGITS);
};

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
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<BusinessMemberRole>('MEMBER');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [phoneBlocked, setPhoneBlocked] = useState(false);
  const [busyMemberId, setBusyMemberId] = useState('');

  const canLoad = useMemo(() => Boolean(profile?.jwt && businessId), [profile?.jwt, businessId]);
  const phoneValid = phone.length === PHONE_DIGITS;

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

  // Faqat OWNER: a'zoning rolini o'zgartirish (ADMIN <-> MEMBER)
  const handleToggleRole = useCallback(
    async (member: BusinessProfileDTO, nextRole: BusinessMemberRole) => {
      if (!profile?.jwt || !businessId) return;
      setBusyMemberId(member.profileId);
      setError('');
      try {
        await updateBusinessMemberRole(businessId, member.profileId, nextRole, profile.jwt);
        await loadMembers(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Rolni o'zgartirib bo'lmadi");
      } finally {
        setBusyMemberId('');
      }
    },
    [businessId, profile?.jwt, loadMembers]
  );

  // Faqat OWNER: a'zoni biznesdan o'chirish
  const handleRemoveMember = useCallback(
    (member: BusinessProfileDTO) => {
      if (!profile?.jwt || !businessId) return;
      const label = member.profileName || member.phoneNumber || "Ushbu a'zo";
      confirmAction(`${label} ni biznesdan o'chirasizmi?`, async () => {
        setBusyMemberId(member.profileId);
        setError('');
        try {
          await removeBusinessMember(businessId, member.profileId, profile.jwt);
          await loadMembers(false);
        } catch (e) {
          setError(e instanceof Error ? e.message : "A'zoni o'chirib bo'lmadi");
        } finally {
          setBusyMemberId('');
        }
      });
    },
    [businessId, profile?.jwt, loadMembers]
  );

  const closeModal = () => {
    if (saving) return;
    setModalVisible(false);
    setPhone('');
    setRole('MEMBER');
    setFormError('');
    setPhoneBlocked(false);
  };

  const onPhoneChange = (value: string) => {
    setPhone(sanitizeLocalPhone(value));
    if (phoneBlocked) setPhoneBlocked(false);
    if (formError) setFormError('');
  };

  const submitMember = async () => {
    if (!profile?.jwt) {
      setFormError('Token topilmadi. Qayta login qiling.');
      return;
    }
    if (!businessId) {
      setFormError('Business tanlanmagan.');
      return;
    }
    if (!phoneValid) {
      setFormError("Telefon raqami 9 ta raqamdan iborat bo'lishi kerak");
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      await addBusinessMember(
        { businessId, phoneNumber: normalizePhone(phone), role },
        profile.jwt
      );
      closeModal();
      await loadMembers(false);
    } catch (e) {
      if (e instanceof AddBusinessMemberError) {
        setFormError(e.message);
        setPhoneBlocked(
          e.code === 'PHONE_NOT_REGISTERED' ||
            e.code === 'PHONE_NOT_VERIFIED' ||
            e.code === 'ALREADY_MEMBER'
        );
      } else {
        setFormError(e instanceof Error ? e.message : "A'zo qo'shib bo'lmadi");
      }
    } finally {
      setSaving(false);
    }
  };

  const submitDisabled = saving || !phoneValid || phoneBlocked;

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
          {canManageMembers(workspace.activeBusinessRole) ? (
            <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)} disabled={!canLoad}>
              <Text style={styles.addBtnText}>Add member</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <BusinessMembersTable
          members={members}
          loading={loading}
          canManage={isBusinessOwner(workspace.activeBusinessRole)}
          busyMemberId={busyMemberId}
          onRemove={handleRemoveMember}
          onToggleRole={handleToggleRole}
        />
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={closeModal}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Member</Text>

            <Text style={styles.fieldLabel}>Telefon raqam</Text>
            <View style={styles.phoneInputRow}>
              <Text style={styles.phonePrefix}>+998</Text>
              <TextInput
                style={styles.phoneInput}
                placeholder="90 123 45 67"
                placeholderTextColor="#9CA3AF"
                value={phone}
                onChangeText={onPhoneChange}
                keyboardType="number-pad"
                editable={!saving}
              />
            </View>

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

            {formError ? <Text style={styles.formError}>{formError}</Text> : null}

            <View style={styles.modalActions}>
              <PrimaryButton title="Cancel" variant="secondary" onPress={closeModal} style={styles.actionBtn} />
              <PrimaryButton
                title="Save"
                onPress={submitMember}
                loading={saving}
                disabled={submitDisabled}
                style={styles.actionBtn}
              />
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
  fieldLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 6,
  },
  phoneInputRow: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    marginBottom: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  phonePrefix: {
    fontSize: 14,
    color: '#6B7280',
    marginRight: 8,
    fontWeight: '600',
  },
  phoneInput: {
    flex: 1,
    paddingVertical: 10,
    color: '#111827',
    fontSize: 14,
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
  formError: {
    color: '#DC2626',
    fontSize: 12,
    marginBottom: 10,
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
