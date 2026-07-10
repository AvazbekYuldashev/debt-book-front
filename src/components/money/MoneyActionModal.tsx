import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import Input from '../atoms/Input';
import Button from '../atoms/Button';
import ChipSelector, { ChipOption } from '../form/ChipSelector';
import PartyTypeSelector from '../form/PartyTypeSelector';
import BusinessMemberPicker from './BusinessMemberPicker';
import {
  AccountType,
  CURRENCIES,
  Currency,
  MoneyActionType,
  MoneyFlowType,
  PartyType,
} from '../../types/money';
import { accountTypeFromParty, flowForAccounts } from '../../application/usecases/resolveMoneyFlow';
import { CURRENCY_LABEL, CURRENCY_SYMBOL } from '../../utils/currency';
import { formatAmountInput, parseAmountInput } from '../../utils/money';
import { useCurrency } from '../../context/CurrencyContext';
import { useAppTheme } from '../../theme';
import type { ThemeValue } from '../../theme/ThemeProvider';
import { useI18n } from '../../i18n';

export interface MoneyActionPayload {
  amount: number;
  currency: Currency;
  targetPartyType: PartyType;
  targetPartyId?: string;
  description: string;
  fromAccountType: AccountType;
  toAccountType: AccountType;
  moneyFlowType: MoneyFlowType;
  targetBusinessProfileId?: string;
}

interface MoneyActionModalProps {
  visible: boolean;
  actionType: MoneyActionType;
  loading?: boolean;
  /** Berilsa counterparty qat'iy — qo'lda kiritish bloklari yashiriladi. */
  fixedCounterpartyId?: string;
  fixedCounterpartyType?: PartyType;
  ownerAccountType: AccountType;
  onClose: () => void;
  onSubmit: (payload: MoneyActionPayload) => Promise<void>;
}

/**
 * Pul berish/olish modali. Forma holati, validatsiya va flow hisob-kitobi shu
 * yerda; a'zolarni yuklash BusinessMemberPicker'ga, domen mantiq
 * resolveMoneyFlow use-case'iga ajratilgan.
 */
