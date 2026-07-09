import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { uploadAttach, uploadAttachFile } from '../../api/attach';

export type PickImageResult =
  | { status: 'canceled' }
  | { status: 'denied' }
  | { status: 'error' }
  | { status: 'ok'; id: string; url?: string };

/**
 * Galereyadan rasm tanlaydi va backend'ga yuklaydi (web: File, mobil: uri).
 * Profil va biznes fotosi uchun yagona manba — natijani discriminated union bilan
 * qaytaradi, chaqiruvchi i18n xabarini o'zi hal qiladi.
 */
export async function pickAndUploadImage(token: string): Promise<PickImageResult> {
  if (Platform.OS !== 'web') {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return { status: 'denied' };
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.8,
  });
  if (result.canceled) return { status: 'canceled' };

  const asset = result.assets?.[0];
  if (!asset?.uri) return { status: 'canceled' };

  let uploaded;
  if (Platform.OS === 'web' && (asset as unknown as { file?: Blob }).file) {
    const file = (asset as unknown as { file: Blob }).file;
    uploaded = await uploadAttachFile(file, token);
  } else {
    const name = asset.fileName || `photo-${Date.now()}.jpg`;
    const type = asset.type === 'image' ? 'image/jpeg' : 'application/octet-stream';
    uploaded = await uploadAttach({ uri: asset.uri, name, type }, token);
  }

  if (!uploaded.id) return { status: 'error' };
  return { status: 'ok', id: uploaded.id, url: uploaded.url };
}
