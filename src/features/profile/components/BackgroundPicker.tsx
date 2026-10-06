import React, { useCallback, useContext, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../../auth/context/AuthContext';
import { pickAndUploadImage } from '../lib/pickImage';
import { updateProfileBackground } from '../api/profile';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useBackground } from '../../../shared/theme/BackgroundProvider';
import { photoBlur, type BackgroundFit } from '../../../shared/theme/backgroundSettings';
import { buildAttachUrl } from '../../../shared/lib/attachUrl';
import { useI18n } from '../../../shared/i18n';
import SurfaceLabel from '../../../shared/ui/SurfaceLabel';
import { BackgroundPhoto } from '../../../shared/ui/AmbientBackground';

/**
 * Xiralik darajalari: Yo'q / Kam / O'rta / Kuchli.
 *
 * Uzluksiz slider o'rniga to'rtta tayyor daraja: loyihada slider paketi
 * yo'q, uni qo'shish esa shu bitta sozlama uchun ortiqcha. Odam aniq
 * pikselni emas, "rasm qanchalik xira" ni tanlaydi; "Yo'q" - rasm asl holida.
 */
const DIM_LEVELS: { value: number; labelKey: string }[] = [
  { value: 0, labelKey: 'background.dimNone' },
  { value: 0.15, labelKey: 'background.dimLow' },
  { value: 0.4, labelKey: 'background.dimMid' },
  { value: 0.7, labelKey: 'background.dimHigh' },
];

const FIT_OPTIONS: { value: BackgroundFit; icon: keyof typeof Ionicons.glyphMap; labelKey: string }[] = [
  { value: 'cover', icon: 'expand-outline', labelKey: 'background.fitCover' },
  { value: 'contain', icon: 'scan-outline', labelKey: 'background.fitContain' },
];

/**
 * Web: radio bo'sh joy (Space) bilan tanlanadi (WAI-ARIA).
 *
 * react-native-web Space'ni faqat `button` rolida bosish deb biladi -
 * `role="radio"` da u tanlash o'rniga sahifani aylantirardi (Enter'ni RNW
 * o'zi ishlaydi). SettingsRow'dagi bilan bir xil qoida. Shu sababli
 * variantlar Pressable: RNW TouchableOpacity o'zining onKeyDown'i bilan
 * berilganini yopib qo'yadi, Pressable esa ikkalasini ham chaqiradi.
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

/**
 * Namuna ekrandan ancha kichik: bir xil piksel blur unda ancha kuchli
 * ko'rinardi. Shu sababli blur namuna o'lchamiga moslab kichraytiriladi.
 */
const PREVIEW_BLUR_SCALE = 0.4;

/**
 * Fon rasmini tanlash va moslash.
 *
 * Rasm serverga yuklanadi (profil fotosi bilan bir xil yo'l), qurilmada esa
 * faqat uning id'si saqlanadi.
 */
