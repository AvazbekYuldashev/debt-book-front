import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../../theme';
import type { ThemeValue } from '../../theme/ThemeProvider';
import { useI18n } from '../../i18n';
import { LEGAL_DOCS, LegalDocKey } from '../../legal/legalContent';

interface Props {
  docKey: LegalDocKey;
}

/** Bitta huquqiy hujjatni (sarlavha + versiya + bo'limlar) skroll qilinadigan holda ko'rsatadi. */
const LegalDocumentView: React.FC<Props> = ({ docKey }) => {
  const { t } = useI18n();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const doc = LEGAL_DOCS[docKey];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{t(doc.titleKey)}</Text>
      <Text style={styles.meta}>
        {t('legal.version')}: {doc.version} · {t('legal.lastUpdated')}: {doc.lastUpdated}
      </Text>
      <Text style={styles.intro}>{doc.intro}</Text>
      {doc.sections.map((section) => (
        <View key={section.heading} style={styles.section}>
          <Text style={styles.heading}>{section.heading}</Text>
          <Text style={styles.body}>{section.body}</Text>
        </View>
      ))}
    </ScrollView>
  );
};

const createStyles = ({ colors, spacing, typography }: ThemeValue) =>
  StyleSheet.create({
    container: {
      padding: spacing.md,
      paddingBottom: spacing.xl,
      backgroundColor: colors.background,
    },
    title: {
      ...typography.heading1,
      fontSize: 24,
      fontWeight: '800',
      color: colors.textPrimary,
      marginBottom: spacing.xxs,
    },
    meta: {
      ...typography.caption,
      color: colors.textSecondary,
      marginBottom: spacing.md,
    },
    intro: {
      ...typography.body,
      color: colors.textPrimary,
      marginBottom: spacing.md,
      lineHeight: 21,
    },
    section: {
      marginBottom: spacing.md,
    },
    heading: {
      ...typography.button,
      fontSize: 15,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: spacing.xxs,
    },
    body: {
      ...typography.body,
      color: colors.textSecondary,
      lineHeight: 21,
    },
  });

export default LegalDocumentView;
