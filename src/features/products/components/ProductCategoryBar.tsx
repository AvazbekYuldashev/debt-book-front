import React, { useCallback, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Input from '../../../shared/ui/Input';
import Button from '../../../shared/ui/Button';
import { modalCardLayout } from '../../../shared/ui/modalLayout';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';

export interface CategoryChip {
  id: string;
  name: string;
}

interface ProductCategoryBarProps {
  categories: ReadonlyArray<CategoryChip>;
  /** Bo'sh satr = "hammasi". */
  value: string;
  onChange: (next: string) => void;
  /** Yozish huquqi bo'lmasa qo'shish/o'chirish ko'rinmaydi. */
  allowManage: boolean;
  onCreate: (name: string) => Promise<boolean>;
  onDelete: (category: CategoryChip) => void;
}

/**
 * Narxnoma kategoriyalari qatori: filtr + boshqaruv.
 *
 * ChipSelector emas, o'zimizniki: bu yerda chiplar nafaqat tanlanadi,
 * balki uzoq bosilganda o'chiriladi va oxirida "+" tugmasi turadi —
 * umumiy komponentga bu xulqlarni tiqishtirish uni boshqa joylarda
 * og'irlashtirardi.
 */
const ProductCategoryBar: React.FC<ProductCategoryBarProps> = ({
  categories,
  value,
  onChange,
  allowManage,
  onCreate,
  onDelete,
}) => {
  const theme = useAppTheme();
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const openAdd = useCallback(() => {
    setName('');
    setError('');
    setAdding(true);
  }, []);

  const submit = useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError(t('products.categoryNameRequired'));
      return;
    }
    setSaving(true);
    setError('');
    const ok = await onCreate(trimmed);
    setSaving(false);
    if (ok) setAdding(false);
    else setError(t('products.categorySaveFailed'));
  }, [name, onCreate, t]);

  // Kategoriya yo'q va qo'shish ham mumkin emas — butun qatorni ko'rsatmaymiz.
  if (categories.length === 0 && !allowManage) return null;

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        keyboardShouldPersistTaps="handled"
      >
        <Chip
          label={t('products.allCategories')}
          selected={value === ''}
          onPress={() => onChange('')}
          styles={styles}
        />

        {categories.map((category) => (
          <Chip
            key={category.id}
            label={category.name}
            selected={value === category.id}
            onPress={() => onChange(category.id)}
            // Uzoq bosish — o'chirish. Har chipga alohida "x" qo'yilsa qator
            // tirband bo'lib, tasodifiy bosish ehtimoli ortardi.
            onLongPress={allowManage ? () => onDelete(category) : undefined}
            styles={styles}
          />
        ))}

        {allowManage ? (
          <Pressable
            onPress={openAdd}
            style={({ pressed }) => [styles.chip, styles.addChip, pressed && styles.chipPressed]}
            accessibilityRole="button"
            accessibilityLabel={t('products.addCategory')}
            hitSlop={4}
          >
            <Ionicons name="add" size={16} color={theme.colors.primary} />
            <Text style={styles.addText}>{t('products.addCategory')}</Text>
          </Pressable>
        ) : null}
      </ScrollView>

      <Modal visible={adding} transparent animationType="fade" onRequestClose={() => setAdding(false)}>
        <View style={styles.backdrop}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('products.addCategory')}</Text>
            <Input
              label={t('products.categoryName')}
              value={name}
              onChangeText={setName}
              placeholder={t('products.categoryNamePlaceholder')}
              autoFocus
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <View style={styles.actions}>
              <Button
                title={t('common.cancel')}
                variant="secondary"
                onPress={() => setAdding(false)}
                style={styles.action}
              />
              <Button
                title={t('common.save')}
                onPress={submit}
                loading={saving}
                style={styles.action}
              />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  styles: ReturnType<typeof createStyles>;
}

const Chip: React.FC<ChipProps> = ({ label, selected, onPress, onLongPress, styles }) => (
  <Pressable
    onPress={onPress}
    onLongPress={onLongPress}
    delayLongPress={450}
    style={({ pressed }) => [styles.chip, selected && styles.chipSelected, pressed && styles.chipPressed]}
    accessibilityRole="radio"
    accessibilityLabel={label}
    accessibilityState={{ checked: selected }}
    hitSlop={4}
  >
    <Text style={[styles.chipText, selected && styles.chipTextSelected]} numberOfLines={1}>
      {label}
    </Text>
  </Pressable>
);

const createStyles = ({ colors, spacing, radius, typography, glass, shadows }: ThemeValue) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xxs,
    },
    chip: {
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceMuted,
      maxWidth: 180,
    },
    chipSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
    },
    chipPressed: {
      opacity: 0.7,
    },
    chipText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    chipTextSelected: {
      color: colors.primary,
    },
    addChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderStyle: 'dashed',
      borderColor: colors.primary,
      backgroundColor: 'transparent',
    },
    addText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.primary,
    },
    backdrop: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: spacing.md,
      ...glass.scrim,
    },
    card: {
      ...modalCardLayout,
      ...glass.modal,
      borderRadius: radius.lg,
      padding: spacing.md,
      ...shadows.floating,
    },
    cardTitle: {
      ...typography.heading3,
      marginBottom: spacing.sm,
      color: colors.textPrimary,
    },
    error: {
      ...typography.caption,
      marginTop: spacing.xs,
      color: colors.negative,
    },
    actions: {
      flexDirection: 'row',
      gap: spacing.xs,
      marginTop: spacing.md,
    },
    action: {
      flex: 1,
    },
  });

export default ProductCategoryBar;
