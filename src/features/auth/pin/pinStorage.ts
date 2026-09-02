import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { storage } from '../../../shared/lib/storage';

// ============================================================
//  Ilova-qulfi PIN kodi (bank ilovalaridagidek).
//
//  Bu DBdagi bcrypt HISOB paroli EMAS. Bu — qurilmada saqlanadigan,
//  ilovaga har kirishda so'raladigan 4 xonali mahalliy kod. Serverga
//  umuman yuborilmaydi.
//
//  Saqlash:
//   - Android/iOS: expo-secure-store (OS keystore, shifrlangan).
//   - Web: AsyncStorage->localStorage (SecureStore web'da yo'q).
//  Ikkala holatda ham PIN OCHIQ saqlanmaydi: tasodifiy tuz (salt) bilan
//  SHA-256 xeshi saqlanadi. 4 xonali kodning o'zi qisqa, lekin hech
//  bo'lmasa qurilma xotirasidan to'g'ridan-to'g'ri o'qib bo'lmaydi.
// ============================================================

const PIN_KEY = 'debt-book.app-pin.v1';

interface StoredPin {
  salt: string;
  hash: string;
}

const isNative = Platform.OS !== 'web';

async function readRaw(): Promise<string | null> {
  if (isNative) {
    try {
      return await SecureStore.getItemAsync(PIN_KEY);
    } catch {
      return null;
    }
  }
  return storage.get(PIN_KEY);
}

async function writeRaw(value: string): Promise<void> {
  if (isNative) {
    await SecureStore.setItemAsync(PIN_KEY, value);
    return;
  }
  await storage.set(PIN_KEY, value);
}

async function removeRaw(): Promise<void> {
  if (isNative) {
    try {
      await SecureStore.deleteItemAsync(PIN_KEY);
    } catch {
      // yo'q bo'lsa e'tiborsiz
    }
    return;
  }
  await storage.remove(PIN_KEY);
}

async function hashPin(pin: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${pin}`);
}

function randomSalt(): string {
  const bytes = Crypto.getRandomBytes(16);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** PIN o'rnatilganmi. */
export async function hasPin(): Promise<boolean> {
  const raw = await readRaw();
  return Boolean(raw);
}

/** Yangi PIN o'rnatadi (tuz + xesh saqlanadi). */
export async function savePin(pin: string): Promise<void> {
  const salt = randomSalt();
  const hash = await hashPin(pin, salt);
  const payload: StoredPin = { salt, hash };
  await writeRaw(JSON.stringify(payload));
}

/** Kiritilgan PIN saqlangani bilan mos keladimi. */
export async function checkPin(pin: string): Promise<boolean> {
  const raw = await readRaw();
  if (!raw) return false;
  try {
    const { salt, hash } = JSON.parse(raw) as StoredPin;
    const candidate = await hashPin(pin, salt);
    return candidate === hash;
  } catch {
    return false;
  }
}

/** PIN'ni o'chiradi (chiqishda yangi foydalanuvchi o'zinikini yaratsin). */
export async function clearPin(): Promise<void> {
  await removeRaw();
}
