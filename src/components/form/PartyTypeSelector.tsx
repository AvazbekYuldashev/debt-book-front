import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import colors from '../../styles/colors';
import { PartyType } from '../../types/money';

interface Props {
  value: PartyType;
  onChange: (next: PartyType) => void;
  profileLabel: string;
  businessLabel: string;
  style?: ViewStyle;
}

/**
 * PROFILE / BUSINESS_ACCOUNT tanlash uchun qayta ishlatiladigan ikki-chip selektor.
 * DebtListScreen va MoneyActionModal'da bir xil ishlatiladi (DRY).
 */
const PartyTypeSelector: React.FC<Props> = ({ value, onChange, profileLabel, businessLabel, style }) => (
  <View style={[styles.wrap, style]}>
    <TouchableOpacity
      style={[styles.chip, value === 'PROFILE' && styles.chipActive]}
      onPress={() => onChange('PROFILE')}
    >
      <Text style={[styles.chipText, value === 'PROFILE' && styles.chipTextActive]}>{profileLabel}</Text>
    </TouchableOpacity>
    <TouchableOpacity
      style={[styles.chip, value === 'BUSINESS_ACCOUNT' && styles.chipActive]}
      onPress={() => onChange('BUSINESS_ACCOUNT')}
    >
      <Text style={[styles.chipText, value === 'BUSINESS_ACCOUNT' && styles.chipTextActive]}>{businessLabel}</Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  chip: {
    flex: 1,
    minHeight: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: '#eef5ff',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  chipTextActive: {
    color: colors.primary,
  },
});

export default PartyTypeSelector;
