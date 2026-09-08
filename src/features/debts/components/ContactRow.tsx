import React, { memo, useCallback, useContext, useMemo, useState } from 'react';
import { LayoutChangeEvent, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import UserAvatar from '../../../shared/ui/UserAvatar';
import IconButton from '../../../shared/ui/IconButton';
import BalanceBadge from '../../../shared/ui/BalanceBadge';
import { formatMoney, formatSignedMoney } from '../../../shared/lib/money';
import type { CurrencyNet } from '../../../shared/lib/currency';
import type { Contact } from '../context/ContactsContext';
import { CurrencyContext } from '../context/CurrencyContext';

const AVATAR_SIZE = 44;

const AMOUNT_FONT_MAX = 14;
const AMOUNT_FONT_MIN = 11;
// Qalin, tabular-nums summa satri uchun o'rtacha belgi eni ≈ shriftning shuncha ulushi.
const AVG_CHAR_RATIO = 0.58;
// "Pill" ichki bo'shlig'i + yo'nalish ikonkasi + oraliqlar.
const BADGE_CHROME = 34;
// Summalar yonidagi "uch nuqta" tugmasi + oraliqlar uchun ajratma.
const RIGHT_RESERVED = 40;
const RIGHT_RESERVED_NO_MENU = 8;

/**
 * Summa shriftini MAVJUD ENGA qarab hisoblaydi. `adjustsFontSizeToFit` web'da
 * (react-native-web) umuman ishlamaydi — shuning uchun qo'lda hisoblaymiz.
 * Qatordagi BARCHA valyuta bir xil shrift oladi: aks holda uzun satr
 * yonidagilardan kichik bo'lib, qator notekis ko'rinardi.
 */
const amountFontSize = (longestLength: number, availWidth: number): number => {
  if (!longestLength || availWidth <= 0) return AMOUNT_FONT_MAX;
  const fitted = Math.floor(availWidth / (longestLength * AVG_CHAR_RATIO));
  return Math.max(AMOUNT_FONT_MIN, Math.min(AMOUNT_FONT_MAX, fitted));
};

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
 * O'ngda mijozning BARCHA valyutalardagi qoldig'i: har biri o'z "pill"ida,
 * bergani yashil, olgani qizil, hisob yopiq bo'lsa neytral kulrang. Qaysi
 * valyutada qancha qolganini bilish uchun mijozni ochish shart emas.
 *
 * Valyutalar bir-biriga QO'SHILMAYDI: dollarni bugungi kurs bo'yicha so'mga
 * aylantirish qarzning haqiqiy ma'nosini buzadi. Shu sababli ular alohida
 * qatorlarda turadi, yig'indi ko'rsatilmaydi.
 *
 * Butun qator bosiladi (mijozni ochadi); o'ngdagi "uch nuqta" esa tahrirlash
 * menyusini chaqiradi. Ilgari bu qalam ikonkasi edi — bitta amal doimiy
 * ikonkaga aylanib, har qatorda takrorlanardi va ism bilan raqobatlashardi.
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

  // Summa shrifti mavjud enga qarab hisoblanadi — qator enini o'lchab olamiz.
  const [rowWidth, setRowWidth] = useState(0);
  const handleRowLayout = useCallback(
    (event: LayoutChangeEvent) => setRowWidth(event.nativeEvent.layout.width),
    [],
  );
  const amountsWidth =
    rowWidth > 0
      ? rowWidth * 0.46 - (canEdit ? RIGHT_RESERVED : RIGHT_RESERVED_NO_MENU) - BADGE_CHROME
      : 0;

  const handlePress = useCallback(() => onPress(contact.id), [onPress, contact.id]);
  const handleEdit = useCallback(() => onEdit(contact.id), [onEdit, contact.id]);
  const handleViewPhoto = useCallback(() => onViewPhoto(avatarKey), [onViewPhoto, avatarKey]);

  const isBusiness = contact.partyType === 'BUSINESS_ACCOUNT';
  // Ism ostidagi qator: shaxsda telefon raqami, biznesda esa username —
  // biznesni aynan shu nom bilan qo'shishadi va topishadi. Biznesda telefon
  // umuman yo'q, username hali qo'yilmagan bo'lsa qator bo'sh qoladi.
  const subtitle = isBusiness ? contact.username || '' : contact.phone || '';

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

  const amountFont = useMemo(() => {
    const longest = rows.reduce(
      (max, item) => Math.max(max, formatSignedMoney(item.amount, item.currency).length),
      0,
    );
    return amountFontSize(longest, amountsWidth);
  }, [rows, amountsWidth]);

  const unreadBadge =
    unreadCount > 0 ? (
      <View style={styles.unreadBadge}>
        <Text style={styles.unreadBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
      </View>
    ) : null;

  return (
    <View onLayout={handleRowLayout}>
      <Pressable
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        android_ripple={{ color: colors.surfaceMuted }}
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
            {unreadBadge}
          </Pressable>
        ) : (
          <View>
            <UserAvatar uri={undefined} size={AVATAR_SIZE} name={contact.fullName} />
            {unreadBadge}
          </View>
        )}

        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {contact.fullName}
            </Text>
            {isBusiness ? (
              // Kategoriya yorlig'i — pastel ko'k, ism yonida.
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{t('debts.businessLabel')}</Text>
              </View>
            ) : null}
          </View>
          {subtitle ? (
            <Text style={styles.secondary} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        <View style={styles.right}>
          <View style={styles.amounts}>
            {balances === undefined ? (
              <Text style={styles.amountMuted}>{totalsLoading ? '…' : '--'}</Text>
            ) : rows.length === 0 ? (
              // Hisob yopiq: neytral kulrang "pill" — yashil ham, qizil ham emas.
              <View style={styles.zeroBadge}>
                <Text style={styles.zeroText}>{formatMoney(0)}</Text>
              </View>
            ) : (
              rows.map((row) => (
                <BalanceBadge
                  key={row.currency}
                  amount={row.amount}
                  currency={row.currency}
                  fontSize={amountFont}
                />
              ))
            )}
          </View>

          {canEdit ? (
            <IconButton
              name="ellipsis-vertical"
              onPress={handleEdit}
              accessibilityLabel={t('common.edit')}
            />
          ) : null}
        </View>
      </Pressable>

      {/* Qatorlar orasidagi juda nozik ajratgich — avatardan keyin boshlanadi
          (zamonaviy "inset divider"), oxirgi qatordan keyin chizilmaydi. */}
      {!isLast ? <View style={styles.divider} /> : null}
    </View>
  );
};

const createStyles = ({ colors, spacing, radius, typography }: ThemeValue) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs + 2,
      gap: spacing.sm,
      // 44 (avatar) + 2*10 = 64px — 44px teginish talabidan baland, lekin
      // ekranga sezilarli ko'proq qator sig'adi.
      minHeight: 64,
    },
    // Android'da android_ripple ishlaydi; iOS/web uchun fon o'zgaradi.
    rowPressed: Platform.OS === 'android' ? {} : { backgroundColor: colors.surfaceMuted },
    info: {
      flex: 1,
      minWidth: 0,
    },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      minWidth: 0,
    },
    name: {
      ...typography.body,
      fontSize: 16,
      lineHeight: 21,
      fontWeight: '700',
      letterSpacing: -0.2,
      color: colors.textPrimary,
      flexShrink: 1,
    },
    secondary: {
      ...typography.bodySmall,
      fontSize: 13,
      marginTop: 1,
      color: colors.textSecondary,
      flexShrink: 1,
    },
    // "Biznes" belgisi — pastel ko'k, ism yonida. Kichik: qatorda ism eng
    // muhim element bo'lib qolishi kerak.
    badge: {
      paddingHorizontal: spacing.xs,
      paddingVertical: 2,
      borderRadius: radius.xs,
      backgroundColor: colors.infoSoft,
    },
    badgeText: {
      ...typography.caption,
      fontSize: 11,
      lineHeight: 14,
      fontWeight: '700',
      color: colors.info,
    },
    // Summalar va menyu YONMA-YON, vertikal markazda — qator bo'yi avatar
    // balandligidan oshmaydi, o'ng chet tekis turadi.
    right: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xxs,
      // Summa qanchalik katta bo'lmasin, qator enining shuncha ulushidan oshmaydi —
      // qolgan joy mijoz ismiga tegishli (ism summadan muhimroq).
      maxWidth: '46%',
      flexShrink: 1,
    },
    amounts: {
      alignItems: 'flex-end',
      minWidth: 0,
      flexShrink: 1,
      gap: spacing.xxs,
    },
    amountMuted: {
      ...typography.caption,
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    zeroBadge: {
      paddingVertical: 5,
      paddingHorizontal: spacing.xs + 2,
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceMuted,
    },
    zeroText: {
      ...typography.caption,
      fontSize: 13,
      lineHeight: 17,
      fontWeight: '700',
      color: colors.textSecondary,
      fontVariant: ['tabular-nums'],
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginLeft: spacing.md + AVATAR_SIZE + spacing.sm,
      marginRight: spacing.md,
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
      borderWidth: 2,
      borderColor: colors.surface,
    },
    unreadBadgeText: {
      ...typography.caption,
      fontSize: 10,
      lineHeight: 13,
      fontWeight: '800',
      color: colors.textOnPrimary,
    },
  });

export default memo(ContactRow);
