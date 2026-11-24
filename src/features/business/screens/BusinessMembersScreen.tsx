import React, { useCallback, useContext, useMemo, useState } from 'react';
import { useIsRestoring, useQueryClient } from '@tanstack/react-query';
import AmbientBackground from '../../../shared/ui/AmbientBackground';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
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
import StatusBanner from '../../../shared/ui/StatusBanner';
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

  const queryClient = useQueryClient();
  const isRestoring = useIsRestoring();

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
      /*
       * KESH DISKDAN TIKLANMAGUNCHA kutamiz.
       *
       * Tiklash asinxron: ilova ochilgan zahoti kesh hali bo'sh
       * bo'ladi. Shu paytda o'qilsa "keshda hech narsa yo'q" degan
       * xulosa chiqar va oflaynda ekran bo'sh qolib, ustiga xato
       * yozilardi — aynan ma'lumot qurilmada YOTGAN holda. Tiklash
       * tugagach bu funksiya o'zi qayta chaqiriladi.
       */
      if (isRestoring) {
        if (showSpinner) setLoading(true);
        return;
      }

      if (!profile?.jwt || !businessId) {
        setMembers([]);
        return;
      }
      // A'zolar ro'yxati ham keshdan chiqadi: kim qanday huquqda
      // ekanini bilish tarmoqsiz paytda ham kerak bo'ladi.
      const cacheKey = ['business-members', businessId];
      const cached = queryClient.getQueryData<BusinessProfileDTO[]>(cacheKey);
      if (cached) setMembers(cached);

      if (showSpinner && !cached) setLoading(true);
      setError('');
      try {
        const result = await getBusinessMembers(businessId, profile.jwt);
        setMembers(result);
        queryClient.setQueryData(cacheKey, result);
      } catch (e) {
        if (!cached) setError(e instanceof Error ? e.message : t('members.loadFailed'));
      } finally {
        if (showSpinner) setLoading(false);
      }
    },
    [businessId, isRestoring, profile?.jwt, queryClient, t]
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
      {/* Dekorativ fon — barcha ekranlarda bir xil "imzo" qatlami. */}
      <AmbientBackground />
      <View style={styles.header}>
        <ScreenHeader title={t('members.title')} subtitle={businessName} onBack={navigation.goBack} />
        <WorkspaceSwitcher />
        {/* Xato fonda emas, o'z sirtida: to'q fon rasmida ham o'qiladi. */}
        {error ? <StatusBanner tone="error" message={error} /> : null}
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

const createStyles = ({ spacing }: ThemeValue) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    header: {
      backgroundColor: 'transparent',
    },
    scroll: {
      flex: 1,
    },
    content: {
      padding: spacing.md,
      paddingBottom: 96,
    },
  });

export default BusinessMembersScreen;
