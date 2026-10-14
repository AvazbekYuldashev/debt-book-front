import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../theme';
import type { ThemeValue } from '../theme/ThemeProvider';
import { useI18n } from '../i18n';
import { formatDateFromDate, getPickerDate } from '../lib/date';

interface DateFieldProps {
  label: string;
  /** YYYY-MM-DD. */
  value: string;
  onChange: (value: string) => void;
  containerStyle?: StyleProp<ViewStyle>;
}

/** Haftaning birinchi kuni DUSHANBA — O'zbekistonda hafta shunday boshlanadi. */
const WEEK_START_MONDAY = 1;
const DAYS_IN_WEEK = 7;

const pad2 = (value: number): string => String(value).padStart(2, '0');
const iso = (year: number, month: number, day: number): string =>
  `${year}-${pad2(month + 1)}-${pad2(day)}`;

/**
 * Sana TANLANADI, yozilmaydi.
 *
 * Ilgari sana oddiy matn maydoni edi: odam "2026-10-15" ni qo'lda terishi
 * kerak edi va bitta xato raqam butun hisobni surib yuborardi (ijarada
 * sana — pulning o'zi: kun soni shundan chiqadi). Telefonda esa raqam
 * klaviaturasida sana terish eng sekin ish.
 *
 * Kalendar O'ZI chizilgan, native modul ishlatilmagan: bu ilova Android
 * va web'da BIR XIL ishlashi kerak, `@react-native-community/datetimepicker`
 * esa web'da umuman yo'q (shuning uchun xarajatlar filtrida web uchun
 * alohida yo'l yozilgan edi). Bitta komponent — ikkala muhitda bitta
 * ko'rinish.
 *
 * Kalendar O'RNIDA ochiladi, modal ustiga modal qo'yilmaydi: ijara
 * formasining o'zi allaqachon modal va ustiga yana bittasi telefonda
 * orqaga qaytishni chalkashtirardi.
 */
