import React, { memo, useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import IconButton from '../../../shared/ui/IconButton';
import { useI18n } from '../../../shared/i18n';
import { formatMoney } from '../../../shared/lib/money';
import { normalizeCurrency } from '../../../shared/lib/currency';
import { getInitials, pickAvatarColor } from '../../../shared/ui/avatar';
import { normalizeProductUnit, type ProductPublicDTO } from '../types/product';
import { formatUnitLabel } from '../model/unitLabel';

interface ProductRowProps {
  /**
   * `ProductPublicDTO` - eng kam maydonli ko'rinish. O'z narxnomasidagi
   * `ProductResponseDTO` uning ustiga qurilgani uchun ikkalasi ham tushadi:
   * qator begona do'kon katalogida ham, o'z ro'yxatida ham bir xil chiziladi.
   */
  product: ProductPublicDTO;
  isLast: boolean;
  /**
   * Tahrirlash/o'chirish tugmalari ko'rinadimi. Begona biznes katalogida va
   * MEMBER rolida - yo'q, shuning uchun standart qiymat `false`.
   */
  allowManage?: boolean;
  allowDelete?: boolean;
  deleting?: boolean;
  onEdit?: (product: ProductPublicDTO) => void;
  onRequestDelete?: (product: ProductPublicDTO) => void;
}

/**
 * Narxnoma qatori: nom + artikul, o'ng tomonda narx va birlik.
 *
 * Narx o'ngda va eng kuchli kontrastda — ro'yxatni odam aynan narx ustuni
 * bo'ylab ko'z yugurtirib o'qiydi, nom esa faqat topish uchun kerak.
 */
const ProductRow: React.FC<ProductRowProps> = ({
  product,
  isLast,
  allowManage = false,
  allowDelete = false,
  deleting = false,
  onEdit,
  onRequestDelete,
}) => {
  const theme = useAppTheme();
  const { colors } = theme;
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const avatarColor = useMemo(() => pickAvatarColor(product.name || product.id), [product.name, product.id]);

  const handleEdit = useCallback(() => onEdit?.(product), [onEdit, product]);
  const handleDelete = useCallback(() => onRequestDelete?.(product), [onRequestDelete, product]);

  const unit = normalizeProductUnit(product.unit);
  const priceText = formatMoney(product.price, normalizeCurrency(product.currency));
  // Ikkilamchi qator: artikul va izoh bitta joyda, "·" bilan ajratilgan.
  const meta = [product.code, product.description].filter(Boolean).join(' · ');

  return (
    <View style={[styles.row, !isLast && styles.rowBorder]}>
      <Pressable
        style={({ pressed }) => [styles.main, pressed && allowManage && styles.pressed]}
        onPress={allowManage ? handleEdit : undefined}
        disabled={!allowManage}
        accessibilityRole={allowManage ? 'button' : 'text'}
        accessibilityLabel={`${product.name}, ${priceText}`}
      >
        <View style={[styles.avatar, { backgroundColor: avatarColor.bg }]}>
          <Text style={[styles.avatarText, { color: avatarColor.fg }]}>{getInitials(product.name)}</Text>
        </View>

        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {product.name}
          </Text>
          {meta ? (
            <Text style={styles.meta} numberOfLines={1}>
              {meta}
            </Text>
          ) : null}
        </View>

        <View style={styles.priceWrap}>
          <Text style={styles.price} numberOfLines={1}>
            {priceText}
          </Text>
          <Text style={styles.unit} numberOfLines={1}>
            / {formatUnitLabel(product.amount, t(`products.unit.${unit}`))}
          </Text>
        </View>
      </Pressable>

      {allowManage ? (
        <View style={styles.actions}>
          <IconButton name="pencil" onPress={handleEdit} accessibilityLabel={t('common.edit')} />
          {allowDelete ? (
            <IconButton
              name="trash-outline"
              onPress={handleDelete}
              loading={deleting}
              color={colors.danger}
              accessibilityLabel={t('common.delete')}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
};

const createStyles = ({ colors, spacing, radius, typography }: ThemeValue) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm,
      gap: spacing.xs,
    },
    rowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    main: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderRadius: radius.md,
    },
    pressed: {
      opacity: 0.6,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      ...typography.label,
      fontSize: 14,
      fontWeight: '800',
    },
    info: {
      flex: 1,
    },
    name: {
      ...typography.bodySmall,
      fontSize: 15,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    meta: {
      ...typography.caption,
      marginTop: spacing.xxs,
      fontSize: 12,
      color: colors.textSecondary,
    },
    priceWrap: {
      alignItems: 'flex-end',
    },
    price: {
      ...typography.bodySmall,
      fontSize: 15,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    unit: {
      ...typography.caption,
      marginTop: spacing.xxs,
      fontSize: 12,
      color: colors.textSecondary,
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xxs,
    },
  });

export default memo(ProductRow);
