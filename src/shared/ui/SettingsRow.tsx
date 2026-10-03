import React, { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../theme';
import type { ThemeValue } from '../theme/ThemeProvider';

export interface SettingsRowProps {
  label: string;
  /** Chapdagi ikonka. Rangsiz kontur - menyu qatorlari bilan bir tilda. */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Chapdagi rangli doira (rang tanlash uchun). */
  dot?: string;
  /** O'ngdagi qiymat matni: "Ingliz", "100 000 so'm". */
  value?: string;
  /** O'ng chetdagi tayyor element - kalit yoki boshqa boshqaruv. */
  trailing?: React.ReactNode;
  /** Tanlangan band: o'ng chetda belgi chiqadi. */
  selected?: boolean;
  /** Bosilsa strelka chiziladi. */
  onPress?: () => void;
  isLast?: boolean;
  disabled?: boolean;
}

/**
 * Sozlamalar guruhidagi bitta qator.
 *
 * TUZILISHI DOIM BIR XIL: chapda nomi, o'ngda holati. Odam ko'zini
 * chapdan o'ngga yurgizib, "nima" va "qanday" degan ikkala savolga
 * javob oladi. Holat turlicha ko'rinadi - qiymat matni, kalit, belgi
 * yoki strelka - lekin O'RNI o'zgarmaydi.
 *
 * Ajratuvchi chiziq qatorning O'ZIDA: guruh panelida chizilsa, oxirgi
 * qator ostida ortiqcha chiziq qolardi.
 */
const SettingsRow: React.FC<SettingsRowProps> = ({
  label,
  icon,
  dot,
  value,
  trailing,
  selected,
  onPress,
  isLast,
  disabled,
}) => {
  const theme = useAppTheme();
  const { colors } = theme;
  const styles = useMemo(() => createStyles(theme), [theme]);

  const body = (
    <>
      {dot ? <View style={[styles.dot, { backgroundColor: dot }]} /> : null}
      {icon ? <Ionicons name={icon} size={20} color={colors.textSecondary} /> : null}

      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>

      {value ? (
        <Text style={styles.value} numberOfLines={1}>
          {value}
        </Text>
      ) : null}

      {trailing}

      {/* Tanlov belgisi va strelka BIR-BIRINI istisno qiladi: band ham
          tanlanadigan, ham ochiladigan bo'lishi mantiqsiz. */}
      {selected ? (
        <Ionicons name="checkmark" size={20} color={colors.primary} />
      ) : onPress && !trailing ? (
        <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
      ) : null}
    </>
  );

  if (!onPress || disabled) {
    return (
      <View style={[styles.row, !isLast && styles.divider, disabled && styles.disabled]}>
        {body}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: Boolean(selected) }}
      style={({ pressed }) => [styles.row, !isLast && styles.divider, pressed && styles.pressed]}
    >
      {body}
    </Pressable>
  );
};

const createStyles = ({ colors, spacing }: ThemeValue) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 50,
      paddingHorizontal: spacing.md,
      gap: spacing.sm,
    },
    // Chiziq chap chetdan EMAS, matn boshlanadigan joydan: shunda
    // qatorlar bir-biriga ulanib, yaxlit ro'yxat bo'lib ko'rinadi.
    divider: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    dot: {
      width: 22,
      height: 22,
      borderRadius: 11,
    },
    label: {
      flex: 1,
      fontSize: 16,
      color: colors.textPrimary,
    },
    // Qiymat bosiq rangda: u javob, savol emas.
    value: {
      fontSize: 16,
      color: colors.textSecondary,
      maxWidth: '45%',
      textAlign: 'right',
    },
    pressed: {
      opacity: 0.6,
    },
    disabled: {
      opacity: 0.45,
    },
  });

export default memo(SettingsRow);
