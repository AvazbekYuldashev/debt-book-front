import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Card from '../Card';
import { MoneyResponseDTO } from '../../types/money';
import { formatDateTime, formatMoney } from '../../utils/money';
import { normalizeCurrency } from '../../utils/currency';
import { useI18n } from '../../i18n';
import { useAppTheme } from '../../theme';
import { ColorTokens } from '../../theme/colors';

interface MoneyHistoryCardProps {
  item: MoneyResponseDTO;
  ownerId?: string;
  counterpartyId?: string;
  counterpartyName?: string;
  counterpartyPhone?: string;
}

const normalizeId = (value?: string): string => String(value ?? '').trim().toLowerCase();
const idsEqual = (left?: string, right?: string): boolean =>
  Boolean(normalizeId(left) && normalizeId(left) === normalizeId(right));

const MoneyHistoryCard: React.FC<MoneyHistoryCardProps> = ({
  item,
  ownerId,
  counterpartyId,
  counterpartyName,
  counterpartyPhone,
}) => {
  const { t } = useI18n();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  let isCreditor = idsEqual(item.creditorId, ownerId);
  let isDebtor = idsEqual(item.debtorId, ownerId);

  // Fallback: if owner id doesn't match directly, infer role using the selected contact profile id.
  if (!isCreditor && !isDebtor && counterpartyId) {
    if (idsEqual(item.debtorId, counterpartyId)) {
      isCreditor = true;
    } else if (idsEqual(item.creditorId, counterpartyId)) {
      isDebtor = true;
    }
  }

  const isHaq = isCreditor;
  const isUnknown = !isCreditor && !isDebtor;
  const badgeText = isUnknown ? t('money.badgeUnknown') : isHaq ? t('money.badgeCredit') : t('money.badgeDebt');
  const directionText = isUnknown ? t('money.dirUnknown') : isHaq ? t('money.dirGave') : t('money.dirTook');
  const counterpartyTitle = isUnknown ? t('money.otherParty') : isHaq ? t('money.toWhom') : t('money.fromWhom');
  const fallbackCounterpartyId = isHaq ? item.debtorId : item.creditorId;
  const counterpartyLabel = counterpartyName
    ? `${counterpartyName}${counterpartyPhone ? ` (${counterpartyPhone})` : ''}`
    : isUnknown ? `${item.debtorId} / ${item.creditorId}` : fallbackCounterpartyId;

  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <Text
          style={[
            styles.badge,
            isCreditor ? styles.creditorBadge : isDebtor ? styles.taken : styles.unknownBadge,
          ]}
        >
          {badgeText}
        </Text>
        <Text style={[styles.amount, isCreditor ? styles.amountGreen : isDebtor ? styles.amountRed : styles.amountMuted]}>
          {formatMoney(item.amount, normalizeCurrency(item.currency))}
        </Text>
      </View>
      <Text style={[styles.direction, isCreditor ? styles.directionGreen : isUnknown ? styles.directionMuted : null]}>
        {directionText}
      </Text>
      <Text style={styles.counterparty}>
        {counterpartyTitle}: {counterpartyLabel}
      </Text>
      <Text style={styles.description}>{item.description || t('money.noDescription')}</Text>
      <Text style={styles.date}>{formatDateTime(item.createdDate)}</Text>
    </Card>
  );
};

const createStyles = (colors: ColorTokens) => StyleSheet.create({
  card: {
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  badge: {
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
    color: colors.textOnPrimary,
  },
  taken: {
    backgroundColor: colors.danger,
  },
  creditorBadge: {
    backgroundColor: colors.success,
  },
  unknownBadge: {
    backgroundColor: colors.textSecondary,
  },
  amount: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  amountRed: {
    color: colors.danger,
  },
  amountGreen: {
    color: colors.success,
  },
  amountMuted: {
    color: colors.textSecondary,
  },
  direction: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  directionGreen: {
    color: colors.success,
  },
  directionMuted: {
    color: colors.textSecondary,
  },
  counterparty: {
    marginTop: 4,
    fontSize: 12,
    color: colors.textSecondary,
  },
  description: {
    marginTop: 8,
    fontSize: 14,
    color: colors.textPrimary,
  },
  date: {
    marginTop: 6,
    fontSize: 12,
    color: colors.textSecondary,
  },
});

export default MoneyHistoryCard;
