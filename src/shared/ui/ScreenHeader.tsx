import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../theme';
import type { ThemeValue } from '../theme/ThemeProvider';
import BackButton from './BackButton';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  onBack: () => void;
  /** O'ngda qo'shimcha amal (masalan "qo'shish" tugmasi). */
  right?: React.ReactNode;
}

/**
 * Butun ilova bo'yicha izchil ekran headeri: orqaga tugmasi + sarlavha (+ ixtiyoriy
 * subtitle va o'ng tomondagi amal). Native-stack'ning standart headeri o'rniga
 * ishlatiladi (screen options'da `headerShown: false` bilan birga).
 */
const ScreenHeader: React.FC<ScreenHeaderProps> = ({ title, subtitle, onBack, right }) => {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.row}>
      <BackButton onPress={onBack} />
      <View style={styles.titleArea}>
        <View style={styles.titleWrap}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
      {right}
    </View>
  );
};

const createStyles = ({ colors, spacing, radius, typography, glass }: ThemeValue) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
      paddingBottom: spacing.xs,
      // Fon ATAYIN berilmaydi: ekranning ambient foni sarlavha ortidan ham
      // o'tib tursin. Tekis rang berilganda u yuqorida yopishib turgan
      // shaffofmas chiziq bo'lib ko'rinardi.
    },
    // Qatorning bo'sh qismi: o'ng tomondagi amalni chetga suradi.
    titleArea: {
      flex: 1,
      minWidth: 0,
    },
    /**
     * Sarlavha O'Z SIRTIDA - asosiy ekranlardagi sarlavhalar bilan bir xil.
     *
     * Ilgari kontur (matn soyasi) va yuqori parda bilan himoyalangan edi.
     * Sarlavhaning o'zi o'qilardi, lekin ostidagi kulrang izoh (a'zolar
     * soni, biznes nomi) parda so'nayotgan joyda turadi va to'q fon
     * rasmida yorug' mavzuda ko'rinmay qolardi.
     *
     * Kenglik MAZMUNGA qarab: butun qator bo'ylab cho'zilsa, u sarlavha
     * emas, bo'sh panel bo'lib ko'rinardi.
     */
    titleWrap: {
      alignSelf: 'flex-start',
      maxWidth: '100%',
      paddingVertical: spacing.xxs,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.lg,
      ...glass.surface,
    },
    title: {
      ...typography.heading2,
      fontSize: 19,
      color: colors.textPrimary,
    },
    subtitle: {
      ...typography.caption,
      marginTop: 1,
      color: colors.textSecondary,
    },
  });

export default ScreenHeader;
