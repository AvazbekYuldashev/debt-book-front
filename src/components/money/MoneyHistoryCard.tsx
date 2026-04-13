import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Card from '../Card';
import { MoneyResponseDTO } from '../../types/money';
import { formatDateTime, formatMoney } from '../../utils/money';
import colors from '../../styles/colors';

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
  const badgeText = isUnknown ? 'Aniq emas' : isHaq ? 'Haq' : 'Qarz';
  const directionText = isUnknown ? 'Tomon aniqlanmadi' : isHaq ? 'Siz berdingiz' : 'Siz oldingiz';
  const counterpartyTitle = isUnknown ? 'Ikkinchi tomon' : isHaq ? 'Kimga berildi' : 'Kimdan olindi';
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
          {formatMoney(item.amount)}
        </Text>
      </View>
      <Text style={[styles.direction, isCreditor ? styles.directionGreen : isUnknown ? styles.directionMuted : null]}>
        {directionText}
      </Text>
      <Text style={styles.counterparty}>
        {counterpartyTitle}: {counterpartyLabel}
      </Text>
      <Text style={styles.meta}>ID: {item.id}</Text>
      <Text style={styles.meta}>Visible: {String(item.visible)}</Text>
      <Text style={styles.meta}>Debtor ID: {item.debtorId}</Text>
      <Text style={styles.meta}>Creditor ID: {item.creditorId}</Text>
      <Text style={styles.description}>{item.description || "Ta'rif kiritilmagan"}</Text>
      <Text style={styles.date}>{formatDateTime(item.createdDate)}</Text>
    </Card>
  );
};

const styles = StyleSheet.create({
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
    color: '#fff',
  },
  taken: {
    backgroundColor: colors.danger,
  },
  creditorBadge: {
    backgroundColor: '#1f9d55',
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
    color: '#1f9d55',
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
    color: '#1f9d55',
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
  meta: {
    marginTop: 4,
    fontSize: 12,
    color: colors.textSecondary,
  },
  date: {
    marginTop: 6,
    fontSize: 12,
    color: colors.textSecondary,
  },
});

export default MoneyHistoryCard;
