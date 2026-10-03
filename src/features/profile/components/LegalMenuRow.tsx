import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import MenuRow from '../../../shared/ui/MenuRow';

interface Props {
  label: string;
  iconName: React.ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  isLast?: boolean;
}

/**
 * Huquqiy hujjatlar bo'limidagi bitta navigatsiya qatori.
 *
 * Ko'rinishi umumiy `MenuRow` dan keladi - menyu qatorlari ilovaning
 * hamma yerida bir xil turishi kerak. Bu komponent faqat nom sifatida
 * qoldi: chaqiruv joylari `iconName` deb yozadi, MenuRow esa `icon`.
 */
const LegalMenuRow: React.FC<Props> = ({ label, iconName, onPress, isLast }) => (
  <MenuRow label={label} icon={iconName} onPress={onPress} isLast={isLast} />
);

export default LegalMenuRow;
