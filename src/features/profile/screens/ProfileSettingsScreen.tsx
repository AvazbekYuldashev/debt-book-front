import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import AmbientBackground from '../../../shared/ui/AmbientBackground';
import ScreenHeader from '../../../shared/ui/ScreenHeader';
import SettingsGroup from '../../../shared/ui/SettingsGroup';
import SettingsRow from '../../../shared/ui/SettingsRow';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useAccent } from '../../../shared/theme/AccentProvider';
import { useTransparency } from '../../../shared/theme/TransparencyProvider';
import { TRANSPARENCY_LEVELS } from '../../../shared/theme/transparency';
import { ACCENTS } from '../../../shared/theme/accent';
import { useI18n } from '../../../shared/i18n';
import { ROUTES } from '../../../app/navigation/routes';
import type { ProfileScreenProps } from '../../../app/navigation/types';
import type { ThemeMode } from '../../../shared/theme/ThemeProvider';
import BackgroundPicker from '../components/BackgroundPicker';
import { updateProfileAccent, updateProfileGlass } from '../api/profile';
import { AuthContext } from '../../auth/context/AuthContext';

const THEME_MODES: { mode: ThemeMode; labelKey: string }[] = [
  { mode: 'light', labelKey: 'profile.themeLight' },
  { mode: 'dark', labelKey: 'profile.themeDark' },
  { mode: 'system', labelKey: 'profile.themeSystem' },
];

/**
 * Sozlamalar: til, ko'rinish va huquqiy hujjatlar.
 *
 * GURUHLANGAN RO'YXAT. Ilgari har bo'lim o'z kartasida, ichida esa
 * yonma-yon tugmalar turardi: uchta til bir qatorda, uchta mavzu bir
 * qatorda, oltita rang bir qatorda. Tanlovlar ko'paygani sayin ular
 * siqilib, nomlari kesila boshladi va har bo'lim o'zicha boshqacha
 * ko'rinardi.
 *
 * Endi hammasi bitta qolipda: chapda nomi, o'ngda holati. Tanlov
 * ro'yxatlari tik yoziladi - joy chegarasi yo'q, yangi til yoki rang
 * qo'shish qatorni buzmaydi.
 */
const ProfileSettingsScreen: React.FC<ProfileScreenProps<typeof ROUTES.PROFILE_SETTINGS>> = ({
  navigation,
}) => {
  const theme = useAppTheme();
  const { mode, setMode, activeTheme } = theme;
  const { t, lang, setLang, langs } = useI18n();
  const { accent, setAccent } = useAccent();
  const { level, setLevel } = useTransparency();
  const { profile, setProfile } = React.useContext(AuthContext);
  const styles = useMemo(() => createStyles(theme), [theme]);

  const isDark = activeTheme === 'dark';
  const token = profile?.jwt;

  /**
   * Rang DARHOL qo'llanadi, server javobi kutilmaydi: ko'rinish
   * sozlamasining kechikishi sezilib turardi. Xato bo'lsa faqat boshqa
   * qurilmada saqlanmaydi, shu yerda esa ishlaydi.
   */
  const chooseAccent = (id: string) => {
    setAccent(id);
    if (!token) return;
    void updateProfileAccent(id, token)
      .then(() => setProfile((current) => (current ? { ...current, accent: id } : current)))
      .catch(() => undefined);
  };

  /** Shaffoflik ham darhol qo'llanadi - rang bilan bir xil naqsh. */
  const chooseGlass = (id: typeof TRANSPARENCY_LEVELS[number]['id']) => {
    setLevel(id);
    if (!token) return;
    void updateProfileGlass(id, token)
      .then(() => setProfile((current) => (current ? { ...current, glassLevel: id } : current)))
      .catch(() => undefined);
  };

  return (
    <View style={styles.container}>
      {/* Dekorativ fon — barcha ekranlarda bir xil "imzo" qatlami. */}
      <AmbientBackground />
      <ScreenHeader title={t('profile.settings')} onBack={navigation.goBack} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SettingsGroup title={t('lang.title')}>
          {langs.map((item, index) => (
            <SettingsRow
              key={item.code}
              label={t(`lang.${item.code.toLowerCase()}`)}
              selected={item.code === lang}
              onPress={() => setLang(item.code)}
              isLast={index === langs.length - 1}
            />
          ))}
        </SettingsGroup>

        <SettingsGroup title={t('profile.theme')}>
          {THEME_MODES.map((item, index) => (
            <SettingsRow
              key={item.mode}
              label={t(item.labelKey)}
              selected={item.mode === mode}
              onPress={() => setMode(item.mode)}
              isLast={index === THEME_MODES.length - 1}
            />
          ))}
        </SettingsGroup>

        {/* Rang mavzudan KEYIN: avval yorug'/qorong'i tanlanadi, keyin
            brand rangi - namuna darhol to'g'ri tusda ko'rinadi. */}
        <SettingsGroup title={t('accent.title')}>
          {ACCENTS.map((item, index) => (
            <SettingsRow
              key={item.id}
              label={t(item.labelKey)}
              dot={(isDark ? item.dark : item.light).primary}
              selected={item.id === accent}
              onPress={() => chooseAccent(item.id)}
              isLast={index === ACCENTS.length - 1}
            />
          ))}
        </SettingsGroup>

        {/* Shaffoflik rangdan keyin: ikkovi ham ko'rinish sozlamasi va
            natijasi darhol ekranda ko'rinadi. */}
        <SettingsGroup title={t('glass.title')}>
          {TRANSPARENCY_LEVELS.map((item, index) => (
            <SettingsRow
              key={item.id}
              label={t(item.labelKey)}
              selected={item.id === level}
              onPress={() => chooseGlass(item.id)}
              isLast={index === TRANSPARENCY_LEVELS.length - 1}
            />
          ))}
          {/* Mavzu tanlovida "Yorug'" belgilangan-u ekran qorong'i bo'lsa,
              bu xato bo'lib ko'rinardi. Sababi shu yerda aytiladi. */}
          {theme.photoAdapted ? <Text style={styles.note}>{t('glass.adapted')}</Text> : null}
        </SettingsGroup>

        {/* Fon rasmi guruh qolipiga tushmaydi: unda namuna, yuklash
            tugmasi va ikkita sozlama bor - bu qator emas, blok. */}
        <SettingsGroup title={t('background.title')}>
          <View style={styles.block}>
            <BackgroundPicker />
          </View>
        </SettingsGroup>

        <SettingsGroup title={t('legal.groupTitle')}>
          <SettingsRow
            label={t('legal.offerTitle')}
            icon="document-text-outline"
            onPress={() => navigation.navigate(ROUTES.OFFER)}
          />
          <SettingsRow
            label={t('legal.termsTitle')}
            icon="reader-outline"
            onPress={() => navigation.navigate(ROUTES.TERMS)}
          />
          <SettingsRow
            label={t('legal.privacyTitle')}
            icon="lock-closed-outline"
            onPress={() => navigation.navigate(ROUTES.PRIVACY_POLICY)}
            isLast
          />
        </SettingsGroup>
      </ScrollView>
    </View>
  );
};

const createStyles = ({ colors, spacing, typography }: ThemeValue) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    content: {
      padding: spacing.md,
      paddingBottom: spacing.xxl,
    },
    block: {
      padding: spacing.md,
    },
    note: {
      ...typography.caption,
      color: colors.textSecondary,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.xs,
      paddingBottom: spacing.sm,
    },
  });

export default ProfileSettingsScreen;
