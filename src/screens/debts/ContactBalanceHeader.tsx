import React, { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../theme';
import type { ThemeValue } from '../../theme/ThemeProvider';
import { useI18n } from '../../i18n';
import UserAvatar from '../../shared/ui/UserAvatar';
import { formatMoney } from '../../utils/money';
import type { CurrencyNet } from '../../utils/currency';
import type { Contact } from '../../context/ContactsContext';

const AVATAR_SIZE = 52;

interface ContactBalanceHeaderProps {
  contact: Contact;
  /** Har valyuta bo'yicha mustaqil sof balanslar (musbat = haq, manfiy = qarz). */
  balances: CurrencyNet[];
  avatarUri?: string;
  onBack: () => void;
  onAvatarPress: () => void;
}

/**
 * Kontakt detali ekranining tepasi: orqaga tugma, avatar/ism/telefon va joriy
 * balanslar — HAR VALYUTA ALOHIDA qatorda (so'm/dollar aralashtirilmaydi).
 */
const ContactBalanceHeader: React.FC<ContactBalanceHeaderProps> = ({
  contact,
  balances,
  avatarUri,
  onBack,
  onAvatarPress,
}) => {
  const theme = useAppTheme();
  const { colors } = theme;
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.wrap}>
      <View style={styles.topBar}>
        <Pressable
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel={t('common.cancel')}
          hitSlop={6}
        >
          <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
        </Pressable>
      </View>

      <View style={styles.card}>
        <View style={styles.header}>
          <Pressable
            onPress={onAvatarPress}
            accessibilityRole="button"
            accessibilityLabel={t('contact.changePhoto')}
          >
            <UserAvatar uri={avatarUri} size={AVATAR_SIZE} />
          </Pressable>
          <View style={styles.headerInfo}>
            <Text style={styles.name} numberOfLines={1}>
              {contact.fullName}
            </Text>
            <Text style={styles.phone} numberOfLines={1}>
              {contact.phone}
            </Text>
          </View>
        </View>

        <Text style={styles.balanceLabel}>{t('contact.currentBalance')}</Text>
        {balances.length === 0 ? (
          <Text
            style={[styles.balanceValue, { color: colors.textSecondary }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.5}
          >
            {formatMoney(0)}
          </Text>
        ) : (
          balances.map(({ currency, amount }) => (
            <Text
              key={currency}
              style={[
                styles.balanceValue,
                balances.length > 1 && styles.balanceValueCompact,
                { color: amount >= 0 ? colors.positive : colors.negative },
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.5}
            >
              {formatMoney(amount, currency)}
            </Text>
          ))
        )}
      </View>
    </View>
  );
};

const createStyles = ({ colors, spacing, radius, typography }: ThemeValue) =>
  StyleSheet.create({
    wrap: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
    },
    topBar: {
      marginBottom: spacing.xs,
    },
    backButton: {
      width: 32,
      height: 32,
      borderRadius: radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    pressed: {
      opacity: 0.6,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      padding: spacing.md + 2,
      marginBottom: spacing.md,
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.14,
      shadowRadius: 22,
      elevation: 8,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    headerInfo: {
      flex: 1,
    },
    name: {
      ...typography.heading2,
      fontSize: 18,
      color: colors.textPrimary,
    },
    phone: {
      ...typography.caption,
      marginTop: spacing.xxs / 2,
      fontSize: 13,
      color: colors.textSecondary,
    },
    balanceLabel: {
      ...typography.caption,
      marginTop: spacing.sm,
      color: colors.textSecondary,
    },
    balanceValue: {
      ...typography.heading1,
      marginTop: spacing.xxs + 2,
      fontSize: 36,
      fontWeight: '800',
      letterSpacing: -1,
    },
    // Ikki va undan ko'p valyuta ko'rsatilganda qatorlar ixchamroq.
    balanceValueCompact: {
      fontSize: 28,
      lineHeight: 34,
      marginTop: spacing.xxs,
    },
  });

export default memo(ContactBalanceHeader);
