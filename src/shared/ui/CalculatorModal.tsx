import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Button from './Button';
import { useAppTheme } from '../theme';
import type { ThemeValue } from '../theme/ThemeProvider';
import { useI18n } from '../i18n';

type Operator = '+' | '-' | '*' | '/';

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

const apply = (left: number, right: number, op: Operator): number => {
  switch (op) {
    case '+':
      return left + right;
    case '-':
      return left - right;
    case '*':
      return left * right;
    case '/':
      return right === 0 ? left : right && left / right;
  }
};

/** Suzuvchi nuqta xatolarini yig'ishtiradi: 0.1+0.2 -> 0.3, 12 -> 12. */
const clean = (value: number): string => {
  if (!Number.isFinite(value)) return '0';
  const rounded = Math.round(value * 1e6) / 1e6;
  return String(rounded);
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

  /** Ekranda turgan son. */
  const [current, setCurrent] = useState('0');
  /** Amal bosilgunga qadar to'plangan chap tomon. */
  const [pending, setPending] = useState<{ value: number; op: Operator } | null>(null);
  /** Amaldan keyin birinchi raqam eskisining ustiga yozilishi kerak. */
  const [replaceNext, setReplaceNext] = useState(true);

  useEffect(() => {
    if (!visible) return;
    const start = (initialValue ?? '').replace(/\s/g, '').replace(',', '.');
    setCurrent(start && Number.isFinite(Number(start)) && Number(start) !== 0 ? start : '0');
    setPending(null);
    setReplaceNext(true);
  }, [visible, initialValue]);

  const pressDigit = useCallback(
    (digit: string) => {
      setCurrent((prev) => {
        if (replaceNext) return digit;
        if (prev === '0') return digit;
        return prev + digit;
      });
      setReplaceNext(false);
    },
    [replaceNext]
  );

  const pressDot = useCallback(() => {
    setCurrent((prev) => {
      if (replaceNext) return '0.';
      return prev.includes('.') ? prev : `${prev}.`;
    });
    setReplaceNext(false);
  }, [replaceNext]);

  const pressOperator = useCallback(
    (op: Operator) => {
      const value = Number(current) || 0;
      // Ketma-ket amal bosilsa avvalgisi darhol hisoblanadi: 2+3× -> 5×
      const left = pending && !replaceNext ? apply(pending.value, value, pending.op) : value;
      setPending({ value: left, op });
      setCurrent(clean(left));
      setReplaceNext(true);
    },
    [current, pending, replaceNext]
  );

  const pressEquals = useCallback(() => {
    if (!pending) return;
    const result = apply(pending.value, Number(current) || 0, pending.op);
    setCurrent(clean(result));
    setPending(null);
    setReplaceNext(true);
  }, [current, pending]);

  const pressClear = useCallback(() => {
    setCurrent('0');
    setPending(null);
    setReplaceNext(true);
  }, []);

  const pressBackspace = useCallback(() => {
    setCurrent((prev) => {
      if (replaceNext || prev.length <= 1) return '0';
      return prev.slice(0, -1);
    });
    setReplaceNext(false);
  }, [replaceNext]);

  /** Kiritish: kutilayotgan amal bo'lsa avval uni yakunlaymiz. */
  const handleApply = useCallback(() => {
    const result = pending
      ? apply(pending.value, Number(current) || 0, pending.op)
      : Number(current) || 0;
    onApply(clean(Math.abs(result)));
    onClose();
  }, [current, pending, onApply, onClose]);

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
            {pending ? (
              <Text style={styles.pending} numberOfLines={1}>
                {clean(pending.value)} {SYMBOL[pending.op]}
              </Text>
            ) : null}
            <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.4}>
              {current}
            </Text>
          </View>

          <View style={styles.grid}>
            <View style={styles.row}>
              {renderKey('C', pressClear, 'muted')}
              {renderKey('⌫', pressBackspace, 'muted')}
              {renderKey(SYMBOL['/'], () => pressOperator('/'), 'op')}
              {renderKey(SYMBOL['*'], () => pressOperator('*'), 'op')}
            </View>
            <View style={styles.row}>
              {['7', '8', '9'].map((d) => renderKey(d, () => pressDigit(d)))}
              {renderKey(SYMBOL['-'], () => pressOperator('-'), 'op')}
            </View>
            <View style={styles.row}>
              {['4', '5', '6'].map((d) => renderKey(d, () => pressDigit(d)))}
              {renderKey(SYMBOL['+'], () => pressOperator('+'), 'op')}
            </View>
            <View style={styles.row}>
              {['1', '2', '3'].map((d) => renderKey(d, () => pressDigit(d)))}
              {renderKey('=', pressEquals, 'op')}
            </View>
            <View style={styles.row}>
              {renderKey('0', () => pressDigit('0'), 'digit', true)}
              {renderKey('.', pressDot)}
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
      backgroundColor: colors.background,
      borderRadius: radius.xl,
      padding: spacing.md,
      gap: spacing.sm,
      maxWidth: 420,
      width: '100%',
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
