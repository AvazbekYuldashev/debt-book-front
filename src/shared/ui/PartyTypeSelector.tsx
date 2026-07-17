import React, { useMemo } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import ChipSelector from './ChipSelector';
import { useAppTheme } from '../theme';
import { PartyType } from '../types/money';

interface Props {
  value: PartyType;
  onChange: (next: PartyType) => void;
  profileLabel: string;
  businessLabel: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * PROFILE / BUSINESS_ACCOUNT tanlash uchun qayta ishlatiladigan ikki-chip selektor.
 * DebtListScreen, ContactFormModal va MoneyActionModal'da bir xil ishlatiladi (DRY).
 */
const PartyTypeSelector: React.FC<Props> = ({ value, onChange, profileLabel, businessLabel, style }) => {
  const { spacing } = useAppTheme();
  const options = useMemo(
    () => [
      { value: 'PROFILE' as const, label: profileLabel },
      { value: 'BUSINESS_ACCOUNT' as const, label: businessLabel },
    ],
    [profileLabel, businessLabel],
  );

  return (
    <ChipSelector
      options={options}
      value={value}
      onChange={onChange}
      layout="fluid"
      style={[{ marginBottom: spacing.sm }, style]}
    />
  );
};

export default PartyTypeSelector;
