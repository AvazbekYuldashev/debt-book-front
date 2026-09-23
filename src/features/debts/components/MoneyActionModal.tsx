import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Input from '../../../shared/ui/Input';
import Button from '../../../shared/ui/Button';
import ChipSelector, { ChipOption } from '../../../shared/ui/ChipSelector';
import CalculatorModal from '../../../shared/ui/CalculatorModal';
import PartyTypeSelector from '../../../shared/ui/PartyTypeSelector';
import BusinessMemberPicker from './BusinessMemberPicker';
import { WorkspaceContext } from '../../business/context/WorkspaceContext';
import ProductBasketModal, { BasketResult } from '../../products/components/ProductBasketModal';
import {
  AccountType,
  CURRENCIES,
  Currency,
  MoneyActionType,
  MoneyFlowType,
  MoneyItemCreateDTO,
  PartyType,
} from '../../../shared/types/money';
import { accountTypeFromParty, flowForAccounts } from '../model/resolveMoneyFlow';
import { CURRENCY_LABEL, CURRENCY_SYMBOL } from '../../../shared/lib/currency';
import { formatAmountInput, parseAmountInput } from '../../../shared/lib/money';
import { useCurrency } from '../context/CurrencyContext';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import { modalCardLayout } from '../../../shared/ui/modalLayout';
import { useKeyboardInset } from '../../../shared/lib/useKeyboardInset';
import VoiceBar from '../../voice/components/VoiceBar';
import { applyTransactionIntent } from '../../voice/model/applyTransactionIntent';
import type { VoiceIntent } from '../../voice/api/voice';

