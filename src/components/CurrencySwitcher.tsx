import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { useAppTheme } from '../theme';
import { useCurrency } from '../context/CurrencyContext';
import { CURRENCIES } from '../types/money';
import { CURRENCY_LABEL, CURRENCY_SYMBOL } from '../utils/currency';

interface Props {
  style?: ViewStyle;
}

const CurrencySwitcher: React.FC<Props> = ({ style }) => {
  const { colors } = useAppTheme();
  const { baseCurrency, setBaseCurrency } = useCurrency();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={[styles.wrap, style]}>
      {CURRENCIES.map((cur) => {
        const active = baseCurrency === cur;
        return (
          <TouchableOpacity
            key={cur}
            style={[styles.option, active && styles.optionActive]}
            onPress={() => setBaseCurrency(cur)}
            activeOpacity={0.85}
          >
            <Text style={[styles.symbol, active && styles.labelActive]}>{CURRENCY_SYMBOL[cur]}</Text>
            <Text style={[styles.label, active && styles.labelActive]}>{CURRENCY_LABEL[cur]}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

type C = ReturnType<typeof useAppTheme>['colors'];

const createStyles = (colors: C) =>
  StyleSheet.create({
    wrap: {
      flexDirection: 'row',
      gap: 8,
    },
    option: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceMuted,
    },
    optionActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
    },
    symbol: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.textSecondary,
    },
    label: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    labelActive: {
      color: colors.primary,
    },
  });

export default CurrencySwitcher;
