import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useAppTheme } from '../theme';

interface CopyButtonProps {
  /** Nusxalanadigan to'liq matn (masalan biznes ID'si). */
  value: string;
  size?: number;
  color?: string;
}

/**
 * Kichik "nusxalash" tugmasi: bosilganda `value` ni buferga ko'chiradi va
 * qisqa vaqt ✓ belgisini ko'rsatadi. Web'da ham (expo-clipboard) ishlaydi.
 */
const CopyButton: React.FC<CopyButtonProps> = ({ value, size = 16, color }) => {
  const { colors } = useAppTheme();
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const handleCopy = useCallback(async () => {
    if (!value) return;
    try {
      await Clipboard.setStringAsync(value);
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      /* buferga yozib bo'lmadi — jimgina o'tkazamiz */
    }
  }, [value]);

  return (
    <Pressable
      onPress={handleCopy}
      hitSlop={8}
      accessibilityRole="button"
      style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
    >
      <Ionicons
        name={copied ? 'checkmark' : 'copy-outline'}
        size={size}
        color={copied ? colors.positive : (color ?? colors.textSecondary)}
      />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  btn: {
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  pressed: {
    opacity: 0.5,
  },
});

export default CopyButton;
