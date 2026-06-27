import React, { useContext, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../theme';
import { ColorTokens } from '../theme/colors';
import { AuthContext } from '../context/AuthContext';
import { WorkspaceContext } from '../context/WorkspaceContext';
import Card from '../components/Card';
import AppTextInput from '../components/form/AppTextInput';
import WorkspaceSwitcher from '../components/business/WorkspaceSwitcher';
import LanguageSwitcher from '../components/LanguageSwitcher';
import ThemeSwitcher from '../components/ThemeSwitcher';
import { useI18n } from '../i18n';
import { confirmAction } from '../utils/confirm';
import * as ImagePicker from 'expo-image-picker';
import {
  confirmProfileUsername,
  deleteProfile,
  getMyProfile,
  updateProfileDetail,
  updateProfilePassword,
  updateProfilePhoto,
  updateProfileUsername,
} from '../api/profile';
import { getMyBusinesses } from '../services/businessService';
import { BusinessDTO } from '../types/business';
import { uploadAttach, uploadAttachFile } from '../api/attach';
import { API_BASE } from '../api/baseUrl';
import UserAvatar from '../shared/ui/UserAvatar';
import { ROUTES } from '../navigation/routes';

const ProfileScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { t } = useI18n();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { profile, setProfile } = useContext(AuthContext);
  const { workspace } = useContext(WorkspaceContext);
  const isBusiness = workspace.mode === 'business';
  const [activeBusiness, setActiveBusiness] = useState<BusinessDTO | null>(null);
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

  // Tasdiq dialoglari uchun tarjima qilingan tugma matnlari.
  const confirmLabels = useMemo(
    () => ({ cancelLabel: t('common.cancel') }),
    [t]
  );

  const token = useMemo(() => profile?.jwt, [profile?.jwt]);
  const photoUri =
    normalizeBackendPhotoUrl(photoPreview) ||
    normalizeBackendPhotoUrl(profile?.photo?.url) ||
    buildProfilePhotoUrl(profile?.photo?.id);
  const windowSize = Dimensions.get('window');
  const modalImageSize = {
    width: windowSize.width,
    height: windowSize.height * 0.4,
  };

  useEffect(() => {
    if (profile?.photo?.url) {
      setPhotoPreview(normalizeBackendPhotoUrl(profile.photo.url));
      return;
    }
    if (profile?.photo?.id) {
      setPhotoPreview(buildProfilePhotoUrl(profile.photo.id));
    }
  }, [profile?.photo?.id, profile?.photo?.url]);



  const handleLogout = () => {
    confirmAction(
      t('profile.logoutConfirm'),
      () => setProfile(null),
      { title: t('profile.logout'), confirmLabel: t('profile.logout'), ...confirmLabels }
    );
  };

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
            normalizeBackendPhotoUrl(typeof nestedPhoto?.url === 'string' ? nestedPhoto.url : undefined) ||
            prev.photo?.url ||
            buildProfilePhotoUrl(photoId);

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

  useEffect(() => {
    if (!token || !isBusiness || !workspace.activeBusinessId) {
      setActiveBusiness(null);
      return;
    }
    getMyBusinesses(token)
      .then((list) => {
        const found = list.find((b) => b.id === workspace.activeBusinessId) || null;
        setActiveBusiness(found);
      })
      .catch(() => {});
  }, [token, isBusiness, workspace.activeBusinessId]);

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
      if (Platform.OS !== 'web') {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          throw new Error(t('profile.galleryDenied'));
        }
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset?.uri) return;
      let uploaded;
      if (Platform.OS === 'web' && (asset as unknown as { file?: Blob }).file) {
        const file = (asset as unknown as { file: Blob }).file;
        uploaded = await uploadAttachFile(file, token);
      } else {
        const name = asset.fileName || `photo-${Date.now()}.jpg`;
        const type = asset.type === 'image' ? 'image/jpeg' : 'application/octet-stream';
        uploaded = await uploadAttach({ uri: asset.uri, name, type }, token);
      }
      if (!uploaded.id) throw new Error(t('profile.photoIdMissing'));
      await updateProfilePhoto({ photoId: uploaded.id }, token);
      // ID asosidagi kanonik URL eng ishonchli (har doim ochiladi) — birinchi o'sha.
      const resolvedUrl =
        buildProfilePhotoUrl(uploaded.id) || normalizeBackendPhotoUrl(uploaded.url) || asset.uri;
      setPhotoPreview(resolvedUrl);
      setProfile((prev) =>
        prev ? { ...prev, photo: { id: uploaded.id, url: resolvedUrl } } : prev
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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <WorkspaceSwitcher />
      <Text style={styles.title}>{t('profile.settingsTitle')}</Text>
      {profile ? (
        <View style={styles.avatarBlock}>
          <TouchableOpacity
            activeOpacity={photoUri ? 0.8 : 1}
            onPress={() => {
              if (photoUri) {
                setPhotoModalError('');
                setPhotoModalVisible(true);
              }
            }}
          >
            <UserAvatar uri={photoUri} size={84} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.avatarEdit}
            onPress={handlePickPhoto}
            disabled={loadingKey === 'photo'}
          >
            {loadingKey === 'photo' ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="create-outline" size={16} color={colors.primary} />
            )}
          </TouchableOpacity>
        </View>
      ) : null}
      {profile ? (
        <Card style={styles.infoCard}>
          {isBusiness && activeBusiness ? (
            <>
              <Text style={styles.infoLabel}>{t('business.myBusinesses')}</Text>
              <Text style={styles.infoText}>{activeBusiness.name}</Text>
              {activeBusiness.address ? (
                <Text style={styles.infoSubText}>{activeBusiness.address}</Text>
              ) : null}
              <Text style={styles.infoSubText}>{t('business.ownerLabel')}: {activeBusiness.ownerName || '--'}</Text>
              {workspace.activeBusinessRole ? (
                <View style={styles.roleBadgeWrap}>
                  <Text style={styles.roleBadgeText}>{workspace.activeBusinessRole}</Text>
                </View>
              ) : null}
            </>
          ) : (
            <>
              <Text style={styles.infoText}>{profile.name} {profile.surname}</Text>
              <Text style={styles.infoText}>{profile.username}</Text>
              {profile.status ? <Text style={styles.infoText}>{profile.status}</Text> : null}
            </>
          )}
        </Card>
      ) : (
        <Text style={styles.infoText}>{t('profile.notLoggedIn')}</Text>
      )}

      <Card style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>{t('profile.language')}</Text>
        <LanguageSwitcher variant="list" />
      </Card>

      <Card style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>{t('profile.theme')}</Text>
        <ThemeSwitcher />
      </Card>

      {profile && !isBusiness ? (
        <>
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{t('profile.nameSection')}</Text>
            <AppTextInput label={t('profile.name')} value={name} onChangeText={setName} containerStyle={styles.compactField} />
            <View style={styles.inputRow}>
              <AppTextInput
                label={t('profile.surname')}
                value={surname}
                onChangeText={setSurname}
                containerStyle={[styles.compactField, styles.flexOne]}
              />
              <TouchableOpacity
                style={styles.iconAction}
                onPress={handleUpdateDetail}
                disabled={loadingKey === 'detail'}
              >
                {loadingKey === 'detail' ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Ionicons name="create-outline" size={18} color={colors.primary} />
                )}
              </TouchableOpacity>
            </View>
          </Card>

          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{t('profile.phoneSection')}</Text>
            <View style={styles.inputRow}>
              <AppTextInput
                label={t('profile.username')}
                value={username}
                onChangeText={setUsername}
                containerStyle={[styles.compactField, styles.flexOne]}
              />
              <TouchableOpacity
                style={styles.iconAction}
                onPress={handleUpdateUsername}
                disabled={loadingKey === 'username'}
              >
                {loadingKey === 'username' ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Ionicons name="create-outline" size={18} color={colors.primary} />
                )}
              </TouchableOpacity>
            </View>
            {pendingUsername ? (
              <>
                <View style={styles.inputRow}>
                  <AppTextInput
                    label={t('profile.confirmCode')}
                    value={confirmCode}
                    onChangeText={setConfirmCode}
                    containerStyle={[styles.compactField, styles.flexOne]}
                  />
                  <TouchableOpacity
                    style={styles.iconAction}
                    onPress={handleConfirmUsername}
                    disabled={loadingKey === 'usernameConfirm'}
                  >
                    {loadingKey === 'usernameConfirm' ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <Ionicons name="checkmark-outline" size={18} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                </View>
                <Text style={styles.helperText}>{t('profile.newUsername')}: {pendingUsername}</Text>
              </>
            ) : null}
          </Card>

          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{t('profile.changePassword')}</Text>
            <AppTextInput
              label={t('profile.oldPasswordLabel')}
              value={oldPassword}
              onChangeText={setOldPassword}
              secureTextEntry
              containerStyle={styles.compactField}
            />
            <AppTextInput
              label={t('profile.newPassword')}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              containerStyle={styles.compactField}
            />
            <View style={styles.inputRow}>
              <AppTextInput
                label={t('profile.newPasswordConfirm')}
                value={confirmNewPassword}
                onChangeText={setConfirmNewPassword}
                secureTextEntry
                containerStyle={[styles.compactField, styles.flexOne]}
              />
              <TouchableOpacity
                style={styles.iconAction}
                onPress={handleUpdatePassword}
                disabled={loadingKey === 'password'}
              >
                {loadingKey === 'password' ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Ionicons name="create-outline" size={18} color={colors.primary} />
                )}
              </TouchableOpacity>
            </View>
          </Card>

          {status ? (
            <Text style={[styles.statusText, statusError && styles.statusError]}>{status}</Text>
          ) : null}
        </>
      ) : null}

      {profile ? (
        <>
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => navigation.navigate(ROUTES.MY_BUSINESSES)}
            >
              <Text style={styles.secondaryBtnText}>{t('profile.myBusinesses')}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.secondaryBtn} onPress={handleLogout}>
              <Text style={styles.secondaryBtnText}>{t('profile.logout')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dangerBtn} onPress={handleDelete} disabled={loadingKey === 'delete'}>
              {loadingKey === 'delete' ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.dangerBtnText}>{t('profile.deleteProfile')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </>
      ) : null}
      <Modal
        visible={photoModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPhotoModalVisible(false)}
      >
        <View style={styles.photoModalBackdrop}>
          <Pressable style={styles.photoModalOverlay} onPress={() => setPhotoModalVisible(false)} />
          {photoUri ? (
            <View style={styles.photoModalCenter} pointerEvents="box-none">
              <TouchableOpacity
                activeOpacity={1}
                style={[styles.photoModalImageWrap, modalImageSize]}
              >
                <Image
                  source={{ uri: photoUri }}
                  style={styles.photoModalImage}
                  onError={() => setPhotoModalError(t('profile.imageLoadFailed'))}
                />
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.photoModalText}>{t('profile.imageNotFound')}</Text>
          )}
          {photoModalError ? <Text style={styles.photoModalText}>{photoModalError}</Text> : null}
        </View>
      </Modal>
    </ScrollView>
  );
};

