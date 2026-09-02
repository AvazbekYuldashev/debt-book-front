import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import Card from '../../../shared/ui/Card';
import Button from '../../../shared/ui/Button';
import WorkspaceSwitcher from '../../business/components/WorkspaceSwitcher';
import { useI18n } from '../../../shared/i18n';
import { confirmAction } from '../../../shared/lib/confirm';
import { AuthContext } from '../../auth/context/AuthContext';
import { WorkspaceContext } from '../../business/context/WorkspaceContext';
import { deleteProfile, getMyProfile, updateProfilePhoto } from '../api/profile';
import { updateBusinessPhoto } from '../../business/services/businessService';
import { useMyBusinesses, myBusinessesQueryKey } from '../../business/hooks/useMyBusinesses';
import { useUserStats } from '../hooks/useUserStats';
import { useProfileAction } from '../hooks/useProfileAction';
import { BusinessDTO } from '../../business/types/business';
import { ROUTES } from '../../../app/navigation/routes';
import type { ProfileNavigation } from '../../../app/navigation/types';
import LegalMenuRow from '../components/LegalMenuRow';
import ProfileAvatar from '../components/ProfileAvatar';
import ProfilePhotoModal from '../components/ProfilePhotoModal';
import { pickAndUploadImage } from '../lib/pickImage';
import { buildAttachUrl, normalizeAttachUrl } from '../../../shared/lib/attachUrl';

/**
 * Profil bosh ekrani.
 *
 * Ataylab qisqa: avatar, ikki son, uchta amal va bizneslar ro'yxati.
 * Ma'lumot tahriri va sozlamalar alohida ekranlarga chiqarilgan — ilgari
 * hammasi bitta ekranda edi va kerakli joyni topish qiyin edi.
 */
