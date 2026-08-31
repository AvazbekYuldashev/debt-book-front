import React, { useCallback, useMemo } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenHeader from '../../../shared/ui/ScreenHeader';
import Card from '../../../shared/ui/Card';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import { APP_VERSION_CODE } from '../../../shared/appVersion';
import { ROUTES } from '../../../app/navigation/routes';
import type { ProfileScreenProps } from '../../../app/navigation/types';
import {
  APP_CERTIFICATE,
  APP_CREDITS,
  contactUrl,
  type ContactKind,
  type CreditContact,
} from '../model/appCredits';

const CONTACT_ICON: Record<ContactKind, React.ComponentProps<typeof Ionicons>['name']> = {
  phone: 'call-outline',
  telegram: 'paper-plane-outline',
  email: 'mail-outline',
};

/**
 * "Dastur haqida": mualliflar, ular bilan bog'lanish va rasmiy guvohnoma.
 *
 * Ma'lumotlar `appCredits.ts` dan o'qiladi — bu ekran faqat chizadi. Aloqa
 * ma'lumoti kiritilmagan odamda tugma umuman chiqmaydi: bosilganda hech narsa
 * qilmaydigan "bog'lanish" tugmasi bo'lmaganidan yomonroq.
 */
const AboutAppScreen: React.FC<ProfileScreenProps<typeof ROUTES.ABOUT_APP>> = ({ navigation }) => {
  const theme = useAppTheme();
  const { colors } = theme;
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const openContact = useCallback((contact: CreditContact) => {
    Linking.openURL(contactUrl(contact)).catch(() => {
      // Telefon/Telegram/pochta ilovasi yo'q bo'lsa — jim o'tamiz, xato ko'rsatmaymiz.
    });
  }, []);

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('about.title')} onBack={navigation.goBack} />

      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.appCard}>
          <Text style={styles.appName}>{APP_CERTIFICATE.programName}</Text>
          <Text style={styles.appVersion}>
            {t('about.version', { version: String(APP_VERSION_CODE) })}
          </Text>
        </Card>

        <Text style={styles.sectionTitle}>{t('about.teamSection')}</Text>

        {APP_CREDITS.map((person) => (
          <Card key={person.roleKey} style={styles.card}>
            <Text style={styles.role}>{t(person.roleKey)}</Text>
            <Text style={styles.name}>{person.shortName}</Text>
            <Text style={styles.fullName}>{person.fullName}</Text>

            {person.contacts.length > 0 ? (
              <View style={styles.contacts}>
                {person.contacts.map((contact) => (
                  <Pressable
                    key={`${contact.kind}:${contact.value}`}
                    onPress={() => openContact(contact)}
                    style={({ pressed }) => [styles.contactBtn, pressed && styles.pressed]}
                    accessibilityRole="button"
                    accessibilityLabel={`${t('about.contact')}: ${contact.value}`}
                  >
                    <Ionicons name={CONTACT_ICON[contact.kind]} size={16} color={colors.primary} />
                    <Text style={styles.contactText} numberOfLines={1}>
                      {contact.value}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </Card>
        ))}

        <Text style={styles.sectionTitle}>{t('about.documentsSection')}</Text>

        <Card style={styles.card}>
          <Row label={t('about.certificate')} value={APP_CERTIFICATE.number} styles={styles} />
          <Row
            label={t('about.applicationNumber')}
            value={APP_CERTIFICATE.applicationNumber}
            styles={styles}
          />
          <Row
            label={t('about.applicationDate')}
            value={APP_CERTIFICATE.applicationDate}
            styles={styles}
          />
          <Row
            label={t('about.registeredDate')}
            value={APP_CERTIFICATE.registeredDate}
            styles={styles}
          />
          <Row label={t('about.authority')} value={APP_CERTIFICATE.authority} styles={styles} />

          <Text style={styles.holdersLabel}>{t('about.rightsHolders')}</Text>
          {APP_CERTIFICATE.rightsHolders.map((holder) => (
            <Text key={holder} style={styles.holder}>
              {'•'} {holder}
            </Text>
          ))}
        </Card>
      </ScrollView>
    </View>
  );
};

interface RowProps {
  label: string;
  value: string;
  styles: ReturnType<typeof createStyles>;
}

const Row: React.FC<RowProps> = ({ label, value, styles }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.rowValue}>{value}</Text>
  </View>
);

const createStyles = ({ colors, spacing, radius, typography }: ThemeValue) =>
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
    appCard: {
      alignItems: 'center',
      gap: spacing.xxs,
    },
    card: {
      gap: spacing.xxs,
    },
    appName: {
      ...typography.heading2,
      color: colors.textPrimary,
    },
    appVersion: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    sectionTitle: {
      ...typography.label,
      fontWeight: '700',
      color: colors.textSecondary,
      marginTop: spacing.xs,
      marginLeft: spacing.xxs,
    },
    role: {
      ...typography.caption,
      fontWeight: '700',
      color: colors.primary,
    },
    name: {
      ...typography.body,
      fontSize: 17,
      lineHeight: 24,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    fullName: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    contacts: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
      marginTop: spacing.xs,
    },
    contactBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xxs + 2,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.pill,
      backgroundColor: colors.primarySoft,
    },
    pressed: {
      opacity: 0.6,
    },
    contactText: {
      ...typography.label,
      fontWeight: '700',
      color: colors.primary,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: spacing.sm,
      paddingVertical: spacing.xxs,
    },
    rowLabel: {
      ...typography.caption,
      color: colors.textSecondary,
      flexShrink: 1,
    },
    rowValue: {
      ...typography.caption,
      fontWeight: '700',
      color: colors.textPrimary,
      textAlign: 'right',
      flexShrink: 1,
      maxWidth: '62%',
    },
    holdersLabel: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: spacing.xs,
    },
    holder: {
      ...typography.caption,
      color: colors.textPrimary,
      marginTop: spacing.xxs / 2,
    },
  });

export default AboutAppScreen;
