import React, { useCallback, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import ScreenHeader from '../../../shared/ui/ScreenHeader';
import Input from '../../../shared/ui/Input';
import Button from '../../../shared/ui/Button';
import ChipSelector from '../../../shared/ui/ChipSelector';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import type { GapScreenProps } from '../../../app/navigation/types';
import { ROUTES } from '../../../app/navigation/routes';
import { useCreateGap } from '../hooks/useGap';
import { formatGapAmountInput, parseGapAmountInput } from '../model/gapFormat';
import { GAP_UNIT_PRESETS, customUnit } from '../model/gapUnits';
import type { GapUnit } from '../types/gap';

const CUSTOM = '__custom__';

/**
 * Yangi gap kassa yaratish.
 *
 * A'zolar bu yerda so'ralmaydi — ularni qo'shish guruh ichidagi jarayon.
 * Shu sababli forma faqat guruhning o'zgarmas shartlarini oladi va guruh
 * DRAFT holatida yaratiladi; keyin a'zolar ekraniga o'tiladi.
 */
const GapCreateScreen: React.FC<GapScreenProps<typeof ROUTES.GAP_CREATE>> = ({ navigation }) => {
  const theme = useAppTheme();
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const createMutation = useCreateGap();

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [unitCode, setUnitCode] = useState<string>('UZS');
  const [customLabel, setCustomLabel] = useState('');
  const [paymentDay, setPaymentDay] = useState('5');
  const [queueMode, setQueueMode] = useState<'UPFRONT' | 'MONTHLY'>('UPFRONT');
  const [queueType, setQueueType] = useState<'AGREEMENT' | 'LOTTERY'>('AGREEMENT');
  const [error, setError] = useState<string | null>(null);

  const unitOptions = useMemo(
    () => [
      ...GAP_UNIT_PRESETS.map((unit) => ({ value: unit.code, label: unit.label })),
      { value: CUSTOM, label: t('gap.unitCustom') },
    ],
    [t]
  );

  const selectedUnit: GapUnit | null = useMemo(() => {
    if (unitCode === CUSTOM) {
      return customLabel.trim() ? customUnit(customLabel) : null;
    }
    return GAP_UNIT_PRESETS.find((unit) => unit.code === unitCode) ?? null;
  }, [unitCode, customLabel]);

  const handleSubmit = useCallback(() => {
    setError(null);

    const parsedAmount = parseGapAmountInput(amount);
    const day = Number(paymentDay);

    if (!name.trim()) return setError(t('gap.errName'));
    if (!parsedAmount) return setError(t('gap.errAmount'));
    if (!selectedUnit) return setError(t('gap.errUnit'));
    if (!Number.isFinite(day) || day < 1 || day > 31) return setError(t('gap.errPaymentDay'));

    createMutation.mutate(
      {
        name: name.trim(),
        amount: parsedAmount,
        unitType: selectedUnit.type,
        unitCode: selectedUnit.code,
        unitLabel: selectedUnit.label,
        paymentDay: day,
        queueMode,
        queueType,
        members: [],
      },
      {
        // Yaratilgach darhol a'zolar ekraniga o'tamiz — keyingi qadam o'sha yerda.
        onSuccess: (groupId) => {
          navigation.replace(ROUTES.GAP_DETAIL, {
            id: groupId,
            name: name.trim(),
            amount: parsedAmount,
            unitCode: selectedUnit.code,
            unitLabel: selectedUnit.label,
            unitType: selectedUnit.type,
            currentPeriod: 0,
            totalPeriods: 0,
            status: 'DRAFT',
            queueMode,
            organizer: true,
          });
        },
        onError: (err) => setError((err as Error).message),
      }
    );
  }, [name, amount, selectedUnit, paymentDay, queueMode, queueType, createMutation, navigation, t]);

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('gap.createTitle')} onBack={navigation.goBack} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Input label={t('gap.fieldName')} value={name} onChangeText={setName} />

          <Input
            label={t('gap.fieldAmount')}
            value={amount}
            onChangeText={(text) => setAmount(formatGapAmountInput(text))}
            keyboardType="decimal-pad"
            placeholder="1.5"
          />

          <ChipSelector
            label={t('gap.fieldUnit')}
            options={unitOptions}
            value={unitCode}
            onChange={setUnitCode}
            layout="wrap"
          />
          {unitCode === CUSTOM ? (
            <Input
              label={t('gap.fieldUnitCustom')}
              value={customLabel}
              onChangeText={setCustomLabel}
              placeholder="qop, bosh, quti ..."
            />
          ) : null}

          <Input
            label={t('gap.fieldPaymentDay')}
            value={paymentDay}
            onChangeText={(text) => setPaymentDay(text.replace(/\D/g, '').slice(0, 2))}
            keyboardType="numeric"
          />

          <ChipSelector
            label={t('gap.fieldQueueMode')}
            options={[
              { value: 'UPFRONT', label: t('gap.queueUpfront') },
              { value: 'MONTHLY', label: t('gap.queueMonthly') },
            ]}
            value={queueMode}
            onChange={setQueueMode}
            layout="fluid"
          />
          <Text style={styles.hint}>
            {queueMode === 'UPFRONT' ? t('gap.queueUpfrontHint') : t('gap.queueMonthlyHint')}
          </Text>

          {queueMode === 'UPFRONT' ? (
            <ChipSelector
              label={t('gap.fieldQueueType')}
              options={[
                { value: 'AGREEMENT', label: t('gap.queueAgreement') },
                { value: 'LOTTERY', label: t('gap.queueLottery') },
              ]}
              value={queueType}
              onChange={setQueueType}
              layout="fluid"
            />
          ) : null}

          <Text style={styles.note}>{t('gap.membersLaterHint')}</Text>
          <Text style={styles.note}>{t('gap.startDateHint')}</Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button
            title={t('gap.createSubmit')}
            onPress={handleSubmit}
            loading={createMutation.isPending}
            style={styles.submit}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const createStyles = ({ colors, spacing, radius, typography }: ThemeValue) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    flex: {
      flex: 1,
    },
    content: {
      padding: spacing.md,
      paddingBottom: spacing.xxl,
      gap: spacing.sm,
    },
    hint: {
      ...typography.caption,
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: -spacing.xxs,
    },
    note: {
      ...typography.caption,
      fontSize: 12,
      color: colors.textSecondary,
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.md,
      padding: spacing.sm,
      marginTop: spacing.xs,
    },
    error: {
      ...typography.caption,
      color: colors.danger,
      textAlign: 'center',
    },
    submit: {
      marginTop: spacing.sm,
    },
  });

export default GapCreateScreen;