export interface MoneyActionPayload {
  amount: number;
  currency: Currency;
  targetPartyType: PartyType;
  targetPartyId?: string;
  description: string;
  /** Summa kalkulyatorda hisoblangan bo'lsa — o'sha ifoda. */
  calcNote?: string;
  /** Mahsulot buyurtmasi — berilsa summani server narxnomadan hisoblaydi. */
  items?: MoneyItemCreateDTO[];
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
  /** Narxnomadan buyurtma qilish uchun token (counterparty biznes bo'lsa). */
  token?: string;
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
  token,
  onClose,
  onSubmit,
}) => {
  const { t } = useI18n();
  const { baseCurrency } = useCurrency();
  const { workspace } = useContext(WorkspaceContext);
  const theme = useAppTheme();
  const keyboardInset = useKeyboardInset();
  const { colors } = theme;
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [amount, setAmount] = useState('');
  const [calcOpen, setCalcOpen] = useState(false);
  /**
   * Summa kalkulyatorda hisoblangan bo'lsa — o'sha ifoda ("10×2+55÷99").
   * Yozuv bilan birga saqlanadi va tafsilotda ko'rinadi.
   */
  const [calcExpression, setCalcExpression] = useState('');
  const [currency, setCurrency] = useState<Currency>(baseCurrency);
  const [counterpartyId, setCounterpartyId] = useState('');
  const [targetType, setTargetType] = useState<PartyType>('PROFILE');
  const [description, setDescription] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [error, setError] = useState('');
  const [basketOpen, setBasketOpen] = useState(false);
  /**
   * Savatdagi qatorlar. Summa maydoni ular asosida to'ldiriladi, lekin
   * yakuniy so'z serverda: u narxni o'z narxnomasidan qayta o'qiydi.
   */
  const [orderItems, setOrderItems] = useState<MoneyItemCreateDTO[]>([]);

  // Har ochilishda toza forma — yopilish yo'lidan (bekor/hardware back/muvaffaqiyat)
  // qat'i nazar eski qiymatlar qolib ketmaydi.
  useEffect(() => {
    if (!visible) return;
    setAmount('');
    setCalcExpression('');
    setCurrency(baseCurrency);
    setCounterpartyId('');
    setTargetType('PROFILE');
    setDescription('');
    setSelectedMemberId('');
    setError('');
    setOrderItems([]);
  }, [visible, baseCurrency]);

  const effectiveType = fixedCounterpartyType ?? targetType;
  const effectiveCounterpartyId = (fixedCounterpartyId ?? counterpartyId).trim();
  const businessIdForMembers = effectiveType === 'BUSINESS_ACCOUNT' ? effectiveCounterpartyId : '';

  /**
   * Savat QAYSI narxnomadan yig'iladi.
   *
   * Ikki yo'nalish ham hayotiy:
   *  - qarama-qarshi tomon BIZNES bo'lsa — uning katalogi (men do'kondan
   *    xarid qilyapman, "Oldim");
   *  - aks holda men biznes ish maydonida bo'lsam — O'Z katalogim (men
   *    mijozga sotyapman, "Berdim"). Do'kon uchun aynan shu asosiy holat.
   * Shaxsiy hisob + shaxsiy kontakt — narxnoma yo'q, savat ham chiqmaydi.
   */
  const catalogBusinessId =
    effectiveType === 'BUSINESS_ACCOUNT'
      ? effectiveCounterpartyId
      : workspace.mode === 'business'
        ? workspace.activeBusinessId ?? ''
        : '';

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
    // Summa QO'LDA o'zgartirilsa ifoda endi unga mos kelmaydi — saqlangan
    // "10×2" yonida boshqa son turishi yolg'on tarix bo'lardi.
    setCalcExpression('');
    // Savat ham shu sababdan bekor qilinadi: summa endi qatorlarga mos emas.
    setOrderItems([]);
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
  /**
   * Ovozdan tushunilgani formaga qo'yiladi.
   *
   * Summa va kontakt FAQAT bo'sh maydonga yoziladi — qoidalar
   * `applyTransactionIntent` da, test bilan. Saqlash bosilmaydi: odam
   * ko'rib, o'zi tasdiqlaydi.
   */
  const handleVoiceIntent = useCallback(
    (intent: VoiceIntent) => {
      const patch = applyTransactionIntent(
        intent,
        { amount, description, counterpartyId, counterpartyEditable: !fixedCounterpartyId },
        formatAmountInput,
      );
      setError('');
      setDescription(patch.description);
      if (patch.amount !== undefined) setAmount(patch.amount);
      if (patch.counterpartyId !== undefined) setCounterpartyId(patch.counterpartyId);
    },
    [amount, counterpartyId, description, fixedCounterpartyId],
  );

  const handleDescriptionChange = useCallback((value: string) => {
    setError('');
    setDescription(value);
  }, []);

  /** Savat tasdiqlanganda: summa, valyuta va izoh avtomatik to'ladi. */
  const handleBasketConfirm = useCallback((result: BasketResult) => {
    setError('');
    setOrderItems(result.items);
    setAmount(formatAmountInput(String(result.total)));
    setCurrency(result.currency);
    setCalcExpression(result.calcNote);
    setBasketOpen(false);
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
        calcNote: calcExpression || undefined,
        items: orderItems.length > 0 ? orderItems : undefined,
        fromAccountType,
        toAccountType,
        moneyFlowType: flowForAccounts(fromAccountType, toAccountType),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : t('debts.saveFailed'));
    }
  }, [
    amount,
    calcExpression,
    orderItems,
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
          contentContainerStyle={[
            styles.scrollContent,
            // Klaviatura ochilganda "markaz" uning ustidagi maydonga suriladi.
            { paddingBottom: theme.spacing.lg + keyboardInset },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <View style={styles.titleRow}>
              <Text style={styles.title} accessibilityRole="header">
                {title}
              </Text>
              {/* Summani oldindan hisoblab olish uchun — ilovadan chiqmasdan. */}
              <Pressable
                onPress={() => setCalcOpen(true)}
                hitSlop={8}
                style={({ pressed }) => [styles.calcBtn, pressed && styles.calcBtnPressed]}
                accessibilityRole="button"
                accessibilityLabel={t('calc.title')}
              >
                <Ionicons name="calculator-outline" size={20} color={colors.primary} />
              </Pressable>
            </View>

            {/* Formaning eng tepasida: oyna ochilgan zahoti ko'rinadi.
                "Aliga ellik ming berdim" — summa, yo'nalish va odam birdan
                to'ladi, saqlashni foydalanuvchi bosadi. */}
            <VoiceBar
              kind="TRANSACTION"
              accountType={workspace.mode === 'business' ? 'business' : 'personal'}
              onResult={handleVoiceIntent}
            />

            <Input
              label={t('money.amount')}
              value={amount}
              keyboardType="number-pad"
              onChangeText={handleAmountChange}
              placeholder="100 000"
            />

            {/* Narxnomadan buyurtma — faqat qarama-qarshi tomon BIZNES bo'lganda:
                mahsulot ham, narx ham o'sha biznesning katalogidan keladi. */}
            {catalogBusinessId ? (
              <Pressable
                onPress={() => setBasketOpen(true)}
                style={({ pressed }) => [styles.basketBtn, pressed && styles.calcBtnPressed]}
                accessibilityRole="button"
                accessibilityLabel={t('basket.pick')}
              >
                <Ionicons name="basket-outline" size={18} color={colors.primary} />
                <Text style={styles.basketText} numberOfLines={1}>
                  {orderItems.length > 0
                    ? t('basket.selected', { count: orderItems.length })
                    : t('basket.pick')}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
              </Pressable>
            ) : null}

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

          {catalogBusinessId ? (
            <ProductBasketModal
              visible={basketOpen}
              businessId={catalogBusinessId}
              token={token}
              onClose={() => setBasketOpen(false)}
              onConfirm={handleBasketConfirm}
            />
          ) : null}

          <CalculatorModal
            visible={calcOpen}
            initialValue={amount}
            onClose={() => setCalcOpen(false)}
            onApply={(value, expression) => {
              handleAmountChange(value);
              setCalcExpression(expression);
            }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const createStyles = ({ colors, spacing, radius, typography, shadows, glass }: ThemeValue) =>
  StyleSheet.create({
    // Summa maydonidan keyin turadi: odam avval "qancha" deb o'ylaydi, keyin
    // "aslida menda ro'yxat bor" deb eslaydi.
    basketBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginBottom: spacing.md,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceMuted,
    },
    basketText: {
      ...typography.button,
      flex: 1,
      fontSize: 14,
      color: colors.textPrimary,
    },
    backdrop: {
      flex: 1,
      ...glass.scrim,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingHorizontal: spacing.md,
      paddingTop: spacing.lg,
      paddingBottom: spacing.lg,
    },
    card: {
      ...modalCardLayout,
      ...glass.modal,
      borderRadius: radius.xxl,
      padding: spacing.md + 4,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    title: {
      ...typography.heading3,
      color: colors.textPrimary,
      flexShrink: 1,
    },
    calcBtn: {
      width: 44,
      height: 44,
      borderRadius: radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primarySoft,
    },
    calcBtnPressed: {
      opacity: 0.6,
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
      gap: spacing.sm,
      marginTop: spacing.xs,
    },
    actionBtn: {
      flex: 1,
    },
  });

export default MoneyActionModal;
