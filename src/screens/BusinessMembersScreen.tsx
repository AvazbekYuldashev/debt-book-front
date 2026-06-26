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
import { Ionicons } from '@expo/vector-icons';
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
import { normalizePhone, sanitizeLocalPhone, LOCAL_PHONE_DIGITS } from '../utils/phone';
import { canManageMembers, isBusinessOwner } from '../utils/permissions';
import { confirmAction } from '../utils/confirm';
import { useI18n } from '../i18n';
import { useAppTheme } from '../theme';
import { ColorTokens } from '../theme/colors';

const BusinessMembersScreen: React.FC<{ route: any }> = ({ route }) => {
  const { t } = useI18n();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
  const phoneValid = phone.length === LOCAL_PHONE_DIGITS;

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
      setError(e instanceof Error ? e.message : t('members.loadFailed'));
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
        setError(e instanceof Error ? e.message : t('members.roleChangeFailed'));
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
      const label = member.profileName || member.phoneNumber || t('members.thisMember');
      confirmAction(t('members.removeConfirm', { name: label }), async () => {
        setBusyMemberId(member.profileId);
        setError('');
        try {
          await removeBusinessMember(businessId, member.profileId, profile.jwt);
          await loadMembers(false);
        } catch (e) {
          setError(e instanceof Error ? e.message : t('members.removeFailed'));
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
      setFormError(t('business.noToken'));
      return;
    }
    if (!businessId) {
      setFormError(t('members.noBusiness'));
      return;
    }
    if (!phoneValid) {
      setFormError(t('members.phone9'));
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
        setFormError(e instanceof Error ? e.message : t('members.addFailed'));
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
            <Text style={styles.title}>{t('members.title')}</Text>
            <Text style={styles.subtitle}>{businessName}</Text>
          </View>
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

      {canManageMembers(workspace.activeBusinessRole) ? (
        <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)} disabled={!canLoad} activeOpacity={0.85}>
          <Ionicons name="add" size={30} color="#fff" />
        </TouchableOpacity>
      ) : null}

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={closeModal}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('members.add')}</Text>

            <Text style={styles.fieldLabel}>{t('members.phone')}</Text>
            <View style={styles.phoneInputRow}>
              <Text style={styles.phonePrefix}>+998</Text>
              <TextInput
                style={styles.phoneInput}
                placeholder="90 123 45 67"
                placeholderTextColor={colors.textSecondary}
                value={phone}
                onChangeText={onPhoneChange}
                keyboardType="number-pad"
                editable={!saving}
              />
            </View>

            <Text style={styles.roleLabel}>{t('members.role')}</Text>
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
              <PrimaryButton title={t('common.cancel')} variant="secondary" onPress={closeModal} style={styles.actionBtn} />
              <PrimaryButton
                title={t('common.save')}
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

const createStyles = (colors: ColorTokens) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    color: colors.textPrimary,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    color: colors.textSecondary,
  },
  fab: {
    position: 'absolute',
    right: 18,
    bottom: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  error: {
    color: colors.danger,
    fontSize: 12,
    marginBottom: 8,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 10,
  },
  fieldLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  phoneInputRow: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.outline,
    marginBottom: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  phonePrefix: {
    fontSize: 14,
    color: colors.textSecondary,
    marginRight: 8,
    fontWeight: '600',
  },
  phoneInput: {
    flex: 1,
    paddingVertical: 10,
    color: colors.textPrimary,
    fontSize: 14,
  },
  roleLabel: {
    fontSize: 12,
    color: colors.textSecondary,
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
    borderColor: colors.outline,
    borderRadius: 8,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  roleBtnText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  roleBtnTextActive: {
    color: colors.primaryPressed,
  },
  formError: {
    color: colors.danger,
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
