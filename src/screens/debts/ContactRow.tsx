import React, { memo, useCallback, useMemo, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../theme';
import type { ThemeValue } from '../../theme/ThemeProvider';
import { useI18n } from '../../i18n';
import UserAvatar from '../../shared/ui/UserAvatar';
import { formatMoney } from '../../utils/money';
import type { CurrencyNet } from '../../utils/currency';
import type { Contact } from '../../context/ContactsContext';

const AVATAR_SIZE = 46;

const AMOUNT_FONT_MAX = 13;
const AMOUNT_FONT_MIN = 9;
// Qalin, tabular-nums raqam uchun belgi eni ≈ shriftning shuncha ulushi.
const AVG_CHAR_RATIO = 0.62;
// Summalar bloki yonidagi tahrir tugmasi + oraliqlar uchun ajratma.
const RIGHT_RESERVED = 44;
const RIGHT_RESERVED_NO_EDIT = 12;

/**
 * Summa shriftini MAVJUD ENGA qarab hisoblaydi: keng ekranda to'liq o'lcham
 * (AMOUNT_FONT_MAX), tor ekranda kerak bo'lgandagina kichrayadi (AMOUNT_FONT_MIN
 * gacha). Faqat uzunlikka qarash keng ekranda ham mayda qilib yuborardi.
 * `adjustsFontSizeToFit` web'da (react-native-web) ishlamaydi — shuning uchun qo'lda.
 */
const amountFontSize = (length: number, availWidth: number): number => {
  if (!length || availWidth <= 0) return AMOUNT_FONT_MAX;
  const fitted = Math.floor(availWidth / (length * AVG_CHAR_RATIO));
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
  onChangePhoto: (avatarKey: string) => void;
}

/**
 * Kontaktlar ro'yxatining bitta qatori: avatar, ism/telefon, HAR VALYUTA uchun
 * alohida balans "pill"i (so'm va dollar hisobi aralashtirilmaydi) va (ruxsat
 * bo'lsa) tahrirlash tugmasi. To'liq prezentatsion va `memo`langan.
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
  onChangePhoto,
}) => {
  const theme = useAppTheme();
  const { colors } = theme;
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const avatarKey = contact.partyId || contact.id;

  // Summa shrifti mavjud enga qarab hisoblanadi — qator enini o'lchab olamiz.
  const [rowWidth, setRowWidth] = useState(0);
  const handleRowLayout = useCallback(
    (event: LayoutChangeEvent) => setRowWidth(event.nativeEvent.layout.width),
    [],
  );
  const amountsWidth =
    rowWidth > 0 ? rowWidth * 0.5 - (canEdit ? RIGHT_RESERVED : RIGHT_RESERVED_NO_EDIT) : 0;

  const handlePress = useCallback(() => onPress(contact.id), [onPress, contact.id]);
  const handleEdit = useCallback(() => onEdit(contact.id), [onEdit, contact.id]);
  const handleChangePhoto = useCallback(() => onChangePhoto(avatarKey), [onChangePhoto, avatarKey]);

  const secondaryLabel =
    contact.partyType === 'BUSINESS_ACCOUNT'
      ? `${t('debts.businessLabel')}: ${contact.partyId || '--'}`
      : contact.phone || contact.partyId || '--';

  return (
    <View style={[styles.row, !isLast && styles.rowBorder]} onLayout={handleRowLayout}>
      <Pressable
        style={({ pressed }) => [styles.main, pressed && styles.mainPressed]}
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={contact.fullName}
      >
        <Pressable
          onPress={handleChangePhoto}
          accessibilityRole="button"
          accessibilityLabel={t('contact.changePhoto')}
          hitSlop={6}
        >
          <UserAvatar uri={localPhoto} size={AVATAR_SIZE} />
          {unreadCount > 0 ? (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
            </View>
          ) : null}
        </Pressable>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {contact.fullName}
          </Text>
          <Text style={styles.secondary} numberOfLines={1}>
            {secondaryLabel}
          </Text>
        </View>
      </Pressable>

      <View style={styles.right}>
        <View style={styles.amounts}>
          {balances === undefined ? (
            <Text style={styles.amountMuted}>{totalsLoading ? '…' : '--'}</Text>
          ) : balances.length === 0 ? (
            <Text style={styles.amountMuted}>{formatMoney(0)}</Text>
          ) : (
            balances.map(({ currency, amount }) => {
              const text = `${amount > 0 ? '+' : ''}${formatMoney(amount, currency)}`;
              return (
                <Text
                  key={currency}
                  style={[
                    styles.amount,
                    {
                      color: amount > 0 ? colors.positive : colors.negative,
                      fontSize: amountFontSize(text.length, amountsWidth),
                    },
                  ]}
                  numberOfLines={1}
                >
                  {text}
                </Text>
              );
            })
          )}
        </View>
        {canEdit ? (
          <Pressable
            style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
            onPress={handleEdit}
            accessibilityRole="button"
            accessibilityLabel={t('common.edit')}
            hitSlop={6}
          >
            <Ionicons name="create-outline" size={16} color={colors.textSecondary} />
          </Pressable>
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
    },
    // Summalar (fonsiz, o'ngga tekis) va tahrir tugmasi YONMA-YON, vertikal
    // markazda — qator bo'yi avatar balandligidan oshmaydi, o'ng chet tekis.
    right: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      // Summa qanchalik katta bo'lmasin, qatorning yarmidan ko'pini egallamaydi —
      // qolgan joy mijoz ismiga tegishli.
      maxWidth: '50%',
      flexShrink: 1,
    },
    amounts: {
      alignItems: 'flex-end',
      minWidth: 0,
      flexShrink: 1,
      gap: 1,
    },
    amount: {
      ...typography.caption,
      fontSize: 13,
      lineHeight: 17,
      fontWeight: '800',
      fontVariant: ['tabular-nums'],
    },
    amountMuted: {
      ...typography.caption,
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    iconBtn: {
      width: 28,
      height: 28,
      borderRadius: radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceMuted,
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
    iconBtnPressed: {
      opacity: 0.6,
    },
  });

export default memo(ContactRow);
