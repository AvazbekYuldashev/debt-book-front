import React, { useContext, useMemo, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../../auth/context/AuthContext';
import { pickAndUploadImage } from '../lib/pickImage';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useBackground } from '../../../shared/theme/BackgroundProvider';
import type { BackgroundFit } from '../../../shared/theme/backgroundSettings';
import { buildAttachUrl } from '../../../shared/lib/attachUrl';
import { useI18n } from '../../../shared/i18n';

/**
 * Xiralik darajalari.
 *
 * Uzluksiz slider o'rniga uchta tayyor daraja: loyihada slider paketi yo'q,
 * uni qo'shish esa shu bitta sozlama uchun ortiqcha. Uchta daraja amalda
 * yetarli — odam aniq foizni emas, "matn o'qilyaptimi" ni tanlaydi.
 */
const DIM_LEVELS: { value: number; labelKey: string }[] = [
  { value: 0.3, labelKey: 'background.dimLow' },
  { value: 0.55, labelKey: 'background.dimMid' },
  { value: 0.8, labelKey: 'background.dimHigh' },
];

const FIT_OPTIONS: { value: BackgroundFit; icon: keyof typeof Ionicons.glyphMap; labelKey: string }[] = [
  { value: 'cover', icon: 'expand-outline', labelKey: 'background.fitCover' },
  { value: 'contain', icon: 'scan-outline', labelKey: 'background.fitContain' },
];

/**
 * Fon rasmini tanlash va moslash.
 *
 * Rasm serverga yuklanadi (profil fotosi bilan bir xil yo'l), qurilmada esa
 * faqat uning id'si saqlanadi.
 */
const BackgroundPicker: React.FC = () => {
  const theme = useAppTheme();
  const { t } = useI18n();
  const { profile } = useContext(AuthContext);
  const { imageId, fit, dim, setImage, clearImage, setFit, setDim } = useBackground();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const token = profile?.jwt;
  const hasImage = imageId.length > 0;

  const handlePick = async () => {
    if (!token || busy) return;
    setBusy(true);
    setError(null);
    try {
      const picked = await pickAndUploadImage(token);
      if (picked.status === 'ok') setImage(picked.id);
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
      <Text style={styles.title}>{t('background.title')}</Text>
      <Text style={styles.hint}>{t('background.hint')}</Text>

      {/* Ko'rinish namunasi: xiralik pardasi ham shu yerda qo'llanadi, shuning
          uchun odam tanlashdan oldin matn o'qilishini ko'ra oladi. */}
      <View style={styles.preview}>
        {hasImage ? (
          <>
            <Image
              source={{ uri: buildAttachUrl(imageId) }}
              style={StyleSheet.absoluteFill}
              resizeMode={fit}
              accessibilityIgnoresInvertColors
            />
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: theme.colors.background, opacity: dim },
              ]}
            />
            <Text style={styles.previewText}>{t('background.title')}</Text>
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
            onPress={clearImage}
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
          <View style={styles.optionRow}>
            {FIT_OPTIONS.map((option) => {
              const active = fit === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.option, active && styles.optionActive]}
                  onPress={() => setFit(option.value)}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                >
                  <Ionicons
                    name={option.icon}
                    size={18}
                    color={active ? theme.colors.primary : theme.colors.textSecondary}
                  />
                  <Text style={[styles.optionLabel, active && styles.optionLabelActive]}>
                    {t(option.labelKey)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.groupLabel}>{t('background.dim')}</Text>
          <View style={styles.optionRow}>
            {DIM_LEVELS.map((level) => {
              const active = Math.abs(dim - level.value) < 0.01;
              return (
                <TouchableOpacity
                  key={level.labelKey}
                  style={[styles.option, active && styles.optionActive]}
                  onPress={() => setDim(level.value)}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                >
                  <Text style={[styles.optionLabel, active && styles.optionLabelActive]}>
                    {t(level.labelKey)}
                  </Text>
                </TouchableOpacity>
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
    title: {
      ...typography.bodySmall,
      fontSize: 15,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    hint: {
      ...typography.caption,
      marginTop: spacing.xxs,
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
    optionLabelActive: {
      color: colors.primary,
    },
  });

export default BackgroundPicker;
