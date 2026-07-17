import React, { useMemo } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import Input from '../../../shared/ui/Input';
import Button from '../../../shared/ui/Button';
import {
  formatDateFromDate,
  formatDateInputValue,
  getPickerDate,
  splitDateParts,
  updateDatePart,
} from '../../../shared/lib/date';

// Mobil platformada native sana tanlagich (web'da yo'q).
const DateTimePicker =
  Platform.OS !== 'web' ? require('@react-native-community/datetimepicker').default : null;

const MONTHS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));

interface DateRangeFilterProps {
  open: boolean;
  onToggle: () => void;
  summaryText: string;
  hasActiveFilter: boolean;
  fromDate: string;
  endDate: string;
  yearOptions: string[];
  showFromPicker: boolean;
  showEndPicker: boolean;
  error: string;
  onFromDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onShowFromPicker: (show: boolean) => void;
  onShowEndPicker: (show: boolean) => void;
  onApply: () => void;
}

/**
 * Sana oralig'i filtri: yig'ib/ochib bo'ladigan panel. Web'da yil/oy/kun
 * `select`lari, mobil'da matn kiritish + native picker.
 */
const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  open,
  onToggle,
  summaryText,
  hasActiveFilter,
  fromDate,
  endDate,
  yearOptions,
  showFromPicker,
  showEndPicker,
  error,
  onFromDateChange,
  onEndDateChange,
  onShowFromPicker,
  onShowEndPicker,
  onApply,
}) => {
  const theme = useAppTheme();
  const { colors } = theme;
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const renderWebSelectors = (value: string, onChange: (next: string) => void, prefix: string) => {
    const parts = splitDateParts(value);
    return (
      <View style={styles.segmentRow}>
        <select
          style={styles.segmentSelect as any}
          value={parts.year}
          onChange={(e: any) => onChange(updateDatePart(value, 'year', e.target.value))}
        >
          <option value="">{t('expenses.year')}</option>
          {yearOptions.map((year) => (
            <option key={`${prefix}-year-${year}`} value={year}>
              {year}
            </option>
          ))}
        </select>
        <select
          style={styles.segmentSelect as any}
          value={parts.month}
          onChange={(e: any) => onChange(updateDatePart(value, 'month', e.target.value))}
        >
          <option value="">{t('expenses.month')}</option>
          {MONTHS.map((month) => (
            <option key={`${prefix}-month-${month}`} value={month}>
              {month}
            </option>
          ))}
        </select>
        <select
          style={styles.segmentSelect as any}
          value={parts.day}
          onChange={(e: any) => onChange(updateDatePart(value, 'day', e.target.value))}
        >
          <option value="">{t('expenses.day')}</option>
          {DAYS.map((day) => (
            <option key={`${prefix}-day-${day}`} value={day}>
              {day}
            </option>
          ))}
        </select>
      </View>
    );
  };

  return (
    <View style={styles.card}>
      <Pressable style={styles.titleRow} onPress={onToggle} accessibilityRole="button">
        <View style={styles.titleGroup}>
          <Text numberOfLines={1} style={styles.inlineText}>
            <Text style={styles.title}>{t('expenses.dateRange')}: </Text>
            <Text style={[styles.summary, hasActiveFilter && styles.summaryActive]}>{summaryText}</Text>
          </Text>
        </View>
        <Ionicons
          name={open ? 'chevron-up-outline' : 'chevron-down-outline'}
          size={18}
          color={colors.textSecondary}
        />
      </Pressable>

      {open ? (
        <>
          {Platform.OS === 'web' ? (
            <View style={styles.segmentedWrapper}>
              <View style={styles.segmentGroup}>
                <Text style={styles.segmentLabel}>{t('expenses.start')}</Text>
                {renderWebSelectors(fromDate, onFromDateChange, 'from')}
              </View>
              <View style={styles.segmentGroup}>
                <Text style={styles.segmentLabel}>{t('expenses.end')}</Text>
                {renderWebSelectors(endDate, onEndDateChange, 'end')}
              </View>
            </View>
          ) : (
            <View style={styles.mobileDateRange}>
              <View style={styles.mobileDateInput}>
                <Input
                  label={t('expenses.startDate')}
                  value={fromDate}
                  onChangeText={(value) => onFromDateChange(formatDateInputValue(value))}
                  placeholder="YYYY-MM-DD"
                  keyboardType="numeric"
                  containerStyle={styles.filterInput}
                />
                <Pressable style={styles.calendarBtn} onPress={() => onShowFromPicker(true)}>
                  <Ionicons name="calendar-outline" size={18} color={colors.textPrimary} />
                </Pressable>
              </View>
              <View style={styles.mobileDateInput}>
                <Input
                  label={t('expenses.endDate')}
                  value={endDate}
                  onChangeText={(value) => onEndDateChange(formatDateInputValue(value))}
                  placeholder="YYYY-MM-DD"
                  keyboardType="numeric"
                  containerStyle={styles.filterInput}
                />
                <Pressable style={styles.calendarBtn} onPress={() => onShowEndPicker(true)}>
                  <Ionicons name="calendar-outline" size={18} color={colors.textPrimary} />
                </Pressable>
              </View>
            </View>
          )}

          {showFromPicker && DateTimePicker ? (
            <DateTimePicker
              value={getPickerDate(fromDate)}
              mode="date"
              display="default"
              onChange={(_event: unknown, date: Date | undefined) => {
                if (Platform.OS !== 'ios') onShowFromPicker(false);
                if (date) onFromDateChange(formatDateFromDate(date));
              }}
            />
          ) : null}
          {showEndPicker && DateTimePicker ? (
            <DateTimePicker
              value={getPickerDate(endDate)}
              mode="date"
              display="default"
              onChange={(_event: unknown, date: Date | undefined) => {
                if (Platform.OS !== 'ios') onShowEndPicker(false);
                if (date) onEndDateChange(formatDateFromDate(date));
              }}
            />
          ) : null}

          <View style={styles.actionRow}>
            <Button title={t('expenses.applyFilter')} onPress={onApply} style={styles.applyButton} />
          </View>

          {error ? (
            <View style={styles.errorRow}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );
};

const createStyles = ({ colors, spacing, radius, typography }: ThemeValue) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.md,
      marginBottom: spacing.xs,
      marginHorizontal: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    titleGroup: {
      flex: 1,
      paddingRight: spacing.xs,
    },
    inlineText: {
      ...typography.bodySmall,
    },
    title: {
      ...typography.bodySmall,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    summary: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    summaryActive: {
      color: colors.primary,
      fontWeight: '600',
    },
    segmentedWrapper: {
      marginTop: spacing.sm,
      gap: spacing.xs,
    },
    segmentGroup: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      padding: spacing.xs,
      backgroundColor: colors.surfaceMuted,
    },
    segmentLabel: {
      ...typography.caption,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: spacing.xs,
    },
    segmentRow: {
      flexDirection: 'row',
      gap: spacing.xs,
    },
    segmentSelect: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.sm,
      backgroundColor: colors.surface,
      color: colors.textPrimary,
      paddingHorizontal: spacing.xs,
      paddingVertical: spacing.xs,
    },
    mobileDateRange: {
      marginTop: spacing.sm,
      gap: spacing.xs,
    },
    mobileDateInput: {
      position: 'relative',
    },
    filterInput: {
      marginBottom: 0,
    },
    calendarBtn: {
      position: 'absolute',
      right: spacing.xs,
      top: 34,
      width: 34,
      height: 34,
      borderRadius: radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.border,
    },
    actionRow: {
      marginTop: spacing.sm,
    },
    applyButton: {
      minHeight: 48,
    },
    errorRow: {
      marginTop: spacing.sm,
      padding: spacing.sm,
      borderWidth: 1,
      borderColor: colors.danger,
      backgroundColor: colors.dangerMuted,
      borderRadius: radius.sm,
    },
    errorText: {
      ...typography.caption,
      color: colors.danger,
    },
  });

export default DateRangeFilter;
