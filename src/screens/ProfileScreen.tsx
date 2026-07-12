import React, { useContext, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useAppTheme } from '../theme';
import type { ThemeValue } from '../theme/ThemeProvider';
import { AuthContext } from '../context/AuthContext';
import { WorkspaceContext } from '../context/WorkspaceContext';
import Card from '../components/atoms/Card';
import Input from '../components/atoms/Input';
import WorkspaceSwitcher from '../components/business/WorkspaceSwitcher';
import LanguageSwitcher from '../components/LanguageSwitcher';
import ThemeSwitcher from '../components/ThemeSwitcher';
import CurrencySwitcher from '../components/CurrencySwitcher';
import { useI18n } from '../i18n';
import { confirmAction } from '../utils/confirm';
import {
  confirmProfileUsername,
  deleteProfile,
  getMyProfile,
  updateProfileDetail,
  updateProfilePassword,
  updateProfilePhoto,
  updateProfileUsername,
} from '../api/profile';
import { updateBusinessPhoto } from '../services/businessService';
import { useMyBusinesses, myBusinessesQueryKey } from '../hooks/useMyBusinesses';
import { useUserStats } from '../hooks/useUserStats';
import { BusinessDTO } from '../types/business';
import { ROUTES } from '../navigation/routes';
import type { ProfileNavigation } from '../navigation/types';
import FieldWithAction from './profile/FieldWithAction';
import ProfileAvatar from './profile/ProfileAvatar';
import ProfilePhotoModal from './profile/ProfilePhotoModal';
import { pickAndUploadImage } from './profile/pickImage';
import { buildAttachUrl, normalizeAttachUrl } from '../shared/attachUrl';

