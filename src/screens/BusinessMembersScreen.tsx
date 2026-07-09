import React, { useCallback, useContext, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
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
import { useI18n } from '../i18n';
import { useAppTheme } from '../theme';
import type { ThemeValue } from '../theme/ThemeProvider';
import type { ProfileScreenProps } from '../navigation/types';
import { ROUTES } from '../navigation/routes';
import AddMemberModal, { AddMemberResult } from './businesses/AddMemberModal';

type Props = ProfileScreenProps<typeof ROUTES.BUSINESS_MEMBERS>;

const BusinessMembersScreen: React.FC<Props> = ({ route }) => {
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
        <WorkspaceSwitcher />
        <View style={styles.headerRow}>
          <View style={styles.titleWrap}>
            <Text style={styles.title}>{t('members.title')}</Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {businessName}
            </Text>
          </View>
        </View>
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
        <Pressable
          style={({ pressed }) => [styles.fab, pressed && styles.fabPressed, !canLoad && styles.fabDisabled]}
          onPress={() => setModalVisible(true)}
          disabled={!canLoad}
          accessibilityRole="button"
          accessibilityLabel={t('members.add')}
        >
          <Ionicons name="add" size={30} color={colors.textOnPrimary} />
        </Pressable>
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
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.xs,
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
    },
    titleWrap: {
      flex: 1,
    },
    title: {
      ...typography.heading2,
      fontSize: 22,
      color: colors.textPrimary,
    },
    subtitle: {
      ...typography.caption,
      marginTop: spacing.xxs / 2,
      color: colors.textSecondary,
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
    fabDisabled: {
      opacity: 0.5,
    },
  });

export default BusinessMembersScreen;
