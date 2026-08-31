import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import ScreenHeader from '../../../shared/ui/ScreenHeader';
import Card from '../../../shared/ui/Card';
import LanguageSwitcher from '../../../shared/ui/LanguageSwitcher';
import ThemeSwitcher from '../../../shared/ui/ThemeSwitcher';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import { ROUTES } from '../../../app/navigation/routes';
import type { ProfileScreenProps } from '../../../app/navigation/types';
import LegalMenuRow from '../components/LegalMenuRow';

/**
 * Sozlamalar: til, mavzu va huquqiy hujjatlar.
 *
 * Uchtasi ham hisobga emas, ilovaga tegishli — shuning uchun profil
 * ma'lumotlarini tahrirlashdan alohida ekranda turadi.
 */
const ProfileSettingsScreen: React.FC<ProfileScreenProps<typeof ROUTES.PROFILE_SETTINGS>> = ({
  navigation,
}) => {
  const theme = useAppTheme();
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('profile.settings')} onBack={navigation.goBack} />

      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>{t('profile.language')}</Text>
          <LanguageSwitcher />
        </Card>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>{t('profile.theme')}</Text>
          <ThemeSwitcher />
        </Card>

        <Card style={styles.card}>
          <LegalMenuRow
            label={t('legal.offerTitle')}
            iconName="document-text-outline"
            onPress={() => navigation.navigate(ROUTES.OFFER)}
          />
          <LegalMenuRow
            label={t('legal.termsTitle')}
            iconName="reader-outline"
            onPress={() => navigation.navigate(ROUTES.TERMS)}
          />
          <LegalMenuRow
            label={t('legal.privacyTitle')}
            iconName="lock-closed-outline"
            isLast
            onPress={() => navigation.navigate(ROUTES.PRIVACY_POLICY)}
          />
        </Card>

        <Card style={styles.card}>
          <LegalMenuRow
            label={t('about.title')}
            iconName="information-circle-outline"
            isLast
            onPress={() => navigation.navigate(ROUTES.ABOUT_APP)}
          />
        </Card>
      </ScrollView>
    </View>
  );
};

const createStyles = ({ colors, spacing, typography }: ThemeValue) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: spacing.md,
      paddingBottom: spacing.xxl,
      gap: spacing.sm,
    },
    card: {
      gap: spacing.xs,
    },
    cardTitle: {
      ...typography.caption,
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
    },
  });

export default ProfileSettingsScreen;