const MoneyActionModal: React.FC<MoneyActionModalProps> = ({
  visible,
  actionType,
  loading = false,
  fixedCounterpartyId,
  fixedCounterpartyType,
  ownerAccountType,
  onClose,
  onSubmit,
}) => {
  const { t } = useI18n();
  const { baseCurrency } = useCurrency();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>(baseCurrency);
  const [counterpartyId, setCounterpartyId] = useState('');
  const [targetType, setTargetType] = useState<PartyType>('PROFILE');
  const [description, setDescription] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [error, setError] = useState('');

  // Har ochilishda toza forma — yopilish yo'lidan (bekor/hardware back/muvaffaqiyat)
  // qat'i nazar eski qiymatlar qolib ketmaydi.
  useEffect(() => {
    if (!visible) return;
    setAmount('');
    setCurrency(baseCurrency);
    setCounterpartyId('');
    setTargetType('PROFILE');
    setDescription('');
    setSelectedMemberId('');
    setError('');
  }, [visible, baseCurrency]);

  const effectiveType = fixedCounterpartyType ?? targetType;
  const effectiveCounterpartyId = (fixedCounterpartyId ?? counterpartyId).trim();
  const businessIdForMembers = effectiveType === 'BUSINESS_ACCOUNT' ? effectiveCounterpartyId : '';

  const title = actionType === 'GIVE' ? t('money.give') : t('money.take');
  const manualIdLabel =
    effectiveType === 'BUSINESS_ACCOUNT'
      ? t('money.targetBusinessId')
      : actionType === 'GIVE'
        ? t('money.giveReceiverId')
        : t('money.takeGiverId');

  const currencyOptions = useMemo<ChipOption<Currency>[]>(
    () =>
      CURRENCIES.map((code) => {
        const label = CURRENCY_LABEL[code];
        const symbol = CURRENCY_SYMBOL[code];
        // "So'm (so'm)" kabi takror bo'lmasin — belgi nomdan farq qilsagina qavsda.
        return {
          value: code,
          label: label.toLowerCase() === symbol.toLowerCase() ? label : `${label} (${symbol})`,
        };
      }),
    [],
  );

  // Real-time feedback: foydalanuvchi maydonni o'zgartirishi bilan eski xato yo'qoladi.
  const handleAmountChange = useCallback((value: string) => {
    setError('');
    setAmount(formatAmountInput(value));
  }, []);
  const handleCurrencyChange = useCallback((value: Currency) => {
    setError('');
    setCurrency(value);
  }, []);
  const handleTargetTypeChange = useCallback((value: PartyType) => {
    setError('');
    setTargetType(value);
  }, []);
  const handleCounterpartyIdChange = useCallback((value: string) => {
    setError('');
    setCounterpartyId(value);
  }, []);
  const handleMemberSelect = useCallback((value: string) => {
    setError('');
    setSelectedMemberId(value);
  }, []);
  const handleDescriptionChange = useCallback((value: string) => {
    setError('');
    setDescription(value);
  }, []);

  const handleSubmit = useCallback(async () => {
    const parsedAmount = parseAmountInput(amount);
    if (parsedAmount === null) {
      setError(t('money.amountInvalid'));
      return;
    }
    if (!effectiveCounterpartyId) {
      setError(
        effectiveType === 'BUSINESS_ACCOUNT' ? t('money.targetBusinessRequired') : t('money.counterpartyRequired'),
      );
      return;
    }
    if (effectiveType === 'BUSINESS_ACCOUNT' && !selectedMemberId) {
      setError(t('money.selectMember'));
      return;
    }

    setError('');
    const targetAccountType = accountTypeFromParty(effectiveType);
    const [fromAccountType, toAccountType] =
      actionType === 'GIVE' ? [ownerAccountType, targetAccountType] : [targetAccountType, ownerAccountType];

    try {
      await onSubmit({
        amount: parsedAmount,
        currency,
        targetPartyType: effectiveType,
        targetPartyId: effectiveCounterpartyId,
        targetBusinessProfileId: selectedMemberId || undefined,
        description: description.trim(),
        fromAccountType,
        toAccountType,
        moneyFlowType: flowForAccounts(fromAccountType, toAccountType),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : t('debts.saveFailed'));
    }
  }, [
    amount,
    effectiveCounterpartyId,
    effectiveType,
    selectedMemberId,
    actionType,
    ownerAccountType,
    currency,
    description,
    onSubmit,
    t,
  ]);

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <Text style={styles.title} accessibilityRole="header">
              {title}
            </Text>

            <Input
              label={t('money.amount')}
              value={amount}
              keyboardType="number-pad"
              onChangeText={handleAmountChange}
              placeholder="100 000"
            />

            <ChipSelector
              options={currencyOptions}
              value={currency}
              onChange={handleCurrencyChange}
              label={t('money.currency')}
              layout="fluid"
              style={styles.field}
            />

            {!fixedCounterpartyId ? (
              <>
                <PartyTypeSelector
                  value={targetType}
                  onChange={handleTargetTypeChange}
                  profileLabel={t('money.profile')}
                  businessLabel={t('money.business')}
                />
                <Input
                  label={manualIdLabel}
                  value={counterpartyId}
                  onChangeText={handleCounterpartyIdChange}
                  placeholder={effectiveType === 'BUSINESS_ACCOUNT' ? 'business-id' : 'profile-id'}
                  autoCapitalize="none"
                />
              </>
            ) : null}

            {businessIdForMembers ? (
              <BusinessMemberPicker
                businessId={businessIdForMembers}
                enabled={visible}
                selectedId={selectedMemberId}
                onSelect={handleMemberSelect}
              />
            ) : null}

            <Input
              label={t('money.comment')}
              value={description}
              onChangeText={handleDescriptionChange}
              placeholder={t('money.commentPlaceholder')}
              multiline
              numberOfLines={3}
            />

            {error ? (
              <Text style={styles.error} accessibilityLiveRegion="polite">
                {error}
              </Text>
            ) : null}

            <View style={styles.actions}>
              <Button title={t('common.cancel')} variant="secondary" onPress={onClose} style={styles.actionBtn} />
              <Button title={title} onPress={handleSubmit} loading={loading} style={styles.actionBtn} />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const createStyles = ({ colors, spacing, radius, typography }: ThemeValue) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: colors.overlay,
    },
    // Modal yuqoriroqda ochilsin — telefon klaviaturasi maydonlarni to'smasligi uchun.
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'flex-start',
      paddingHorizontal: spacing.md,
      paddingTop: spacing.lg,
      paddingBottom: spacing.lg,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.md,
    },
    title: {
      ...typography.heading2,
      fontSize: 18,
      color: colors.textPrimary,
      marginBottom: spacing.sm,
    },
    field: {
      marginBottom: spacing.sm,
    },
    error: {
      ...typography.caption,
      color: colors.danger,
      marginBottom: spacing.xs,
    },
    actions: {
      flexDirection: 'row',
      gap: spacing.xs,
    },
    actionBtn: {
      flex: 1,
    },
  });

export default MoneyActionModal;
