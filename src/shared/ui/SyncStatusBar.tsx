import React, { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../theme';
import type { ThemeValue } from '../theme/ThemeProvider';
import { useI18n } from '../i18n';
import { useOnlineStatus } from '../lib/networkStatus';
import { useOutboxCount } from '../lib/useOutbox';
import OutboxModal from './OutboxModal';

/**
 * Tarmoq va yuborilmagan amallar haqidagi YAGONA xabar qatori.
 *
 * Ilovaning eng tepasida, barcha ekranlar ustida turadi. Nega global:
 * amal istalgan ekranda bajarilishi mumkin (qarz, xarajat, mahsulot),
 * navbat esa bitta. Har ekranga alohida banner qo'yilsa, ulardan biri
 * esdan chiqar va odam amali qayerga ketganini bilmay qolardi.
 *
 * Hech narsa bo'lmasa qator CHIZILMAYDI ham — onlayn va navbat bo'sh
 * holatda ekrandan bitta piksel ham olmaydi.
 */
const SyncStatusBar: React.FC = () => {
  const [listOpen, setListOpen] = React.useState(false);
  const theme = useAppTheme();
  const { colors } = theme;
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const isOnline = useOnlineStatus();
  const pending = useOutboxCount();

  if (isOnline && pending === 0) return null;

  /*
   * Uch holat, uch xabar:
   *   - yuborilyapti: onlayn, lekin navbat hali bo'shamagan;
   *   - kutyapti:     oflayn va navbatda amal bor;
   *   - oflayn:       navbat bo'sh, shunchaki internet yo'q.
   */
  const sending = isOnline && pending > 0;
  const waiting = !isOnline && pending > 0;

  const tone = sending ? colors.primary : colors.warning;
  const icon = sending ? 'cloud-upload-outline' : 'cloud-offline-outline';
  const message = sending
    ? t('sync.sending', { count: String(pending) })
    : waiting
      ? t('sync.pending', { count: String(pending) })
      : t('sync.offline');

  /*
   * Navbat bo'sh bo'lmasa qator BOSILADI va ro'yxat ochiladi.
   *
   * Oflaynda qo'shilgan yozuv ro'yxatlarda hali ko'rinmaydi (balanslar
   * serverda hisoblanadi va ularni qurilmada taxmin qilish noto'g'ri
   * raqam berardi). Shuning uchun odamda "amalim qayerga ketdi"
   * savoliga javob bo'lishi kerak — u shu ro'yxat.
   */
  const openable = pending > 0;

  return (
    <>
      <Pressable
        onPress={openable ? () => setListOpen(true) : undefined}
        disabled={!openable}
        style={({ pressed }) => [
          styles.bar,
          { backgroundColor: tone },
          pressed && openable && styles.pressed,
        ]}
        accessibilityRole={openable ? 'button' : 'alert'}
        accessibilityLabel={message}
      >
        <Ionicons name={icon} size={14} color={colors.textOnPrimary} />
        <Text style={styles.text} numberOfLines={1}>
          {message}
        </Text>
        {openable ? (
          <Ionicons name="chevron-forward" size={14} color={colors.textOnPrimary} />
        ) : null}
      </Pressable>

      <OutboxModal visible={listOpen} onClose={() => setListOpen(false)} />
    </>
  );
};

const createStyles = ({ colors, spacing, typography }: ThemeValue) =>
  StyleSheet.create({
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.xxs + 2,
      paddingHorizontal: spacing.md,
    },
    pressed: {
      opacity: 0.75,
    },
    text: {
      ...typography.caption,
      fontSize: 12,
      fontWeight: '700',
      color: colors.textOnPrimary,
      flexShrink: 1,
    },
  });

export default memo(SyncStatusBar);