const createStyles = (colors: ColorTokens) => StyleSheet.create({
  container: {
    padding: 12,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 16,
    textAlign: 'center',
  },
  infoCard: {
    marginBottom: 24,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoText: {
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  infoSubText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  roleBadgeWrap: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: colors.primarySoft,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryPressed,
  },
  sectionCard: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compactField: {
    marginBottom: 6,
  },
  flexOne: {
    flex: 1,
  },
  iconAction: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  helperText: {
    marginTop: 8,
    color: colors.textSecondary,
    fontSize: 12,
  },
  avatarBlock: {
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  avatarPlaceholder: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  avatarEdit: {
    marginTop: 8,
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  photoModalBackdrop: {
    flex: 1,
    position: 'relative',
  },
  photoModalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.9)',
  },
  photoModalCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  photoModalImageWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoModalImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  photoModalText: {
    color: '#fff',
    marginTop: 10,
  },
  statusText: {
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 10,
  },
  statusError: {
    color: colors.danger,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  secondaryBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: colors.surface,
  },
  secondaryBtnText: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 13,
  },
  dangerBtn: {
    flex: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: colors.danger,
  },
  dangerBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
});

export default ProfileScreen;

function buildProfilePhotoUrl(photoId?: string): string {
  const normalized = (photoId || '').trim();
  if (!normalized) return '';
  return `${API_BASE}/attach/open/${normalized}`;
}

function normalizeBackendPhotoUrl(url?: string): string {
  const raw = (url || '').trim();
  if (!raw) return '';

  // Backend ba'zan ichki host (localhost:8080 / 127.0.0.1 / internal IP) bilan URL qaytaradi —
  // bu foydalanuvchi brauzeridan ochilmaydi. Attach-rasm URL'ini HAR DOIM app'ning kanonik
  // manziliga (API_BASE) keltiramiz: web'da nisbiy (Apache /api proxy), mobil'da to'liq URL.
  const marker = '/attach/open/';
  const markerIdx = raw.indexOf(marker);
  if (markerIdx !== -1) {
    const after = raw.slice(markerIdx + marker.length);
    const fileId = after.split('?')[0].split('#')[0];
    if (fileId) return buildProfilePhotoUrl(fileId);
  }

  // Attach-open bo'lmagan nisbiy yo'l bo'lsa, apiOrigin bilan to'ldiramiz (mavjud bo'lsa).
  const apiOrigin = getApiOrigin();
  if (apiOrigin && raw.startsWith('/')) return `${apiOrigin}${raw}`;
  return raw;
}

function getApiOrigin(): string {
  try {
    return new URL(API_BASE).origin;
  } catch {
    return '';
  }
}