const ProfileScreen: React.FC<{ navigation: ProfileNavigation }> = ({ navigation }) => {
  const { t } = useI18n();
  const theme = useAppTheme();
  const { colors } = theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { profile, setProfile } = useContext(AuthContext);
  const { workspace } = useContext(WorkspaceContext);
  const queryClient = useQueryClient();
  const isBusiness = workspace.mode === 'business';

  // Ilova bo'yicha umumiy foydalanuvchi sonlari (hamma ko'radi).
  const { data: userStats } = useUserStats();

  // Faol biznes umumiy query keshidan hosilaviy — alohida so'rov/holat kerak emas.
  const { data: businesses } = useMyBusinesses(isBusiness);
  const activeBusiness = useMemo(
    () => (isBusiness ? businesses?.find((b) => b.id === workspace.activeBusinessId) ?? null : null),
    [isBusiness, businesses, workspace.activeBusinessId],
  );

  const [name, setName] = useState(profile?.name ?? '');
  const [surname, setSurname] = useState(profile?.surname ?? '');
  const [username, setUsername] = useState(profile?.username ?? '');
  const [pendingUsername, setPendingUsername] = useState('');
  const [confirmCode, setConfirmCode] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [photoPreview, setPhotoPreview] = useState('');
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [photoModalError, setPhotoModalError] = useState('');
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [statusError, setStatusError] = useState(false);

  const confirmLabels = useMemo(() => ({ cancelLabel: t('common.cancel') }), [t]);
  const token = profile?.jwt;
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

  const run = async (key: string, action: () => Promise<void>) => {
    setLoadingKey(key);
    setStatus('');
    try {
      await action();
      setStatusError(false);
      setStatus(t('common.success'));
    } catch (e) {
      setStatusError(true);
      setStatus(e instanceof Error ? e.message : t('profile.genericError'));
    } finally {
      setLoadingKey(null);
    }
  };

  // Muvaffaqiyat statusini avtomatik tozalash (xatolar ko'rinib turaveradi).
  useEffect(() => {
    if (!status || statusError) return;
    const timer = setTimeout(() => setStatus(''), 3000);
    return () => clearTimeout(timer);
  }, [status, statusError]);

  useEffect(() => {
    const loadProfile = async () => {
      if (!token) return;
      try {
        const fresh = await getMyProfile(token);
        setProfile((prev) => {
          if (!prev) return prev;
          const freshData = fresh as Record<string, unknown>;
          const nestedPhoto = (freshData.photo as Record<string, unknown> | undefined) || undefined;
          const photoId =
            (typeof nestedPhoto?.id === 'string' ? nestedPhoto.id : undefined) ||
            (typeof freshData.photoId === 'string' ? freshData.photoId : undefined) ||
            prev.photo?.id;
          const photoUrl =
            normalizeAttachUrl(typeof nestedPhoto?.url === 'string' ? nestedPhoto.url : undefined) ||
            prev.photo?.url ||
            buildAttachUrl(photoId);

          return {
            ...prev,
            ...freshData,
            photo: photoId || photoUrl ? { id: photoId, url: photoUrl } : prev.photo,
          };
        });
      } catch {
        // Ignore silent failures; UI will show existing profile data.
      }
    };
    loadProfile();
  }, [token, setProfile]);

  const handleLogout = () => {
    confirmAction(t('profile.logoutConfirm'), () => setProfile(null), {
      title: t('profile.logout'),
      confirmLabel: t('profile.logout'),
      ...confirmLabels,
    });
  };

  const handleUpdateDetail = () =>
    run('detail', async () => {
      if (!token) throw new Error(t('profile.noToken'));
      await updateProfileDetail({ name: name.trim(), surname: surname.trim() }, token);
      setProfile((prev) => (prev ? { ...prev, name: name.trim(), surname: surname.trim() } : prev));
    });

  const handleUpdateUsername = () =>
    run('username', async () => {
      if (!token) throw new Error(t('profile.noToken'));
      const clean = username.trim();
      if (!clean) throw new Error(t('profile.enterUsername'));
      await updateProfileUsername({ username: clean }, token);
      setPendingUsername(clean);
      setConfirmCode('');
    });

  const handleConfirmUsername = () =>
    run('usernameConfirm', async () => {
      if (!token) throw new Error(t('profile.noToken'));
      const code = confirmCode.trim();
      if (!code) throw new Error(t('profile.enterCode'));
      await confirmProfileUsername({ code }, token);
      if (pendingUsername) {
        setProfile((prev) => (prev ? { ...prev, username: pendingUsername } : prev));
      }
      setPendingUsername('');
      setConfirmCode('');
    });

  const handleUpdatePassword = () =>
    run('password', async () => {
      if (!token) throw new Error(t('profile.noToken'));
      if (!oldPassword.trim() || !newPassword.trim() || !confirmNewPassword.trim()) {
        throw new Error(t('profile.enterPasswords'));
      }
      if (newPassword.trim().length < 8) {
        throw new Error(t('profile.passwordMin'));
      }
      if (newPassword.trim() !== confirmNewPassword.trim()) {
        throw new Error(t('profile.passwordMismatch'));
      }
      await updateProfilePassword({ oldPassword: oldPassword.trim(), newPassword: newPassword.trim() }, token);
      setOldPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    });

  const handlePickPhoto = () =>
    run('photo', async () => {
      if (!token) throw new Error(t('profile.noToken'));
      const picked = await pickAndUploadImage(token);
      if (picked.status === 'canceled') return;
      if (picked.status === 'denied') throw new Error(t('profile.galleryDenied'));
      if (picked.status === 'error') throw new Error(t('profile.photoIdMissing'));

      await updateProfilePhoto({ photoId: picked.id }, token);
      // ID asosidagi kanonik URL eng ishonchli (har doim ochiladi) — birinchi o'sha.
      const resolvedUrl = buildAttachUrl(picked.id) || normalizeAttachUrl(picked.url);
      setPhotoPreview(resolvedUrl);
      setProfile((prev) => (prev ? { ...prev, photo: { id: picked.id, url: resolvedUrl } } : prev));
    });

  const handlePickBusinessPhoto = () =>
    run('photo', async () => {
      if (!token || !workspace.activeBusinessId) throw new Error(t('profile.noToken'));
      const picked = await pickAndUploadImage(token);
      if (picked.status === 'canceled') return;
      if (picked.status === 'denied') throw new Error(t('profile.galleryDenied'));
      if (picked.status === 'error') throw new Error(t('profile.photoIdMissing'));

      const businessId = workspace.activeBusinessId;
      const updated = await updateBusinessPhoto(businessId, picked.id, token);
      // Optimistik kesh yangilash — Profile ham, WorkspaceSwitcher ham darhol yangi rasmni ko'radi.
      queryClient.setQueryData<BusinessDTO[]>(myBusinessesQueryKey(profile?.id), (prev) =>
        prev?.map((b) => (b.id === businessId ? { ...b, photoId: updated.photoId } : b)),
      );
    });

  const handleDelete = () => {
    confirmAction(
      t('profile.deleteConfirm'),
      () =>
        run('delete', async () => {
          if (!token || !profile?.id) throw new Error(t('profile.noToken'));
          await deleteProfile(profile.id, token);
          setProfile(null);
        }),
      { title: t('profile.deleteProfile'), confirmLabel: t('common.delete'), ...confirmLabels }
    );
  };

  const openPhotoPreview = () => {
    if (!photoUri) return;
    setPhotoModalError('');
    setPhotoModalVisible(true);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <WorkspaceSwitcher />
      <Text style={styles.title}>{t('profile.settingsTitle')}</Text>

      {profile ? (
        <ProfileAvatar
          isBusiness={isBusiness}
          activeBusiness={activeBusiness}
          personalPhotoUri={photoUri}
          editing={loadingKey === 'photo'}
          onEditPhoto={isBusiness ? handlePickBusinessPhoto : handlePickPhoto}
          onPreview={openPhotoPreview}
        />
      ) : null}

      {profile ? (
        <Card style={styles.infoCard}>
          {isBusiness && activeBusiness ? (
            <>
              <Text style={styles.infoLabel}>{t('business.myBusinesses')}</Text>
              <Text style={styles.infoText}>{activeBusiness.name}</Text>
              {activeBusiness.address ? <Text style={styles.infoSubText}>{activeBusiness.address}</Text> : null}
              <Text style={styles.infoSubText}>
                {t('business.ownerLabel')}: {activeBusiness.ownerName || '--'}
              </Text>
              {workspace.activeBusinessRole ? (
                <View style={styles.roleBadge}>
                  <Text style={styles.roleBadgeText}>{workspace.activeBusinessRole}</Text>
                </View>
              ) : null}
            </>
          ) : (
            <>
              <Text style={styles.infoText}>
                {profile.name} {profile.surname}
              </Text>
              <Text style={styles.infoText}>{profile.username}</Text>
              {profile.status ? <Text style={styles.infoText}>{profile.status}</Text> : null}
            </>
          )}
        </Card>
      ) : (
        <Text style={styles.infoText}>{t('profile.notLoggedIn')}</Text>
      )}

      {profile && userStats ? (
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t('stats.title')}</Text>
          <View style={styles.statsRow}>
            <View style={styles.statTile}>
              <View style={[styles.statIcon, { backgroundColor: colors.primarySoft }]}>
                <Ionicons name="people-outline" size={16} color={colors.primary} />
              </View>
              <Text style={styles.statValue}>{userStats.registeredUsers}</Text>
              <Text style={styles.statLabel}>{t('stats.registered')}</Text>
            </View>
            <View style={styles.statTile}>
              <View style={[styles.statIcon, { backgroundColor: colors.surfaceMuted }]}>
                <Ionicons name="hourglass-outline" size={16} color={colors.textSecondary} />
              </View>
              <Text style={styles.statValue}>{userStats.pendingUsers}</Text>
              <Text style={styles.statLabel}>{t('stats.pending')}</Text>
            </View>
          </View>
        </Card>
      ) : null}

      <Card style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>{t('profile.language')}</Text>
        <LanguageSwitcher variant="list" />
      </Card>

      <Card style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>{t('profile.theme')}</Text>
        <ThemeSwitcher />
      </Card>

      <Card style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>{t('profile.currency')}</Text>
        <CurrencySwitcher />
      </Card>

      {profile && !isBusiness ? (
        <>
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{t('profile.nameSection')}</Text>
            <Input label={t('profile.name')} value={name} onChangeText={setName} containerStyle={styles.compactField} />
            <FieldWithAction
              label={t('profile.surname')}
              value={surname}
              onChangeText={setSurname}
              iconName="create-outline"
              onAction={handleUpdateDetail}
              loading={loadingKey === 'detail'}
            />
          </Card>

          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{t('profile.phoneSection')}</Text>
            <FieldWithAction
              label={t('profile.username')}
              value={username}
              onChangeText={setUsername}
              iconName="create-outline"
              onAction={handleUpdateUsername}
              loading={loadingKey === 'username'}
            />
            {pendingUsername ? (
              <>
                <FieldWithAction
                  label={t('profile.confirmCode')}
                  value={confirmCode}
                  onChangeText={setConfirmCode}
                  iconName="checkmark-outline"
                  onAction={handleConfirmUsername}
                  loading={loadingKey === 'usernameConfirm'}
                />
                <Text style={styles.helperText}>
                  {t('profile.newUsername')}: {pendingUsername}
                </Text>
              </>
            ) : null}
          </Card>

          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{t('profile.changePassword')}</Text>
            <Input
              label={t('profile.oldPasswordLabel')}
              value={oldPassword}
              onChangeText={setOldPassword}
              secureTextEntry
              autoComplete="off"
              importantForAutofill="no"
              containerStyle={styles.compactField}
            />
            <Input
              label={t('profile.newPassword')}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              autoComplete="off"
              importantForAutofill="no"
              containerStyle={styles.compactField}
            />
            <FieldWithAction
              label={t('profile.newPasswordConfirm')}
              value={confirmNewPassword}
              onChangeText={setConfirmNewPassword}
              secureTextEntry
              autoComplete="off"
              iconName="create-outline"
              onAction={handleUpdatePassword}
              loading={loadingKey === 'password'}
            />
          </Card>

          {status ? <Text style={[styles.statusText, statusError && styles.statusError]}>{status}</Text> : null}
        </>
      ) : null}

      {profile ? (
        <>
          <View style={styles.actionsRow}>
            <Pressable
              style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
              onPress={() => navigation.navigate(ROUTES.MY_BUSINESSES)}
              accessibilityRole="button"
            >
              <Text style={styles.secondaryBtnText}>{t('profile.myBusinesses')}</Text>
            </Pressable>
          </View>

          <View style={styles.actionsRow}>
            <Pressable
              style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
              onPress={handleLogout}
              accessibilityRole="button"
            >
              <Text style={styles.secondaryBtnText}>{t('profile.logout')}</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.dangerBtn, pressed && styles.pressed]}
              onPress={handleDelete}
              disabled={loadingKey === 'delete'}
              accessibilityRole="button"
            >
              {loadingKey === 'delete' ? (
                <ActivityIndicator size="small" color={colors.textOnPrimary} />
              ) : (
                <Text style={styles.dangerBtnText}>{t('profile.deleteProfile')}</Text>
              )}
            </Pressable>
          </View>
        </>
      ) : null}

      <ProfilePhotoModal
        visible={photoModalVisible}
        photoUri={photoUri}
        error={photoModalError}
        onClose={() => setPhotoModalVisible(false)}
        onImageError={() => setPhotoModalError(t('profile.imageLoadFailed'))}
      />
    </ScrollView>
  );
};

