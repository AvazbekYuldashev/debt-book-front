import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Input from '../../../shared/ui/Input';
import ChipSelector from '../../../shared/ui/ChipSelector';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import { GAP_UNIT_PRESETS, customUnit, goodsUnit, splitUnit } from '../model/gapUnits';
import type { GapUnit } from '../types/gap';

const CUSTOM = '__custom__';

interface GapUnitPickerProps {
  /** Boshlang'ich qiymat — tahrirlashda yoki guruhning odatiy birligi. */
  value: GapUnit | null;
  onChange: (unit: GapUnit | null) => void;
  /** Qayta ochilganda holatni tiklash uchun kalit. */
  resetKey?: unknown;
}

/**
 * O'lchov birligini tanlash.
 *
 * Pul tanlansa boshqa savol yo'q. Qolgan hamma holatda NIMA o'lchanayotgani
 * so'raladi: 1 kg go'sht bilan 1 kg guruch bir xil narsa emas, ularni bitta
 * ustunga qo'shib bo'lmaydi. Bu "Boshqa" ga ham tegishli — bir qop guruch
 * bir qop un emas.
 *
 * Kiritilgan mahsulot birlik kalitiga kiradi, shuning uchun ular statistikada
 * hech qachon aralashmaydi.
 */
const GapUnitPicker: React.FC<GapUnitPickerProps> = ({ value, onChange, resetKey }) => {
  const theme = useAppTheme();
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const initial = useMemo(() => splitUnit(value), [value]);
  const [measureCode, setMeasureCode] = useState<string>(initial.measureCode ?? CUSTOM);
  const [substance, setSubstance] = useState<string>(initial.substance);
  const [customLabel, setCustomLabel] = useState<string>(
    initial.measureCode ? '' : initial.substance
  );

  // Oyna qayta ochilganda boshlang'ich qiymatga qaytamiz.
  useEffect(() => {
    const parts = splitUnit(value);
    setMeasureCode(parts.measureCode ?? (value?.code ? CUSTOM : 'UZS'));
    setSubstance(parts.measureCode ? parts.substance : '');
    setCustomLabel(parts.measureCode ? '' : parts.substance);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  const measure = GAP_UNIT_PRESETS.find((preset) => preset.code === measureCode) ?? null;
  const isCustom = measureCode === CUSTOM;
  // Nima ekani pul birliklaridan tashqari HAMMA holatda so'raladi: "qop" ham
  // "kg" kabi yolg'iz o'zi ma'nosiz — bir qop guruch bir qop un emas.
  const needsSubstance = isCustom || measure?.type === 'GOODS';

  // Tanlov o'zgarganda tayyor birlikni yuqoriga uzatamiz.
  useEffect(() => {
    if (isCustom) {
      const base = customLabel.trim() ? customUnit(customLabel) : null;
      if (!base) {
        onChange(null);
        return;
      }
      onChange(substance.trim() ? goodsUnit(base, substance) : null);
      return;
    }
    if (!measure) {
      onChange(null);
      return;
    }
    if (measure.type === 'MONEY') {
      onChange(measure);
      return;
    }
    // Mahsulotda nima ekani majburiy — busiz birlik ma'nosiz bo'lardi.
    onChange(substance.trim() ? goodsUnit(measure, substance) : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [measureCode, substance, customLabel]);

  const options = useMemo(
    () => [
      ...GAP_UNIT_PRESETS.map((preset) => ({ value: preset.code, label: preset.label })),
      { value: CUSTOM, label: t('gap.unitCustom') },
    ],
    [t]
  );

  return (
    <View style={styles.wrap}>
      <ChipSelector
        label={t('gap.fieldUnit')}
        options={options}
        value={measureCode}
        onChange={setMeasureCode}
        layout="wrap"
      />

      {isCustom ? (
        <Input
          label={t('gap.fieldUnitCustom')}
          value={customLabel}
          onChangeText={setCustomLabel}
          placeholder="qop, bosh, quti ..."
        />
      ) : null}

      {needsSubstance ? (
        <>
          <Input
            label={t('gap.fieldSubstance')}
            value={substance}
            onChangeText={setSubstance}
            placeholder="go'sht, guruch, yog' ..."
          />
          <Text style={styles.hint}>{t('gap.substanceHint')}</Text>
        </>
      ) : null}
    </View>
  );
};

const createStyles = ({ colors, spacing, typography }: ThemeValue) =>
  StyleSheet.create({
    wrap: {
      gap: spacing.sm,
    },
    hint: {
      ...typography.caption,
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: -spacing.xs,
    },
  });

export default GapUnitPicker;
