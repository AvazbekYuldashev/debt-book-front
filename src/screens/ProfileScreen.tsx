import React, { useContext, useEffect, useMemo, useState } from 'react';
import {
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
import colors from '../styles/colors';
import { AuthContext } from '../context/AuthContext';
import Card from '../components/Card';
import AppTextInput from '../components/form/AppTextInput';
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
import { uploadAttach, uploadAttachFile } from '../api/attach';
import { API_BASE } from '../api/baseUrl';

const ProfileScreen: React.FC = () => {
  const { profile, setProfile } = useContext(AuthContext);
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

  const token = useMemo(() => profile?.jwt, [profile?.jwt]);
  const photoUri = photoPreview || profile?.photo?.url || buildProfilePhotoUrl(profile?.photo?.id);
  const windowSize = Dimensions.get('window');
  const modalImageSize = {
    width: windowSize.width,
    height: windowSize.height * 0.4,
  };

  useEffect(() => {
    if (profile?.photo?.url) {
      setPhotoPreview(profile.photo.url);
      return;
    }
    if (profile?.photo?.id) {
      setPhotoPreview(buildProfilePhotoUrl(profile.photo.id));
    }
  }, [profile?.photo?.id, profile?.photo?.url]);



  const handleLogout = () => {
    setProfile(null);
  };

  const run = async (key: string, action: () => Promise<void>) => {
    setLoadingKey(key);
    setStatus('');
    try {
      await action();
      setStatus('Muvaffaqiyatli');
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Xatolik yuz berdi');
    } finally {
      setLoadingKey(null);
    }
  };

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
            (typeof nestedPhoto?.url === 'string' ? nestedPhoto.url : undefined) ||
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

  const handleUpdateDetail = () =>
    run('detail', async () => {
      if (!token) throw new Error('Token topilmadi');
      await updateProfileDetail({ name: name.trim(), surname: surname.trim() }, token);
      setProfile((prev) => (prev ? { ...prev, name: name.trim(), surname: surname.trim() } : prev));
    });

  const handleUpdateUsername = () =>
    run('username', async () => {
      if (!token) throw new Error('Token topilmadi');
      const clean = username.trim();
      if (!clean) throw new Error('Username kiriting');
      await updateProfileUsername({ username: clean }, token);
      setPendingUsername(clean);
      setConfirmCode('');
    });

  const handleConfirmUsername = () =>
    run('usernameConfirm', async () => {
      if (!token) throw new Error('Token topilmadi');
      const code = confirmCode.trim();
      if (!code) throw new Error('Kod kiriting');
      await confirmProfileUsername({ code }, token);
      if (pendingUsername) {
        setProfile((prev) => (prev ? { ...prev, username: pendingUsername } : prev));
      }
      setPendingUsername('');
      setConfirmCode('');
    });

  const handleUpdatePassword = () =>
    run('password', async () => {
      if (!token) throw new Error('Token topilmadi');
      if (!oldPassword.trim() || !newPassword.trim() || !confirmNewPassword.trim()) {
        throw new Error('Parollarni kiriting');
      }
      if (newPassword.trim() !== confirmNewPassword.trim()) {
        throw new Error('Yangi parollar mos emas');
      }
      await updateProfilePassword({ oldPassword: oldPassword.trim(), newPassword: newPassword.trim() }, token);
      setOldPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    });

  const handlePickPhoto = () =>
    run('photo', async () => {
      if (!token) throw new Error('Token topilmadi');
      if (Platform.OS !== 'web') {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          throw new Error('Galereyaga ruxsat berilmadi');
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
      if (!uploaded.id) throw new Error('Photo id topilmadi');
      await updateProfilePhoto({ photoId: uploaded.id }, token);
      // Use the returned URL for preview when available.
      const resolvedUrl = uploaded.url || buildProfilePhotoUrl(uploaded.id) || asset.uri;
      setPhotoPreview(resolvedUrl);
      setProfile((prev) =>
        prev ? { ...prev, photo: { id: uploaded.id, url: resolvedUrl } } : prev
      );
    });

  const handleDelete = () =>
    run('delete', async () => {
      if (!token || !profile?.id) throw new Error('Token topilmadi');
      await deleteProfile(profile.id, token);
      setProfile(null);
    });

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Profil sozlamalari</Text>
      {profile ? (
        <View style={styles.avatarBlock}>
          {photoPreview || profile?.photo?.url ? (
            <TouchableOpacity
              onPress={() => {
                if (photoUri) {
                  setPhotoModalError('');
                  setPhotoModalVisible(true);
                }
              }}
            >
              <Image source={{ uri: photoUri }} style={styles.avatar} />
            </TouchableOpacity>
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person-outline" size={36} color={colors.textSecondary} />
            </View>
          )}
          <TouchableOpacity
            style={styles.avatarEdit}
            onPress={handlePickPhoto}
            disabled={loadingKey === 'photo'}
          >
            <Ionicons name="create-outline" size={16} color={colors.primary} />
          </TouchableOpacity>
        </View>
      ) : null}
      {profile ? (
        <Card style={styles.infoCard}>
          <Text style={styles.infoText}>{profile.name} {profile.surname}</Text>
          <Text style={styles.infoText}>{profile.username}</Text>
          {profile.status ? <Text style={styles.infoText}>{profile.status}</Text> : null}
        </Card>
      ) : (
        <Text style={styles.infoText}>Tizimga kirmagansiz</Text>
      )}

      {profile ? (
        <>
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Ism va familiya</Text>
            <AppTextInput label="Ism" value={name} onChangeText={setName} containerStyle={styles.compactField} />
            <View style={styles.inputRow}>
              <AppTextInput
                label="Familiya"
                value={surname}
                onChangeText={setSurname}
                containerStyle={[styles.compactField, styles.flexOne]}
              />
              <TouchableOpacity
                style={styles.iconAction}
                onPress={handleUpdateDetail}
                disabled={loadingKey === 'detail'}
              >
                <Ionicons name="create-outline" size={18} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </Card>

          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Telefon (username)</Text>
            <View style={styles.inputRow}>
              <AppTextInput
                label="Username"
                value={username}
                onChangeText={setUsername}
                containerStyle={[styles.compactField, styles.flexOne]}
              />
              <TouchableOpacity
                style={styles.iconAction}
                onPress={handleUpdateUsername}
                disabled={loadingKey === 'username'}
              >
                <Ionicons name="create-outline" size={18} color={colors.primary} />
              </TouchableOpacity>
            </View>
            {pendingUsername ? (
              <>
                <View style={styles.inputRow}>
                  <AppTextInput
                    label="Tasdiqlash kodi"
                    value={confirmCode}
                    onChangeText={setConfirmCode}
                    containerStyle={[styles.compactField, styles.flexOne]}
                  />
                  <TouchableOpacity
                    style={styles.iconAction}
                    onPress={handleConfirmUsername}
                    disabled={loadingKey === 'usernameConfirm'}
                  >
                    <Ionicons name="checkmark-outline" size={18} color={colors.primary} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.helperText}>Yangi username: {pendingUsername}</Text>
              </>
            ) : null}
          </Card>

          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Parolni o'zgartirish</Text>
            <AppTextInput
              label="Eski parol"
              value={oldPassword}
              onChangeText={setOldPassword}
              secureTextEntry
              containerStyle={styles.compactField}
            />
            <AppTextInput
              label="Yangi parol"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              containerStyle={styles.compactField}
            />
            <View style={styles.inputRow}>
              <AppTextInput
                label="Yangi parol (tasdiq)"
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
                <Ionicons name="create-outline" size={18} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </Card>

          {status ? <Text style={styles.statusText}>{status}</Text> : null}

          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.secondaryBtn} onPress={handleLogout}>
              <Text style={styles.secondaryBtnText}>Chiqish</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dangerBtn} onPress={handleDelete} disabled={loadingKey === 'delete'}>
              <Text style={styles.dangerBtnText}>Profilni o'chirish</Text>
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
          {photoPreview || profile?.photo?.url ? (
            <View style={styles.photoModalCenter} pointerEvents="box-none">
              <TouchableOpacity
                activeOpacity={1}
                style={[styles.photoModalImageWrap, modalImageSize]}
              >
                <Image
                  source={{ uri: photoUri }}
                  style={styles.photoModalImage}
                  onError={() => setPhotoModalError('Rasm yuklanmadi')}
                />
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.photoModalText}>Rasm topilmadi</Text>
          )}
          {photoModalError ? <Text style={styles.photoModalText}>{photoModalError}</Text> : null}
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
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
  infoText: {
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 4,
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
    backgroundColor: '#fff',
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
    backgroundColor: colors.card,
  },
  avatarPlaceholder: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
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
    backgroundColor: '#fff',
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
  photoModalClose: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 2,
  },
  statusText: {
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 10,
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
    backgroundColor: '#fff',
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