const createStyles = ({ colors, spacing, radius, typography }: ThemeValue) =>
  StyleSheet.create({
    container: {
      padding: spacing.sm,
      backgroundColor: colors.background,
    },
    title: {
      ...typography.heading1,
      fontSize: 30,
      fontWeight: '800',
      color: colors.textPrimary,
      letterSpacing: -0.6,
      marginBottom: spacing.md,
      textAlign: 'center',
    },
    infoCard: {
      marginBottom: spacing.lg,
    },
    infoLabel: {
      ...typography.caption,
      fontSize: 11,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: spacing.xxs,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    infoText: {
      ...typography.body,
      color: colors.textPrimary,
      marginBottom: spacing.xxs,
    },
    infoSubText: {
      ...typography.caption,
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: spacing.xxs / 2,
    },
    roleBadge: {
      alignSelf: 'flex-start',
      marginTop: spacing.xxs + 2,
      paddingHorizontal: spacing.xs + 2,
      paddingVertical: spacing.xxs / 1.3,
      borderRadius: radius.pill,
      backgroundColor: colors.primarySoft,
    },
    roleBadgeText: {
      ...typography.caption,
      fontSize: 11,
      fontWeight: '700',
      color: colors.primaryPressed,
    },
    sectionCard: {
      marginBottom: spacing.sm,
    },
    statsRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    statTile: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      padding: spacing.sm,
      backgroundColor: colors.surface,
    },
    statIcon: {
      width: 28,
      height: 28,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.xs,
    },
    statValue: {
      ...typography.heading2,
      fontSize: 22,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    statLabel: {
      ...typography.caption,
      fontSize: 11,
      marginTop: spacing.xxs / 2,
      color: colors.textSecondary,
    },
    sectionTitle: {
      ...typography.button,
      fontSize: 15,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: spacing.sm,
    },
    compactField: {
      marginBottom: spacing.xxs + 2,
    },
    helperText: {
      ...typography.caption,
      marginTop: spacing.xs,
      color: colors.textSecondary,
    },
    statusText: {
      ...typography.bodySmall,
      color: colors.primary,
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    statusError: {
      color: colors.danger,
    },
    actionsRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginBottom: spacing.lg,
    },
    secondaryBtn: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.sm,
      backgroundColor: colors.surface,
    },
    secondaryBtnText: {
      ...typography.label,
      color: colors.textPrimary,
      fontWeight: '700',
      fontSize: 13,
    },
    dangerBtn: {
      flex: 1,
      borderRadius: radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.sm,
      backgroundColor: colors.danger,
    },
    dangerBtnText: {
      ...typography.label,
      color: colors.textOnPrimary,
      fontWeight: '700',
      fontSize: 13,
    },
    pressed: {
      opacity: 0.7,
    },
  });

export default ProfileScreen;
