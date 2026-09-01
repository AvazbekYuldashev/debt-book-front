import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Button from './Button';
import { useAppTheme } from '../theme';
import type { ThemeValue } from '../theme/ThemeProvider';
import { useI18n } from '../i18n';
import { modalCardLayout } from './modalLayout';
import {
  calcResult,
  clean,
  formatDisplay,
  initialCalcState,
  pressBackspace,
  pressClear,
  pressDigit,
  pressDot,
  pressEquals,
  pressOperator,
  type CalcState,
  type Operator,
} from './calculator';

interface CalculatorModalProps {
  visible: boolean;
  /** Oyna ochilganda kalkulyatorga qo'yiladigan boshlang'ich son. */
  initialValue?: string;
  onClose: () => void;
  /** "Kiritish" bosilganda natijani qaytaradi (faqat raqam, formatsiz). */
  onApply: (value: string) => void;
}

/** Ekranda ko'rinadigan belgi — foydalanuvchi × va ÷ ni tanish deb biladi. */
const SYMBOL: Record<Operator, string> = {
  '+': '+',
  '-': '−',
  '*': '×',
  '/': '÷',
};

/**
 * Oddiy kalkulyator.
 *
 * Summani kiritishdan oldin hisoblab olish uchun: "3 ta 25 000 dan" yoki
 * "150 000 dan 20 000 ayirib" kabi holatlar uchun ilovadan chiqib, telefon
 * kalkulyatorini ochib, natijani qaytarib yozish kerak bo'lardi.
 *
 * Ataylab sodda: to'rtta amal, oxirgi belgini o'chirish va tozalash. Ilmiy
 * funksiyalar bu yerda hech qachon kerak bo'lmaydi.
 */
const CalculatorModal: React.FC<CalculatorModalProps> = ({
  visible,
  initialValue,
  onClose,
  onApply,
}) => {
  const theme = useAppTheme();
  const { colors } = theme;
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // Butun hisob mantiqi `calculator.ts` da — u yerda testlar bilan
  // qulflangan. Bu komponent faqat chizadi va bosilishlarni uzatadi.
  const [state, setState] = useState<CalcState>(() => initialCalcState(initialValue));

  useEffect(() => {
    if (visible) setState(initialCalcState(initialValue));
  }, [visible, initialValue]);

  const digit = useCallback((value: string) => setState((s) => pressDigit(s, value)), []);
  const dot = useCallback(() => setState((s) => pressDot(s)), []);
  const operator = useCallback((op: Operator) => setState((s) => pressOperator(s, op)), []);
  const equals = useCallback(() => setState((s) => pressEquals(s)), []);
  const clearAll = useCallback(() => setState(pressClear()), []);
  const backspace = useCallback(() => setState((s) => pressBackspace(s)), []);

  /** "Kiritish": kutilayotgan amal faqat undan keyin raqam kiritilgan bo'lsa yakunlanadi. */
  const handleApply = useCallback(() => {
    onApply(calcResult(state));
    onClose();
  }, [state, onApply, onClose]);

  const renderKey = (
    label: string,
    onPress: () => void,
    kind: 'digit' | 'op' | 'muted' = 'digit',
    wide = false
  ) => (
    <Pressable
      key={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.key,
        wide && styles.keyWide,
        kind === 'op' && styles.keyOp,
        kind === 'muted' && styles.keyMuted,
        pressed && styles.keyPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text
        style={[
          styles.keyText,
          kind === 'op' && styles.keyTextOp,
          kind === 'muted' && styles.keyTextMuted,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('calc.title')}</Text>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('common.cancel')}
            >
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          <View style={styles.display}>
            {state.pending ? (
              <Text style={styles.pending} numberOfLines={1}>
                {formatDisplay(clean(state.pending.value))} {SYMBOL[state.pending.op]}
              </Text>
            ) : null}
            <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.4}>
              {formatDisplay(state.current)}
            </Text>
          </View>

          <View style={styles.grid}>
            <View style={styles.row}>
              {renderKey('C', clearAll, 'muted')}
              {renderKey('⌫', backspace, 'muted')}
              {renderKey(SYMBOL['/'], () => operator('/'), 'op')}
              {renderKey(SYMBOL['*'], () => operator('*'), 'op')}
            </View>
            <View style={styles.row}>
              {['7', '8', '9'].map((d) => renderKey(d, () => digit(d)))}
              {renderKey(SYMBOL['-'], () => operator('-'), 'op')}
            </View>
            <View style={styles.row}>
              {['4', '5', '6'].map((d) => renderKey(d, () => digit(d)))}
              {renderKey(SYMBOL['+'], () => operator('+'), 'op')}
            </View>
            <View style={styles.row}>
              {['1', '2', '3'].map((d) => renderKey(d, () => digit(d)))}
              {renderKey('=', equals, 'op')}
            </View>
            <View style={styles.row}>
              {renderKey('0', () => digit('0'), 'digit', true)}
              {renderKey('.', dot)}
            </View>
          </View>

          <Button title={t('calc.apply')} onPress={handleApply} />
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const createStyles = ({ colors, spacing, radius, typography }: ThemeValue) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'center',
      padding: spacing.md,
    },
    card: {
      ...modalCardLayout,
      backgroundColor: colors.background,
      borderRadius: radius.xl,
      padding: spacing.md,
      gap: spacing.sm,
      alignSelf: 'center',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    title: {
      ...typography.body,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    display: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      alignItems: 'flex-end',
      minHeight: 74,
      justifyContent: 'center',
    },
    pending: {
      ...typography.caption,
      color: colors.textSecondary,
      fontVariant: ['tabular-nums'],
    },
    value: {
      ...typography.heading1,
      fontSize: 30,
      fontWeight: '800',
      color: colors.textPrimary,
      fontVariant: ['tabular-nums'],
    },
    grid: {
      gap: spacing.xs,
    },
    row: {
      flexDirection: 'row',
      gap: spacing.xs,
    },
    key: {
      flex: 1,
      paddingVertical: spacing.md,
      borderRadius: radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
    },
    // "0" ikki katak enida — telefon kalkulyatorlaridagi odatiy joylashuv.
    keyWide: {
      flex: 2.08,
    },
    keyOp: {
      backgroundColor: colors.primarySoft,
    },
    keyMuted: {
      backgroundColor: colors.surfaceMuted,
    },
    keyPressed: {
      opacity: 0.6,
    },
    keyText: {
      ...typography.heading2,
      fontSize: 20,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    keyTextOp: {
      color: colors.primary,
    },
    keyTextMuted: {
      color: colors.textSecondary,
    },
  });

export default CalculatorModal;