const DateField: React.FC<DateFieldProps> = ({ label, value, onChange, containerStyle }) => {
  const theme = useAppTheme();
  const { colors } = theme;
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [open, setOpen] = useState(false);

  // Tanlangan sana — ko'rilayotgan oyning boshlang'ich nuqtasi.
  const selected = useMemo(() => getPickerDate(value), [value]);
  const [view, setView] = useState(() => ({
    year: selected.getFullYear(),
    month: selected.getMonth(),
  }));

  const openCalendar = useCallback(() => {
    // Har ochilishda tanlangan oyga qaytadi: odam boshqa oyga qarab
    // yopgan bo'lsa, keyingi safar yana o'sha yerdan boshlanmasin.
    setView({ year: selected.getFullYear(), month: selected.getMonth() });
    setOpen((was) => !was);
  }, [selected]);

  const shift = useCallback((delta: number) => {
    setView((prev) => {
      const next = new Date(prev.year, prev.month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  }, []);

  const pick = useCallback(
    (day: number) => {
      onChange(iso(view.year, view.month, day));
      setOpen(false);
    },
    [onChange, view],
  );

  const monthNames = useMemo(() => t('date.months').split(','), [t]);
  const weekNames = useMemo(() => t('date.weekShort').split(','), [t]);

  /**
   * Oy katakchalari: oldidagi bo'sh joylar + kunlar.
   *
   * Bo'sh joy `null` bo'lib turadi — ular ham katak egallaydi, aks holda
   * oyning birinchi kuni to'g'ri ustunga tushmasdi.
   */
  const cells = useMemo<(number | null)[]>(() => {
    const first = new Date(view.year, view.month, 1);
    const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
    // JS'da hafta yakshanbadan boshlanadi — dushanbaga suramiz.
    const lead = (first.getDay() - WEEK_START_MONDAY + DAYS_IN_WEEK) % DAYS_IN_WEEK;
    const result: (number | null)[] = Array.from({ length: lead }, () => null);
    for (let day = 1; day <= daysInMonth; day += 1) result.push(day);
    return result;
  }, [view]);

  const today = useMemo(() => formatDateFromDate(new Date()), []);
  const selectedIso = value;

  return (
    <View style={[styles.wrap, containerStyle]}>
      <Text style={styles.label}>{label}</Text>

      <Pressable
        onPress={openCalendar}
        style={({ pressed }) => [styles.field, open && styles.fieldOpen, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value}`}
      >
        <Text style={styles.value}>{value}</Text>
        <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
      </Pressable>

      {open ? (
        <View style={styles.calendar}>
          <View style={styles.monthRow}>
            <Pressable
              onPress={() => shift(-1)}
              style={({ pressed }) => [styles.navBtn, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={t('date.prevMonth')}
            >
              <Ionicons name="chevron-back" size={18} color={colors.textPrimary} />
            </Pressable>
            <Text style={styles.monthText}>
              {`${monthNames[view.month] ?? ''} ${view.year}`}
            </Text>
            <Pressable
              onPress={() => shift(1)}
              style={({ pressed }) => [styles.navBtn, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={t('date.nextMonth')}
            >
              <Ionicons name="chevron-forward" size={18} color={colors.textPrimary} />
            </Pressable>
          </View>

          <View style={styles.grid}>
            {weekNames.map((name) => (
              <View key={name} style={styles.cell}>
                <Text style={styles.weekText}>{name}</Text>
              </View>
            ))}

            {cells.map((day, index) => {
              if (day === null) return <View key={`gap-${index}`} style={styles.cell} />;
              const dayIso = iso(view.year, view.month, day);
              const isSelected = dayIso === selectedIso;
              const isToday = dayIso === today;
              return (
                <Pressable
                  key={dayIso}
                  onPress={() => pick(day)}
                  style={({ pressed }) => [
                    styles.cell,
                    styles.day,
                    isSelected && styles.daySelected,
                    pressed && styles.pressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={dayIso}
                >
                  <Text
                    style={[
                      styles.dayText,
                      // Bugun ajralib turadi, lekin tanlangandan zaifroq:
                      // tanlov har doim kuchliroq signal bo'lishi kerak.
                      isToday && !isSelected && styles.dayToday,
                      isSelected && styles.dayTextSelected,
                    ]}
                  >
                    {day}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            onPress={() => {
              onChange(today);
              setOpen(false);
            }}
            style={({ pressed }) => [styles.todayBtn, pressed && styles.pressed]}
            accessibilityRole="button"
          >
            <Text style={styles.todayText}>{t('date.today')}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
};

const createStyles = ({ colors, spacing, radius, typography }: ThemeValue) =>
  StyleSheet.create({
    wrap: { gap: spacing.xs },
    label: {
      ...typography.label,
      color: colors.textPrimary,
    },
    field: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: 'transparent',
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm + 2,
    },
    fieldOpen: { borderColor: colors.primary },
    pressed: { opacity: 0.6 },
    value: {
      ...typography.body,
      color: colors.textPrimary,
      fontVariant: ['tabular-nums'],
    },
    calendar: {
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.md,
      padding: spacing.sm,
      gap: spacing.xs,
    },
    monthRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    navBtn: {
      padding: spacing.xxs,
      borderRadius: radius.sm,
    },
    monthText: {
      ...typography.body,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    // Yetti ustun: har katak aniq 1/7 — sana to'g'ri ustunga tushishi kerak.
    cell: {
      width: `${100 / DAYS_IN_WEEK}%`,
      aspectRatio: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    weekText: {
      ...typography.caption,
      fontSize: 11,
      color: colors.textSecondary,
    },
    day: { borderRadius: radius.sm },
    daySelected: { backgroundColor: colors.primary },
    dayText: {
      ...typography.body,
      fontSize: 14,
      color: colors.textPrimary,
      fontVariant: ['tabular-nums'],
    },
    dayToday: {
      color: colors.primary,
      fontWeight: '800',
    },
    dayTextSelected: {
      color: colors.textOnPrimary,
      fontWeight: '800',
    },
    todayBtn: {
      alignSelf: 'center',
      paddingVertical: spacing.xxs,
      paddingHorizontal: spacing.sm,
    },
    todayText: {
      ...typography.caption,
      fontWeight: '700',
      color: colors.primary,
    },
  });

export default DateField;
