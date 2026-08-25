import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import Button from '../../../shared/ui/Button';
import Input from '../../../shared/ui/Input';
import ChipSelector from '../../../shared/ui/ChipSelector';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import { CURRENCIES, DEFAULT_CURRENCY, type Currency } from '../../../shared/types/money';
import { formatCurrency } from '../../../shared/lib/currency';
import type { GapGroupCreateDTO, GapQueueMode, GapUnpaidRule } from '../types/gap';

interface GapCreateGroupModalProps {
  visible: boolean;
  saving: boolean;
  onClose: () => void;
  onSubmit: (dto: GapGroupCreateDTO) => void;
}

const RULES: GapUnpaidRule[] = ['WAIT', 'PARTIAL', 'COVER'];

const GapCreateGroupModal: React.FC<GapCreateGroupModalProps> = ({
  visible,
  saving,
  onClose,
  onSubmit,
}) => {
  const theme = useAppTheme();
  const { colors } = theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useI18n();

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  /**
   * Kassa nimada o'lchanadi.
   *
   * So'm, dollar, rubl, yog', guruch - odam uchun bularning hammasi bitta
   * savolning javobi. Shuning uchun bitta tanlov: uchta tayyor valyuta yoki
   * "Boshqa" - va o'shanda nomini o'zi yozadi.
   */
  const [unit, setUnit] = useState<Currency | 'OTHER'>(DEFAULT_CURRENCY);
  const [payoutDay, setPayoutDay] = useState('5');
  const [totalShares, setTotalShares] = useState('');
  const [unpaidRule, setUnpaidRule] = useState<GapUnpaidRule>('WAIT');
  const [guarantorRequired, setGuarantorRequired] = useState(false);
  /** "Boshqa" tanlanganda: birlik nomi. */
  const [unitLabel, setUnitLabel] = useState('');

  /** Valyuta - faqat tayyor uchtasidan biri tanlanganda ma'noli. */
  const currency: Currency = unit === 'OTHER' ? DEFAULT_CURRENCY : unit;
  const customUnit = unit === 'OTHER' ? unitLabel.trim() : '';
  /**
   * Navbat usuli guruh ochilishida hal qilinadi - keyin ikkilanish qolmaydi:
   *   ONE_BY_ONE - har oy qayta belgilanadi;
   *   ALL_MANUAL - butun tartib boshida qo'lda yoziladi;
   *   ALL_RANDOM - butun tartib boshida qur'a bilan.
   */
  const [queueChoice, setQueueChoice] =
    useState<'ONE_BY_ONE' | 'ALL_MANUAL' | 'ALL_RANDOM'>('ONE_BY_ONE');
  const [error, setError] = useState('');

  const parsedAmount = Number(amount.replace(/\s/g, '').replace(',', '.'));
  const parsedShares = Number(totalShares);
  const parsedDay = Number(payoutDay);

  /**
   * Bir kassa = badal x (ulushlar soni - 1).
   * Bu summa guruh OCHILISHIDAN OLDIN ko'rinishi kerak — TZ talabi.
   */
  const preview = useMemo(() => {
    if (!Number.isFinite(parsedAmount) || !Number.isFinite(parsedShares) || parsedShares < 2) {
      return null;
    }
    return {
      months: parsedShares,
      payout: customUnit
        ? `${new Intl.NumberFormat('uz-UZ').format(parsedAmount * (parsedShares - 1))} ${customUnit}`
        : formatCurrency(parsedAmount * (parsedShares - 1), currency),
    };
  }, [parsedAmount, parsedShares, currency, customUnit]);

  const reset = () => {
    setName('');
    setAmount('');
    setUnit(DEFAULT_CURRENCY);
    setUnitLabel('');
    setPayoutDay('5');
    setTotalShares('');
    setUnpaidRule('WAIT');
    setGuarantorRequired(false);
    setError('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      setError(t('gap.create.errorName'));
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError(t('gap.create.errorAmount'));
      return;
    }
    if (!Number.isFinite(parsedDay) || parsedDay < 1 || parsedDay > 28) {
      setError(t('gap.create.errorDay'));
      return;
    }
    if (!Number.isFinite(parsedShares) || parsedShares < 2) {
      setError(t('gap.create.errorShares'));
      return;
    }
    setError('');
    onSubmit({
      name: name.trim(),
      contributionAmount: parsedAmount,
      currency,
      payoutDay: parsedDay,
      totalShares: parsedShares,
      unpaidRule,
      queueMode: (queueChoice === 'ONE_BY_ONE' ? 'PER_ROUND' : 'FIXED') as GapQueueMode,
      queueOrderType:
        queueChoice === 'ALL_MANUAL' ? 'MANUAL' : queueChoice === 'ALL_RANDOM' ? 'RANDOM' : undefined,
      unitLabel: customUnit || undefined,
      guarantorRequired,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>{t('gap.create.title')}</Text>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Input
              label={t('gap.create.name')}
              placeholder={t('gap.create.namePlaceholder')}
              value={name}
              onChangeText={setName}
              containerStyle={styles.field}
            />

            <Input
              label={t('gap.create.amount')}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              containerStyle={styles.field}
            />

            {/* Bitta savol: kassa nimada o'lchanadi. */}
            <ChipSelector
              label={t('gap.create.unit')}
              options={[
                ...CURRENCIES.map((item) => ({ value: item as Currency | 'OTHER', label: item })),
                { value: 'OTHER' as Currency | 'OTHER', label: t('gap.create.unitOther') },
              ]}
              value={unit}
              onChange={setUnit}
              style={styles.field}
            />
            {unit === 'OTHER' ? (
              <>
                <Input
                  label={t('gap.create.unitLabel')}
                  value={unitLabel}
                  onChangeText={setUnitLabel}
                  containerStyle={styles.field}
                />
                <Text style={styles.hint}>{t('gap.create.unitOtherHint')}</Text>
              </>
            ) : null}

            <Input
              label={t('gap.create.payoutDay')}
              value={payoutDay}
              onChangeText={setPayoutDay}
              keyboardType="numeric"
              containerStyle={styles.field}
            />

            <Input
              label={t('gap.create.totalShares')}
              value={totalShares}
              onChangeText={setTotalShares}
              keyboardType="numeric"
              containerStyle={styles.field}
            />
            <Text style={styles.hint}>{t('gap.create.sharesHint')}</Text>

            <ChipSelector
              label={t('gap.create.queueMode')}
              options={(['ONE_BY_ONE', 'ALL_MANUAL', 'ALL_RANDOM'] as const).map((item) => ({
                value: item,
                label: t(`gap.queueMode.${item}`),
              }))}
              value={queueChoice}
              onChange={setQueueChoice}
              style={styles.field}
            />
            <Text style={styles.hint}>{t(`gap.queueMode.${queueChoice}.hint`)}</Text>

            <ChipSelector
              label={t('gap.rule.label')}
              options={RULES.map((item) => ({ value: item, label: t(`gap.rule.${item}`) }))}
              value={unpaidRule}
              onChange={setUnpaidRule}
              style={styles.field}
            />

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>{t('gap.create.guarantorRequired')}</Text>
              <Switch
                value={guarantorRequired}
                onValueChange={setGuarantorRequired}
                trackColor={{ true: colors.primarySoft, false: colors.outline }}
                thumbColor={guarantorRequired ? colors.primary : colors.surface}
              />
            </View>

            {preview ? (
              <View style={styles.preview}>
                <Text style={styles.previewText}>
                  {t('gap.create.summary', { months: preview.months, amount: preview.payout })}
                </Text>
              </View>
            ) : null}

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Text style={styles.disclaimer}>{t('gap.noPayment')}</Text>
          </ScrollView>

          <View style={styles.actions}>
            <Button
              title={t('common.cancel')}
              onPress={handleClose}
              variant="secondary"
              style={styles.actionButton}
            />
            <Button
              title={t('gap.create.submit')}
              onPress={handleSubmit}
              loading={saving}
              style={styles.actionButton}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const createStyles = ({ colors, spacing, radius, typography }: ThemeValue) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.xs,
      paddingBottom: spacing.lg,
      maxHeight: '90%',
    },
    handle: {
      alignSelf: 'center',
      width: 42,
      height: 4,
      borderRadius: radius.pill,
      backgroundColor: colors.outline,
      marginBottom: spacing.sm,
    },
    title: {
      ...typography.heading2,
      color: colors.textPrimary,
      marginBottom: spacing.sm,
    },
    field: {
      marginBottom: spacing.sm,
    },
    hint: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: -spacing.xxs,
      marginBottom: spacing.sm,
    },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.xs,
    },
    switchLabel: {
      ...typography.body,
      color: colors.textPrimary,
    },
    preview: {
      backgroundColor: colors.primarySoft,
      borderRadius: radius.md,
      padding: spacing.sm,
      marginTop: spacing.xs,
    },
    previewText: {
      ...typography.body,
      fontWeight: '700',
      color: colors.primaryPressed,
      textAlign: 'center',
    },
    error: {
      ...typography.bodySmall,
      color: colors.danger,
      marginTop: spacing.xs,
    },
    disclaimer: {
      ...typography.caption,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: spacing.sm,
    },
    actions: {
      flexDirection: 'row',
      gap: spacing.xs,
      marginTop: spacing.sm,
    },
    actionButton: {
      flex: 1,
    },
  });

export default GapCreateGroupModal;
