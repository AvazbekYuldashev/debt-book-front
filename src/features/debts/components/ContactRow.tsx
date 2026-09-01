import React, { memo, useCallback, useContext, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import UserAvatar from '../../../shared/ui/UserAvatar';
import IconButton from '../../../shared/ui/IconButton';
import { formatMoney } from '../../../shared/lib/money';
import type { CurrencyNet } from '../../../shared/lib/currency';
import type { Contact } from '../context/ContactsContext';
import { CurrencyContext } from '../context/CurrencyContext';

const AVATAR_SIZE = 46;

interface ContactRowProps {
  contact: Contact;
  /** Har valyuta bo'yicha mustaqil sof balanslar; undefined = hali yuklanmagan. */
  balances: CurrencyNet[] | undefined;
  /** Shu kontaktdan kelgan o'qilmagan bildirishnomalar soni (Telegram uslubidagi badge). */
  unreadCount: number;
  totalsLoading: boolean;
  localPhoto?: string;
  canEdit: boolean;
  isLast: boolean;
  onPress: (id: string) => void;
  onEdit: (id: string) => void;
  /** Avatarga bosilganda biriktirilgan rasmni to'liq ekranda ko'rsatadi. */
  onViewPhoto: (avatarKey: string) => void;
}

/**
 * Ro'yxatdagi bitta mijoz qatori.
 *
 * O'ngda mijozning BARCHA valyutalardagi qoldig'i: har biri o'z qatorida,
 * bergani yashil, olgani qizil. Qaysi valyutada qancha qolganini bilish
 * uchun mijozni ochish shart emas.
 *
 * Valyutalar bir-biriga QO'SHILMAYDI: dollarni bugungi kurs bo'yicha
 * so'mga aylantirish qarzning haqiqiy ma'nosini buzadi. Shu sababli
 * ular alohida qatorlarda turadi, yig'indi ko'rsatilmaydi.
 */
const ContactRow: React.FC<ContactRowProps> = ({
  contact,
  balances,
  unreadCount,
  totalsLoading,
  localPhoto,
  canEdit,
  isLast,
  onPress,
  onEdit,
  onViewPhoto,
}) => {
  const theme = useAppTheme();
  const { colors } = theme;
  const { t } = useI18n();
  const { baseCurrency, toBase } = useContext(CurrencyContext);
  const styles = useMemo(() => createStyles(theme), [theme]);

  const avatarKey = contact.partyId || contact.id;

  const handlePress = useCallback(() => onPress(contact.id), [onPress, contact.id]);
  const handleEdit = useCallback(() => onEdit(contact.id), [onEdit, contact.id]);
  const handleViewPhoto = useCallback(() => onViewPhoto(avatarKey), [onViewPhoto, avatarKey]);

  const isBusiness = contact.partyType === 'BUSINESS_ACCOUNT';
  // Biznes mijozda telefon yo'q. Ilgari uning o'rniga UUID chiqardi — endi
  // shunchaki "Biznes" deb belgilanadi, to'liq id mijoz kartasida.
  const secondaryLabel = isBusiness ? t('debts.businessLabel') : contact.phone || '';

  /**
   * Tartib: avval asosiy valyuta, keyin QIYMATI bo'yicha kamayish tartibida.
   *
   * Solishtirish uchun kursga aylantiriladi, lekin EKRANDA har summa o'z
   * valyutasida qoladi. Xom raqamlarni solishtirsak 20 000 rubl 1 000
   * dollardan "katta" bo'lib chiqardi.
   */
  const rows = useMemo(() => {
    const items = [...(balances ?? [])];
    items.sort((a, b) => {
      if (a.currency === baseCurrency) return -1;
      if (b.currency === baseCurrency) return 1;
      return Math.abs(toBase(b.amount, b.currency)) - Math.abs(toBase(a.amount, a.currency));
    });
    return items;
  }, [balances, baseCurrency, toBase]);

  return (
    <View style={[styles.row, !isLast && styles.rowBorder]}>
      <Pressable
        style={({ pressed }) => [styles.main, pressed && styles.mainPressed]}
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={contact.fullName}
      >
        {/* Rasm biriktirilgan bo'lsa avatar bosiladi va rasm to'liq ekranda ochiladi;
            rasm bo'lmasa bosish qatorning o'ziga (mijozni ochishga) o'tadi. */}
        {localPhoto ? (
          <Pressable
            onPress={handleViewPhoto}
            accessibilityRole="button"
            accessibilityLabel={t('contact.viewPhoto')}
            hitSlop={6}
          >
            <UserAvatar uri={localPhoto} size={AVATAR_SIZE} />
            {unreadCount > 0 ? (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
              </View>
            ) : null}
          </Pressable>
        ) : (
          <View>
            <UserAvatar uri={undefined} size={AVATAR_SIZE} />
            {unreadCount > 0 ? (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
              </View>
            ) : null}
          </View>
        )}
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {contact.fullName}
          </Text>
          {isBusiness ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{secondaryLabel}</Text>
            </View>
          ) : secondaryLabel ? (
            <Text style={styles.secondary} numberOfLines={1}>
              {secondaryLabel}
            </Text>
          ) : null}
        </View>
      </Pressable>

      <View style={styles.right}>
        {/* Summalar bloki ham mijozni ochadi — ism/avatar bilan bir xil (onPress). */}
        <Pressable
          style={({ pressed }) => [styles.amounts, pressed && styles.mainPressed]}
          onPress={handlePress}
          accessibilityRole="button"
          accessibilityLabel={contact.fullName}
        >
          {balances === undefined ? (
            <Text style={styles.amountMuted}>{totalsLoading ? '…' : '--'}</Text>
          ) : rows.length === 0 ? (
            <Text style={styles.amountMuted}>{formatMoney(0)}</Text>
          ) : (
            rows.map((row) => (
              <Text
                key={row.currency}
                style={[
                  styles.amount,
                  { color: row.amount > 0 ? colors.positive : colors.negative },
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {row.amount > 0 ? '+' : ''}
                {formatMoney(row.amount, row.currency)}
              </Text>
            ))
          )}
        </Pressable>
        {canEdit ? (
          <IconButton
            name="pencil"
            onPress={handleEdit}
            accessibilityLabel={t('common.edit')}
          />
        ) : null}
      </View>
    </View>
  );
};

const createStyles = ({ colors, spacing, radius, typography }: ThemeValue) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm,
      gap: spacing.xs,
    },
    rowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    main: {
      flex: 1,
      minWidth: 0,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderRadius: radius.md,
    },
    mainPressed: {
      opacity: 0.6,
    },
    info: {
      flex: 1,
      minWidth: 0,
    },
    name: {
      ...typography.label,
      fontSize: 15,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    secondary: {
      ...typography.caption,
      marginTop: spacing.xxs / 2,
      fontSize: 13,
      color: colors.textSecondary,
      flexShrink: 1,
    },
    // "Biznes" belgisi — UUID o'rniga. Kichik, past kontrastli: qatorda
    // ism eng muhim element bo'lib qolishi kerak.
    badge: {
      alignSelf: 'flex-start',
      marginTop: spacing.xxs / 2,
      paddingHorizontal: spacing.xs,
      paddingVertical: 1,
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceMuted,
    },
    badgeText: {
      ...typography.caption,
      fontSize: 11,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    // Summalar (fonsiz, o'ngga tekis) va tahrir tugmasi YONMA-YON, vertikal
    // markazda — qator bo'yi avatar balandligidan oshmaydi, o'ng chet tekis.
    right: {
      flexDirection: 'row',
      alignItems: 'center',
      // Summa bilan tugma orasi tor: ular bitta guruh bo'lib ko'rinsin.
      gap: spacing.xxs,
      // Summa qanchalik katta bo'lmasin, qator enining shuncha ulushidan oshmaydi —
      // qolgan joy mijoz ismiga tegishli (ism summadan muhimroq).
      maxWidth: '55%',
      flexShrink: 1,
    },
    amounts: {
      alignItems: 'flex-end',
      minWidth: 0,
      flexShrink: 1,
      gap: 1,
    },
    // Bir nechta valyuta ustma-ust turadi — qator oralig'i tor, aks holda
    // ikki valyutali mijoz qatori qo'shnisidan ikki barobar baland bo'lardi.
    amount: {
      ...typography.caption,
      fontSize: 13,
      lineHeight: 16,
      fontWeight: '800',
      fontVariant: ['tabular-nums'],
    },
    amountMuted: {
      ...typography.caption,
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 1,
    },

    // Telegram uslubidagi o'qilmaganlar soni — avatar burchagida.
    unreadBadge: {
      position: 'absolute',
      top: -3,
      right: -3,
      minWidth: 18,
      height: 18,
      borderRadius: radius.pill,
      paddingHorizontal: 4,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      borderWidth: 1.5,
      borderColor: colors.surface,
    },
    unreadBadgeText: {
      ...typography.caption,
      fontSize: 10,
      fontWeight: '800',
      color: colors.textOnPrimary,
    },
  });

export default memo(ContactRow);
