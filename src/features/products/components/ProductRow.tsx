import React, { memo, useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
  product: ProductPublicDTO & {
    /**
     * Yozuv oflaynda kiritilgan va hali serverga yetmagan.
     *
     * `ProductPublicDTO` ning o'zida bu maydon YO'Q va bo'lmasligi ham
     * kerak: u begona do'kon katalogi uchun, u yerda yuborilmagan
     * yozuv paydo bo'lmaydi. O'z narxnomasidagi `ProductResponseDTO`
     * esa shu belgini olib keladi.
     */
    pending?: boolean;
  };
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
  const isDark = theme.activeTheme === 'dark';
  const { colors } = theme;
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const avatarColor = useMemo(
    () => pickAvatarColor(product.name || product.id, isDark),
    [product.name, product.id, colors],
  );

  const handleEdit = useCallback(() => onEdit?.(product), [onEdit, product]);
  const handleDelete = useCallback(() => onRequestDelete?.(product), [onRequestDelete, product]);

  const unit = normalizeProductUnit(product.unit);
  const priceText = formatMoney(product.price, normalizeCurrency(product.currency));
  // Ikkilamchi qator: artikul va izoh bitta joyda, "·" bilan ajratilgan.
  const meta = [product.code, product.description].filter(Boolean).join(' · ');

  /* Oflaynda kiritilgan mahsulot hali serverda yo'q: id vaqtinchalik,
     ya'ni tahrirlash ham, o'chirish ham xatoga uchrardi. */
  const pending = Boolean(product.pending);
  const manageable = allowManage && !pending;

  return (
    <View style={[styles.row, !isLast && styles.rowBorder, pending && styles.rowPending]}>
      <Pressable
        style={({ pressed }) => [styles.main, pressed && manageable && styles.pressed]}
        onPress={manageable ? handleEdit : undefined}
        disabled={!manageable}
        accessibilityRole={manageable ? 'button' : 'text'}
        accessibilityLabel={`${product.name}, ${priceText}`}
      >
        <View style={[styles.avatar, { backgroundColor: avatarColor.bg }]}>
          <Text style={[styles.avatarText, { color: avatarColor.fg }]}>{getInitials(product.name)}</Text>
        </View>

        <View style={styles.info}>
          <View style={styles.nameRow}>
            {/* Soat belgisi — yozuv hali serverga yetmagani. */}
            {pending ? (
              <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
            ) : null}
            <Text style={styles.name} numberOfLines={1}>
              {product.name}
            </Text>
          </View>
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

      {manageable ? (
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
    /** Yuborilmagan yozuv biroz so'nik: u hali "yo'lda". */
    rowPending: {
      opacity: 0.7,
    },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
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