const BackgroundPicker: React.FC = () => {
  const theme = useAppTheme();
  const { t } = useI18n();
  const { profile, setProfile } = useContext(AuthContext);
  const { imageId, fit, dim, setImage, clearImage, setFit, setDim } = useBackground();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const token = profile?.jwt;
  const hasImage = imageId.length > 0;
  const previewBlur = Math.round(photoBlur(dim) * PREVIEW_BLUR_SCALE);

  /**
   * Sozlamani HISOBGA saqlaydi.
   *
   * Qurilmadagi nusxani provider o'zi yozadi; bu yerda server yangilanadi,
   * aks holda boshqa telefondan kirilganda eski fon ko'rinardi.
   *
   * Profil nusxasi ham darhol yangilanadi: aks holda ilova qayta
   * ochilgunicha (keyingi /me gacha) eski qiymat qolib ketardi.
   */
  const push = useCallback(
    async (next: { imageId: string; fit: BackgroundFit; dim: number }) => {
      if (!token) return;
      try {
        await updateProfileBackground(next, token);
        setProfile((current) => (current ? { ...current, background: next } : current));
      } catch {
        setError(t('background.saveFailed'));
      }
    },
    [token, setProfile, t],
  );

  const applyImage = (nextId: string) => {
    setImage(nextId);
    void push({ imageId: nextId, fit, dim });
  };

  const applyClear = () => {
    clearImage();
    void push({ imageId: '', fit, dim });
  };

  const applyFit = (next: BackgroundFit) => {
    setFit(next);
    void push({ imageId, fit: next, dim });
  };

  const applyDim = (next: number) => {
    setDim(next);
    void push({ imageId, fit, dim: next });
  };

  const handlePick = async () => {
    if (!token || busy) return;
    setBusy(true);
    setError(null);
    try {
      const picked = await pickAndUploadImage(token);
      if (picked.status === 'ok') applyImage(picked.id);
      else if (picked.status === 'denied') setError(t('background.denied'));
      else if (picked.status === 'error') setError(t('background.error'));
      // 'canceled' — xato emas, jimgina qaytamiz.
    } catch {
      setError(t('background.error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View>
      {/* Sarlavha yo'q: blokni SettingsGroup'ning o'z sarlavhasi nomlaydi,
          ichkarida takrorlansa "Fon rasmi" ketma-ket ikki marta turardi. */}
      <Text style={styles.hint}>{t('background.hint')}</Text>

      {/* Ko'rinish namunasi: xiralik (blur) shu yerda ham qo'llanadi,
          shuning uchun odam tanlashdan oldin natijani ko'ra oladi. Ekrandagi
          fon bilan bir xil primitiv - kattalashtirilmaydi, kesim "Yo'q" dagi
          bilan bir xil, faqat xiralik o'zgaradi. */}
      <View style={styles.preview}>
        {hasImage ? (
          <>
            <BackgroundPhoto
              uri={buildAttachUrl(imageId)}
              fit={fit}
              blur={previewBlur}
              style={StyleSheet.absoluteFill}
            />
            {/* Ilovada matn doim sirt ustida turadi - namunada ham shunday.
                Yalang'och matn yorug' mavzuda to'q rasm ustida ko'rinmasdi. */}
            <SurfaceLabel style={styles.previewLabel} textStyle={styles.previewText}>
              {t('background.title')}
            </SurfaceLabel>
          </>
        ) : (
          <View style={styles.empty}>
            <Ionicons name="image-outline" size={26} color={theme.colors.textSecondary} />
            <Text style={styles.emptyText}>{t('background.none')}</Text>
          </View>
        )}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.primaryBtn, busy && styles.btnDisabled]}
          onPress={handlePick}
          disabled={busy || !token}
          activeOpacity={0.85}
          accessibilityRole="button"
        >
          {busy ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : (
            <Ionicons name="image-outline" size={18} color={theme.colors.primary} />
          )}
          <Text style={styles.primaryLabel}>
            {busy ? t('background.uploading') : hasImage ? t('background.change') : t('background.choose')}
          </Text>
        </TouchableOpacity>

        {hasImage ? (
          <TouchableOpacity
            style={styles.removeBtn}
            onPress={applyClear}
            activeOpacity={0.85}
            accessibilityRole="button"
          >
            <Ionicons name="trash-outline" size={18} color={theme.colors.negative} />
            <Text style={styles.removeLabel}>{t('background.remove')}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {/* Moslash va xiralik faqat rasm bor bo'lganda ma'noga ega. */}
      {hasImage ? (
        <>
          <Text style={styles.groupLabel}>{t('background.fit')}</Text>
          {/* Variantlar - bittasigina tanlanadigan guruh: ekran o'quvchi
              "tugma" emas, "radio, tanlangan" deb aytsin. */}
          <View
            style={styles.optionRow}
            accessibilityRole="radiogroup"
            accessibilityLabel={t('background.fit')}
          >
            {FIT_OPTIONS.map((option) => {
              const active = fit === option.value;
              return (
                <Pressable
                  key={option.value}
                  style={({ pressed }) => [
                    styles.option,
                    active && styles.optionActive,
                    pressed && styles.optionPressed,
                  ]}
                  onPress={() => applyFit(option.value)}
                  accessibilityRole="radio"
                  // aria-checked: react-native-web accessibilityState'ni o'qimaydi
                  // (SettingsRow'dagi kabi), RN esa uni o'zi aylantiradi.
                  aria-checked={active}
                  {...webSpaceSelects(() => applyFit(option.value))}
                >
                  <Ionicons
                    name={option.icon}
                    size={18}
                    color={active ? theme.colors.primary : theme.colors.textSecondary}
                  />
                  <Text style={[styles.optionLabel, active && styles.optionLabelActive]}>
                    {t(option.labelKey)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.groupLabel}>{t('background.dim')}</Text>
          <View
            style={styles.optionRow}
            accessibilityRole="radiogroup"
            accessibilityLabel={t('background.dim')}
          >
            {DIM_LEVELS.map((level) => {
              const active = Math.abs(dim - level.value) < 0.01;
              return (
                <Pressable
                  key={level.labelKey}
                  style={({ pressed }) => [
                    styles.option,
                    active && styles.optionActive,
                    pressed && styles.optionPressed,
                  ]}
                  onPress={() => applyDim(level.value)}
                  accessibilityRole="radio"
                  // aria-checked: react-native-web accessibilityState'ni o'qimaydi
                  // (SettingsRow'dagi kabi), RN esa uni o'zi aylantiradi.
                  aria-checked={active}
                  {...webSpaceSelects(() => applyDim(level.value))}
                >
                  <Text style={[styles.optionLabel, active && styles.optionLabelActive]}>
                    {t(level.labelKey)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}
    </View>
  );
};

const createStyles = ({ colors, radius, spacing, typography }: ThemeValue) =>
  StyleSheet.create({
    // Blokning birinchi qatori: tepa bo'shlig'ini o'rab turgan blok padding'i beradi.
    hint: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    preview: {
      height: 120,
      marginTop: spacing.sm,
      borderRadius: radius.md,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    previewLabel: {
      alignSelf: 'center',
    },
    previewText: {
      ...typography.bodySmall,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    empty: {
      alignItems: 'center',
      gap: spacing.xxs,
    },
    emptyText: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    actions: {
      flexDirection: 'row',
      gap: spacing.xs,
      marginTop: spacing.sm,
    },
    primaryBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xxs,
      paddingVertical: spacing.sm,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
    },
    btnDisabled: {
      opacity: 0.6,
    },
    primaryLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.primary,
    },
    removeBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xxs,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    removeLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.negative,
    },
    error: {
      ...typography.caption,
      marginTop: spacing.xs,
      color: colors.negative,
    },
    groupLabel: {
      ...typography.caption,
      marginTop: spacing.sm,
      marginBottom: spacing.xxs,
      color: colors.textSecondary,
    },
    optionRow: {
      flexDirection: 'row',
      gap: spacing.xs,
    },
    option: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      paddingVertical: spacing.sm,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceMuted,
    },
    optionActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
    },
    optionLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    // TouchableOpacity'dagi activeOpacity bilan bir xil sezgi.
    optionPressed: {
      opacity: 0.85,
    },
    optionLabelActive: {
      color: colors.primary,
    },
  });

export default BackgroundPicker;
