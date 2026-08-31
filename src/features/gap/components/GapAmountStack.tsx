import React, { memo, useMemo } from 'react';
import { StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { formatGapAmount } from '../model/gapFormat';
import { amountUnit, GapAmountDTO, nonZero, toAmount } from '../types/gap';

interface GapAmountStackProps {
  /** Birlik bo'yicha ajratilgan yig'indilar. */
  items: GapAmountDTO[] | undefined;
  /** Har qator oldiga qo'yiladigan belgi: '+' yoki '−'. */
  sign?: '+' | '−';
  color: string;
  /** Hech narsa bo'lmasa ko'rsatiladigan matn (odatda "0 so'm"). */
  emptyText?: string;
  emptyColor?: string;
  style?: StyleProp<TextStyle>;
  align?: 'flex-start' | 'flex-end';
}

/**
 * Bir nechta birlikdagi summani ustma-ust chiqaradi.
 *
 * Gap kassada bitta odam bilan bir vaqtda so'm, dollar va kg go'sht bo'yicha
 * hisob yuritish mumkin — ular hech qachon qo'shilmaydi va bir-biriga
 * aylantirilmaydi, shuning uchun har biri o'z qatorida turadi. Qarzlar
 * bo'limidagi valyuta qatorlari ham aynan shunday ishlaydi.
 */
const GapAmountStack: React.FC<GapAmountStackProps> = ({
  items,
  sign,
  color,
  emptyText,
  emptyColor,
  style,
  align = 'flex-end',
}) => {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const entries = nonZero(items);

  if (entries.length === 0) {
    if (!emptyText) return null;
    return (
      <Text
        style={[styles.value, { color: emptyColor ?? theme.colors.textSecondary }, style]}
        numberOfLines={1}
      >
        {emptyText}
      </Text>
    );
  }

  return (
    <View style={[styles.stack, { alignItems: align }]}>
      {entries.map((entry) => (
        <Text
          key={entry.unitCode}
          style={[styles.value, { color }, style]}
          numberOfLines={1}
        >
          {sign ? `${sign} ` : ''}
          {formatGapAmount(toAmount(entry.amount), amountUnit(entry))}
        </Text>
      ))}
    </View>
  );
};

const createStyles = ({ typography }: ThemeValue) =>
  StyleSheet.create({
    stack: {
      minWidth: 0,
      gap: 1,
    },
    value: {
      ...typography.caption,
      fontSize: 13,
      lineHeight: 17,
      fontWeight: '800',
      fontVariant: ['tabular-nums'],
    },
  });

export default memo(GapAmountStack);
