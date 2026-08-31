import React, { useCallback, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import ScreenHeader from '../../../shared/ui/ScreenHeader';
import Input from '../../../shared/ui/Input';
import Button from '../../../shared/ui/Button';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import type { GapScreenProps } from '../../../app/navigation/types';
import { ROUTES } from '../../../app/navigation/routes';
import { useCreateGap } from '../hooks/useGap';
import GapUnitPicker from '../components/GapUnitPicker';
import type { GapUnit } from '../types/gap';

/**
 * Yangi gap kassa yaratish.
 *
 * Forma ataylab qisqa: guruhga faqat nom va o'lchov birligi kerak. Badal,
 * to'lov kuni, navbat va qur'a degan narsalar yo'q — kim qachon va qancha
 * berishini a'zolar o'zlari hal qiladi.
 *
 * A'zolar bu yerda so'ralmaydi — ularni qo'shish guruh ichidagi jarayon,
 * shuning uchun yaratilgach darhol a'zolar ekraniga o'tiladi.
 */
const GapCreateScreen: React.FC<GapScreenProps<typeof ROUTES.GAP_CREATE>> = ({ navigation }) => {
  const theme = useAppTheme();
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const createMutation = useCreateGap();

  const [name, setName] = useState('');
  const [selectedUnit, setSelectedUnit] = useState<GapUnit | null>(null);
  const [error, setError] = useState<string | null>(null);



  const handleSubmit = useCallback(() => {
    setError(null);

    if (!name.trim()) return setError(t('gap.errName'));
    if (!selectedUnit) return setError(t('gap.errUnit'));

    createMutation.mutate(
      {
        name: name.trim(),
        unitType: selectedUnit.type,
        unitCode: selectedUnit.code,
        unitLabel: selectedUnit.label,
      },
      {
        // Yaratilgach ro'yxatga qaytamiz: yangi guruh boshida turadi va
        // foydalanuvchi uni o'zi ochadi. Ichkariga majburan kirgizish
        // "orqaga" tugmasini chalkashtirardi.
        onSuccess: () => navigation.goBack(),
        onError: (err) => setError((err as Error).message),
      }
    );
  }, [name, selectedUnit, createMutation, navigation, t]);

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('gap.createTitle')} onBack={navigation.goBack} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Input label={t('gap.fieldName')} value={name} onChangeText={setName} />

          <GapUnitPicker value={selectedUnit} onChange={setSelectedUnit} />

          <Text style={styles.note}>{t('gap.membersLaterHint')}</Text>
          <Text style={styles.note}>{t('gap.freeLedgerHint')}</Text>

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
