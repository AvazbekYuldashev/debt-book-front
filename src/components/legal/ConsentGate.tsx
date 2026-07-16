import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../theme';
import type { ThemeValue } from '../../theme/ThemeProvider';
import { useI18n } from '../../i18n';
import { getAcceptedConsentVersion, setConsentAccepted, LEGAL_CONSENT_VERSION } from '../../legal/consentStorage';
import LegalDocumentView from './LegalDocumentView';
import type { LegalDocKey } from '../../legal/legalContent';

interface CheckboxRowProps {
  checked: boolean;
  label: string;
  readLabel: string;
  onToggle: () => void;
  onReadMore: () => void;
}

const CheckboxRow: React.FC<CheckboxRowProps> = ({ checked, label, readLabel, onToggle, onReadMore }) => {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={styles.checkboxRow}>
      <Pressable
        onPress={onToggle}
        style={styles.checkboxTouch}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
      >
        <Ionicons
          name={checked ? 'checkbox' : 'square-outline'}
          size={22}
          color={checked ? theme.colors.primary : theme.colors.textSecondary}
        />
        <Text style={styles.checkboxLabel}>{label}</Text>
      </Pressable>
      <Pressable onPress={onReadMore} hitSlop={8}>
        <Text style={styles.readLink}>{readLabel}</Text>
      </Pressable>
    </View>
  );
};

/**
 * Foydalanuvchi tizimga kirgach, Foydalanish shartlari va Maxfiylik siyosatiga roziligini
 * so'raydigan to'siq (gate). Faqat ikkalasi ham belgilanganda davom etish mumkin.
 * Rozilik AsyncStorage'da versiya bilan saqlanadi — versiya oshsa, qayta so'raladi.
 */
const ConsentGate: React.FC = () => {
  const { t } = useI18n();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [loading, setLoading] = useState(true);
  const [accepted, setAccepted] = useState(false);
  const [termsChecked, setTermsChecked] = useState(false);
  const [privacyChecked, setPrivacyChecked] = useState(false);
  const [showError, setShowError] = useState(false);
  const [readingDoc, setReadingDoc] = useState<LegalDocKey | null>(null);

  useEffect(() => {
    getAcceptedConsentVersion().then((version) => {
      setAccepted(version === LEGAL_CONSENT_VERSION);
      setLoading(false);
    });
  }, []);

  const handleContinue = async () => {
    if (!termsChecked || !privacyChecked) {
      setShowError(true);
      return;
    }
    await setConsentAccepted();
    setAccepted(true);
  };

  if (loading || accepted) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => {}}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{t('consent.title')}</Text>
          <Text style={styles.intro}>{t('consent.intro')}</Text>

          <CheckboxRow
            checked={termsChecked}
            label={t('consent.termsCheckboxLabel')}
            readLabel={t('consent.readLink')}
            onToggle={() => setTermsChecked((v) => !v)}
            onReadMore={() => setReadingDoc('terms')}
          />
          <CheckboxRow
            checked={privacyChecked}
            label={t('consent.privacyCheckboxLabel')}
            readLabel={t('consent.readLink')}
            onToggle={() => setPrivacyChecked((v) => !v)}
            onReadMore={() => setReadingDoc('privacy')}
          />

          {showError && (!termsChecked || !privacyChecked) ? (
            <Text style={styles.errorText}>{t('consent.mustAcceptBoth')}</Text>
          ) : null}

          <Pressable
            onPress={handleContinue}
            style={({ pressed }) => [
              styles.continueBtn,
              (!termsChecked || !privacyChecked) && styles.continueBtnDisabled,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
          >
            <Text style={styles.continueBtnText}>{t('consent.continueButton')}</Text>
          </Pressable>
        </View>
      </View>

      <Modal visible={readingDoc !== null} animationType="slide" onRequestClose={() => setReadingDoc(null)}>
        <View style={styles.readModalHeader}>
          <Pressable onPress={() => setReadingDoc(null)} hitSlop={8}>
            <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
          </Pressable>
        </View>
        <ScrollView>{readingDoc ? <LegalDocumentView docKey={readingDoc} /> : null}</ScrollView>
      </Modal>
    </Modal>
  );
};

const createStyles = ({ colors, spacing, radius, typography }: ThemeValue) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.md,
    },
    card: {
      width: '100%',
      maxWidth: 420,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.md,
    },
    title: {
      ...typography.heading2,
      fontSize: 19,
      fontWeight: '800',
      color: colors.textPrimary,
      marginBottom: spacing.xs,
    },
    intro: {
      ...typography.bodySmall,
      color: colors.textSecondary,
      marginBottom: spacing.md,
      lineHeight: 19,
    },
    checkboxRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: spacing.sm,
      gap: spacing.xs,
    },
    checkboxTouch: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      flex: 1,
      gap: spacing.xs,
    },
    checkboxLabel: {
      ...typography.bodySmall,
      color: colors.textPrimary,
      flex: 1,
      lineHeight: 19,
    },
    readLink: {
      ...typography.bodySmall,
      color: colors.primary,
      fontWeight: '700',
      marginTop: 2,
    },
    errorText: {
      ...typography.caption,
      color: colors.danger,
      marginBottom: spacing.sm,
    },
    continueBtn: {
      marginTop: spacing.xs,
      borderRadius: radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.sm,
      backgroundColor: colors.primary,
    },
    continueBtnDisabled: {
      opacity: 0.5,
    },
    continueBtnText: {
      ...typography.label,
      color: colors.textOnPrimary,
      fontWeight: '700',
      fontSize: 14,
    },
    pressed: {
      opacity: 0.85,
    },
    readModalHeader: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      padding: spacing.md,
      backgroundColor: colors.background,
    },
  });

export default ConsentGate;
