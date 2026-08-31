import React, { useCallback, useContext, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import BusinessMembersTable from '../components/BusinessMembersTable';
import WorkspaceSwitcher from '../components/WorkspaceSwitcher';
import ScreenHeader from '../../../shared/ui/ScreenHeader';
import { AuthContext } from '../../auth/context/AuthContext';
import { WorkspaceContext } from '../context/WorkspaceContext';
import {
  AddBusinessMemberError,
  addBusinessMember,
  getBusinessMembers,
  removeBusinessMember,
  updateBusinessMemberRole,
} from '../services/businessService';
import { BusinessMemberRole, BusinessProfileDTO } from '../types/business';
import { normalizePhone } from '../../../shared/lib/phone';
import { canManageMembers, isBusinessOwner } from '../../../shared/lib/permissions';
import { confirmAction } from '../../../shared/lib/confirm';
import { useI18n } from '../../../shared/i18n';
import FloatingActionButton from '../../../shared/ui/FloatingActionButton';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import type { ProfileScreenProps } from '../../../app/navigation/types';
import { ROUTES } from '../../../app/navigation/routes';
import AddMemberModal, { AddMemberResult } from '../components/AddMemberModal';

type Props = ProfileScreenProps<typeof ROUTES.BUSINESS_MEMBERS>;

const BusinessMembersScreen: React.FC<Props> = ({ route, navigation }) => {
  const { t } = useI18n();
  const theme = useAppTheme();
  const { colors } = theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { profile } = useContext(AuthContext);
  const { workspace } = useContext(WorkspaceContext);

  const businessId = route.params?.businessId || workspace.activeBusinessId || '';
  const businessName = route.params?.businessName || workspace.activeBusinessName || 'Business';

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [members, setMembers] = useState<BusinessProfileDTO[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyMemberId, setBusyMemberId] = useState('');

  const canLoad = useMemo(() => Boolean(profile?.jwt && businessId), [profile?.jwt, businessId]);

  const loadMembers = useCallback(
    async (showSpinner = true) => {
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
    },
    [businessId, profile?.jwt, t]
  );

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

  // Faqat OWNER: a'zoning rolini o'zgartirish (ADMIN <-> MEMBER).
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
    [businessId, profile?.jwt, loadMembers, t]
  );

  // Faqat OWNER: a'zoni biznesdan o'chirish.
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
    [businessId, profile?.jwt, loadMembers, t]
  );

  const submitMember = useCallback(
    async (phone: string, role: BusinessMemberRole): Promise<AddMemberResult> => {
      if (!profile?.jwt) return { ok: false, message: t('business.noToken') };
      if (!businessId) return { ok: false, message: t('members.noBusiness') };

      setSaving(true);
      setError('');
      try {
        await addBusinessMember({ businessId, phoneNumber: normalizePhone(phone), role }, profile.jwt);
        await loadMembers(false);
        return { ok: true };
      } catch (e) {
        if (e instanceof AddBusinessMemberError) {
          return {
            ok: false,
            message: e.message,
            blocked:
              e.code === 'PHONE_NOT_REGISTERED' ||
              e.code === 'PHONE_NOT_VERIFIED' ||
              e.code === 'ALREADY_MEMBER',
          };
        }
        return { ok: false, message: e instanceof Error ? e.message : t('members.addFailed') };
      } finally {
        setSaving(false);
      }
    },
    [profile?.jwt, businessId, loadMembers, t]
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ScreenHeader title={t('members.title')} subtitle={businessName} onBack={navigation.goBack} />
        <WorkspaceSwitcher />
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
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
        <FloatingActionButton
          onPress={() => setModalVisible(true)}
          disabled={!canLoad}
          accessibilityLabel={t('members.add')}
        />
      ) : null}

      <AddMemberModal
        visible={modalVisible}
        saving={saving}
        onClose={() => setModalVisible(false)}
        onSubmit={submitMember}
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
    error: {
      ...typography.caption,
      color: colors.danger,
      marginBottom: spacing.xs,
      paddingHorizontal: spacing.md,
    },
  });

export default BusinessMembersScreen;
