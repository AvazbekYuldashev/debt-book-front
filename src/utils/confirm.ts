import { Alert, Platform } from 'react-native';

// ============================================================
//  O'chirish/muhim amallar uchun yagona tasdiq (ogohlantirish) helperi.
//  Web'da window.confirm, native'da Alert (Bekor / O'chirish) ishlatadi.
//  Foydalanuvchi rozi bo'lsagina onConfirm chaqiriladi.
// ============================================================
export function confirmAction(
  message: string,
  onConfirm: () => void,
  options?: { title?: string; confirmLabel?: string; cancelLabel?: string }
): void {
  const title = options?.title ?? 'Tasdiqlash';
  const confirmLabel = options?.confirmLabel ?? "O'chirish";
  const cancelLabel = options?.cancelLabel ?? 'Bekor qilish';

  if (Platform.OS === 'web') {
    const confirmFn = (globalThis as { confirm?: (m: string) => boolean }).confirm;
    if (typeof confirmFn === 'function') {
      if (confirmFn(message)) onConfirm();
    } else {
      // Tasdiq olib bo'lmadi -> qaytarib bo'lmaydigan amalni BAJARMAYMIZ (fail-safe).
      if (__DEV__) console.warn('confirmAction: confirm() mavjud emas, amal bekor qilindi');
    }
    return;
  }

  Alert.alert(title, message, [
    { text: cancelLabel, style: 'cancel' },
    { text: confirmLabel, style: 'destructive', onPress: onConfirm },
  ]);
}

// O'chirish uchun qulay qisqartma
export function confirmDelete(itemLabel: string, onConfirm: () => void): void {
  confirmAction(`"${itemLabel}" ni rostdan ham o'chirmoqchimisiz?`, onConfirm);
}
