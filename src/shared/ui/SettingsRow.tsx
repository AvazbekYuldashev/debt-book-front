import React, { memo, useMemo } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../theme';
import type { ThemeValue } from '../theme/ThemeProvider';
import { FOCUS_INSET } from './focusRing';

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
  /**
   * Berilsa (true YOKI false) - qator bir nechta variantdan BITTASINI
   * tanlash guruhining a'zosi (radio): tanlangani belgili, qolganlari
   * belgi o'rnida bo'sh joy bilan. Berilmasa - oddiy qator.
   */
  selected?: boolean;
  /** Bosilsa: tanlov qatorida tanlaydi, oddiy qatorda strelka chizib ochadi. */
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
 *
 * IKKI XIL QATOR, IKKI XIL BELGI: tanlov qatori (`selected` berilgan)
 * hech qachon strelka olmaydi - strelka "boshqa sahifa ochiladi" degani,
 * tanlov esa joyida bajariladi. Aks holda "Русский >" ham, "Ommaviy
 * oferta >" ham bir xil ko'rinib, qaysi biri ochilishini bilib bo'lmasdi.
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

  const isChoice = selected !== undefined;
  /**
   * Tanlov qatori ekran o'quvchiga RADIO deb e'lon qilinadi.
   *
   * Holat `aria-checked` orqali, `accessibilityState` emas:
   * react-native-web 0.21 accessibilityState'ni umuman o'qimaydi (web'da
   * "tanlangan" degan ma'lumot yo'qolardi), RN esa aria-checked'ni o'zi
   * accessibilityState'ga aylantiradi.
   */
  const checked = isChoice ? Boolean(selected) : undefined;

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

      {/* Tanlov qatorida belgi o'rni DOIM band: tanlanmaganda bo'sh. Shunda
          tanlov almashganda yozuv va qiymatlar siljimaydi. Strelka faqat
          ochiladigan oddiy qatorda. */}
      {isChoice ? (
        <View style={styles.checkSlot}>
          {selected ? <Ionicons name="checkmark" size={CHECK_SIZE} color={colors.primary} /> : null}
        </View>
      ) : onPress && !trailing ? (
        <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
      ) : null}
    </>
  );

  if (!onPress || disabled) {
    // Bosilmaydigan tanlov qatori ham radio bo'lib qoladi - faqat o'chiq.
    // focusable={false}: RNW `radio` rolli div'ni o'zi Tab to'xtash joyi
    // qiladi - o'chiq radio esa (brauzerdagi kabi) Tab'da to'xtamasin.
    return isChoice ? (
      <View
        style={[styles.row, !isLast && styles.divider, disabled && styles.disabled]}
        accessible
        accessibilityRole="radio"
        accessibilityLabel={label}
        aria-checked={checked}
        aria-disabled
        focusable={false}
      >
        {body}
      </View>
    ) : (
      <View style={[styles.row, !isLast && styles.divider, disabled && styles.disabled]}>
        {body}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={isChoice ? 'radio' : 'button'}
      accessibilityLabel={label}
      aria-checked={checked}
      {...(isChoice ? webSpaceSelects(onPress) : null)}
      // Qator overflow:hidden guruh panelining to'liq enida - halqa ichkariga.
      dataSet={FOCUS_INSET}
      style={({ pressed }) => [styles.row, !isLast && styles.divider, pressed && styles.pressed]}
    >
      {body}
    </Pressable>
  );
};

const CHECK_SIZE = 20;

/**
 * Web: radio bo'sh joy (Space) bilan tanlanadi (WAI-ARIA).
 *
 * react-native-web Space'ni faqat `button` rolida bosish deb biladi -
 * `role="radio"` div'da u tanlash o'rniga sahifani aylantirib yuborardi.
 * Enter'ni RNW o'zi ishlaydi. Native'da klaviatura hodisasi yo'q, RN
 * tiplarida esa `onKeyDown` yo'q - shuning uchun `object` sifatida yoyiladi.
 */
const webSpaceSelects = (onPress: () => void): object | null =>
  Platform.OS === 'web'
    ? {
        onKeyDown: (event: { key: string; repeat?: boolean; preventDefault: () => void }) => {
          if (event.key !== ' ' || event.repeat) return;
          event.preventDefault();
          onPress();
        },
      }
    : null;

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
    checkSlot: {
      width: CHECK_SIZE,
      alignItems: 'center',
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