const ProfileScreen: React.FC<{ navigation: ProfileNavigation }> = ({ navigation }) => {
  const theme = useAppTheme();
  const { colors } = theme;
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const { profile, setProfile } = useContext(AuthContext);
  const { workspace } = useContext(WorkspaceContext);
  const queryClient = useQueryClient();
  const { loadingKey, status, statusError, run } = useProfileAction();

  const isBusiness = workspace.mode === 'business';
  const token = profile?.jwt;

  const { data: businesses } = useMyBusinesses(isBusiness);
  const { data: userStats } = useUserStats();
  const activeBusiness = useMemo(
    () => (isBusiness ? businesses?.find((b) => b.id === workspace.activeBusinessId) ?? null : null),
    [isBusiness, businesses, workspace.activeBusinessId]
  );

  const [photoPreview, setPhotoPreview] = useState('');
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [photoModalError, setPhotoModalError] = useState('');

  const photoUri =
    normalizeAttachUrl(photoPreview) ||
    normalizeAttachUrl(profile?.photo?.url) ||
    buildAttachUrl(profile?.photo?.id);

  useEffect(() => {
    if (profile?.photo?.url) {
      setPhotoPreview(normalizeAttachUrl(profile.photo.url));
      return;
    }
    if (profile?.photo?.id) {
      setPhotoPreview(buildAttachUrl(profile.photo.id));
    }
  }, [profile?.photo?.id, profile?.photo?.url]);

  // Serverdagi eng so'nggi profil — rasm boshqa qurilmadan almashgan bo'lishi mumkin.
  useEffect(() => {
    const load = async () => {
      if (!token) return;
      try {
        const fresh = (await getMyProfile(token)) as Record<string, unknown>;
        setProfile((prev) => {
          if (!prev) return prev;
          const nested = (fresh.photo as Record<string, unknown> | undefined) || undefined;
          const photoId =
            (typeof nested?.id === 'string' ? nested.id : undefined) ||
            (typeof fresh.photoId === 'string' ? fresh.photoId : undefined) ||
            prev.photo?.id;
          const photoUrl =
            normalizeAttachUrl(typeof nested?.url === 'string' ? nested.url : undefined) ||
            prev.photo?.url ||
            buildAttachUrl(photoId);
          return {
            ...prev,
            ...fresh,
            photo: photoId || photoUrl ? { id: photoId, url: photoUrl } : prev.photo,
          };
        });
      } catch {
        // Jim o'tkazamiz — ekran mavjud ma'lumot bilan ishlayveradi.
      }
    };
    load();
  }, [token, setProfile]);

  const changePhoto = () =>
    run('photo', async () => {
      if (!token) throw new Error(t('profile.noToken'));
      const picked = await pickAndUploadImage(token);
      if (picked.status === 'canceled') return;
      if (picked.status === 'denied') throw new Error(t('profile.galleryDenied'));
      if (picked.status === 'error') throw new Error(t('profile.photoIdMissing'));

      if (isBusiness && workspace.activeBusinessId) {
        const businessId = workspace.activeBusinessId;
        const updated = await updateBusinessPhoto(businessId, picked.id, token);
        queryClient.setQueryData<BusinessDTO[]>(myBusinessesQueryKey(profile?.id), (prev) =>
          prev?.map((b) => (b.id === businessId ? { ...b, photoId: updated.photoId } : b))
        );
        return;
      }

      await updateProfilePhoto({ photoId: picked.id }, token);
      // ID asosidagi URL eng ishonchli — har doim ochiladi.
      const resolved = buildAttachUrl(picked.id) || normalizeAttachUrl(picked.url);
      setPhotoPreview(resolved);
      setProfile((prev) => (prev ? { ...prev, photo: { id: picked.id, url: resolved } } : prev));
    });

  const handleLogout = () =>
    confirmAction(t('profile.logoutConfirm'), () => setProfile(null), {
      title: t('profile.logout'),
      confirmLabel: t('profile.logout'),
      cancelLabel: t('common.cancel'),
    });

  const handleDelete = () =>
    confirmAction(
      t('profile.deleteConfirm'),
      () =>
        run('delete', async () => {
          if (!token || !profile?.id) throw new Error(t('profile.noToken'));
          await deleteProfile(profile.id, token);
          setProfile(null);
        }),
      {
        title: t('profile.deleteProfile'),
        confirmLabel: t('common.delete'),
        cancelLabel: t('common.cancel'),
      }
    );

  const renderAction = (
    label: string,
    iconName: keyof typeof Ionicons.glyphMap,
    onPress: () => void,
    busy?: boolean
  ) => (
    <Pressable
      onPress={onPress}
      disabled={busy}
      style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name={iconName} size={20} color={colors.primary} />
      <Text style={styles.actionText} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      {/* Boshqa bosh ekranlardagi kabi: chetdan chetga, kontent paddingidan tashqarida. */}
      <View style={styles.header}>
        <WorkspaceSwitcher />
        <View style={styles.headerRow}>
          <Text style={styles.title}>{t('profile.title')}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Avatar o'rtada, ikki yonida umumiy sonlar:
            chapda — ro'yxatdan to'liq o'tganlar, o'ngda — raqami kiritilgan-u
            hali ro'yxatdan o'tmaganlar. */}
        <View style={styles.headRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{userStats?.registeredUsers ?? '—'}</Text>
            <Text style={styles.statLabel}>{t('stats.registered')}</Text>
          </View>

          <ProfileAvatar
            isBusiness={isBusiness}
            activeBusiness={activeBusiness}
            personalPhotoUri={photoUri}
            editing={loadingKey === 'photo'}
            canEdit={false}
            onEditPhoto={changePhoto}
            onPreview={() => {
              if (!photoUri) return;
              setPhotoModalError('');
              setPhotoModalVisible(true);
            }}
          />

          <View style={styles.stat}>
            <Text style={styles.statValue}>{userStats?.pendingUsers ?? '—'}</Text>
            <Text style={styles.statLabel}>{t('stats.pending')}</Text>
          </View>
        </View>

        {profile ? (
          <Text style={styles.fullName}>
            {[profile.name, profile.surname].filter(Boolean).join(' ') || profile.username}
          </Text>
        ) : (
          <Text style={styles.fullName}>{t('profile.notLoggedIn')}</Text>
        )}

        {status ? (
          <Text style={[styles.status, statusError && styles.statusError]}>{status}</Text>
        ) : null}

        <View style={styles.actionsRow}>
          {renderAction(t('profile.changePhoto'), 'image-outline', changePhoto, loadingKey === 'photo')}
          {renderAction(t('profile.editInfo'), 'create-outline', () =>
            navigation.navigate(ROUTES.PROFILE_EDIT)
          )}
          {renderAction(t('profile.settings'), 'settings-outline', () =>
            navigation.navigate(ROUTES.PROFILE_SETTINGS)
          )}
        </View>

        <Card style={styles.card}>
          <Pressable
            onPress={() => navigation.navigate(ROUTES.MY_BUSINESSES)}
            style={({ pressed }) => [styles.manageRow, pressed && styles.actionPressed]}
            accessibilityRole="button"
            accessibilityLabel={t('profile.manageBusinesses')}
          >
            <Text style={styles.manageText}>{t('profile.manageBusinesses')}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </Pressable>

          {(businesses ?? []).map((business) => (
            <Pressable
              key={business.id}
              onPress={() =>
                navigation.navigate(ROUTES.BUSINESS_MEMBERS, { businessId: business.id })
              }
              style={({ pressed }) => [styles.businessRow, pressed && styles.actionPressed]}
              accessibilityRole="button"
              accessibilityLabel={business.name}
            >
              <Ionicons name="briefcase-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.businessText} numberOfLines={1}>
                {business.name}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </Pressable>
          ))}
        </Card>

        <View style={styles.bottomRow}>
          <View style={styles.bottomCell}>
            <Button title={t('profile.logout')} variant="outline" onPress={handleLogout} />
          </View>
          <View style={styles.bottomCell}>
            <Button
              title={t('profile.deleteProfile')}
              variant="secondary"
              onPress={handleDelete}
              loading={loadingKey === 'delete'}
            />
          </View>
        </View>

        {/* Eng pastda: kundalik ish emas, kamdan-kam ochiladi. */}
        <Card style={styles.card}>
          <LegalMenuRow
            label={t('about.title')}
            iconName="information-circle-outline"
            isLast
            onPress={() => navigation.navigate(ROUTES.ABOUT_APP)}
          />
        </Card>
      </ScrollView>

      <ProfilePhotoModal
        visible={photoModalVisible}
        photoUri={photoUri}
        error={photoModalError}
        onClose={() => setPhotoModalVisible(false)}
        onImageError={() => setPhotoModalError(t('profile.imageLoadFailed'))}
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
      marginBottom: spacing.md,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
    },
    title: {
      ...typography.heading2,
      color: colors.textPrimary,
    },
    content: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.xxl,
      gap: spacing.sm,
    },
    headRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    stat: {
      flex: 1,
      minWidth: 0,
      alignItems: 'center',
      gap: 2,
    },
    statValue: {
      ...typography.heading2,
      fontSize: 20,
      color: colors.textPrimary,
      fontVariant: ['tabular-nums'],
    },
    statLabel: {
      ...typography.caption,
      fontSize: 10,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    fullName: {
      ...typography.heading2,
      color: colors.textPrimary,
      textAlign: 'center',
      marginTop: spacing.xs,
    },
    status: {
      ...typography.caption,
      color: colors.success,
      textAlign: 'center',
    },
    statusError: {
      color: colors.danger,
    },
    actionsRow: {
      flexDirection: 'row',
      gap: spacing.xs,
    },
    action: {
      flex: 1,
      alignItems: 'center',
      gap: spacing.xxs,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.xs,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.outline,
      backgroundColor: colors.surface,
    },
    actionPressed: {
      opacity: 0.6,
    },
    actionText: {
      ...typography.caption,
      fontSize: 11,
      fontWeight: '700',
      color: colors.primary,
      textAlign: 'center',
    },
    card: {
      gap: spacing.xxs,
    },
    manageRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.xs,
    },
    manageText: {
      ...typography.body,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    businessRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    businessText: {
      ...typography.caption,
      fontSize: 13,
      color: colors.textPrimary,
      flex: 1,
      minWidth: 0,
    },
    bottomRow: {
      flexDirection: 'row',
      gap: spacing.xs,
      marginTop: spacing.sm,
    },
    bottomCell: {
      flex: 1,
    },
  });

export default ProfileScreen;
