import React, { memo, useCallback, useMemo } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../theme';
import type { ThemeValue } from '../../theme/ThemeProvider';
import { useI18n } from '../../i18n';
import { formatMoney } from '../../utils/money';
import { getInitials, pickAvatarColor } from '../../shared/ui/avatar';
import { buildAttachUrl } from '../../shared/attachUrl';
import type { CategoryResponseDTO } from '../../types/category';

interface CategoryRowProps {
  category: CategoryResponseDTO;
  sum: number;
  isLast: boolean;
  allowManage: boolean;
  expanded: boolean;
  pinning: boolean;
  deleting: boolean;
  onOpen: (category: CategoryResponseDTO) => void;
  onToggleExpand: (id: string) => void;
  onTogglePin: (category: CategoryResponseDTO) => void;
  onEdit: (category: CategoryResponseDTO) => void;
  onRequestDelete: (category: CategoryResponseDTO) => void;
  /** Avatarga bosilganda biriktirilgan rasmni to'liq ekranda ko'rsatadi. */
  onViewPhoto: (category: CategoryResponseDTO) => void;
}

/**
 * Xarajat kategoriyasi qatori: avatar, nom, summa va (boshqaruv ruxsati bo'lsa)
 * kengayadigan amallar (pin/tahrir/o'chirish). `memo`langan.
 */
const CategoryRow: React.FC<CategoryRowProps> = ({
  category,
  sum,
  isLast,
  allowManage,
  expanded,
  pinning,
  deleting,
  onOpen,
  onToggleExpand,
  onTogglePin,
  onEdit,
  onRequestDelete,
  onViewPhoto,
}) => {
  const theme = useAppTheme();
  const { colors } = theme;
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const avatarColor = useMemo(() => pickAvatarColor(category.name || category.id), [category.name, category.id]);
  const photoUri = category.photoId ? buildAttachUrl(category.photoId) : undefined;

  const handleOpen = useCallback(() => onOpen(category), [onOpen, category]);
  const handleToggleExpand = useCallback(() => onToggleExpand(category.id), [onToggleExpand, category.id]);
  const handlePin = useCallback(() => onTogglePin(category), [onTogglePin, category]);
  const handleEdit = useCallback(() => onEdit(category), [onEdit, category]);
  const handleDelete = useCallback(() => onRequestDelete(category), [onRequestDelete, category]);
  const handleViewPhoto = useCallback(() => onViewPhoto(category), [onViewPhoto, category]);

  const avatarInner = photoUri ? (
    <Image source={{ uri: photoUri }} style={styles.avatarImage} />
  ) : (
    <View style={[styles.avatar, { backgroundColor: avatarColor.bg }]}>
      <Text style={[styles.avatarText, { color: avatarColor.fg }]}>{getInitials(category.name)}</Text>
    </View>
  );

  return (
    <View style={[styles.row, !isLast && styles.rowBorder]}>
      <Pressable
        style={({ pressed }) => [styles.main, pressed && styles.pressed]}
        onPress={handleOpen}
        accessibilityRole="button"
        accessibilityLabel={category.name}
      >
        {/* Rasm biriktirilgan bo'lsa avatar bosiladi va rasm to'liq ekranda ochiladi;
            rasm bo'lmasa bosish qatorning o'ziga (kategoriyani ochishga) o'tadi. */}
        {photoUri ? (
          <Pressable
            style={styles.avatarWrap}
            onPress={handleViewPhoto}
            accessibilityRole="button"
            accessibilityLabel={t('expenses.viewPhoto')}
            hitSlop={6}
          >
            {avatarInner}
          </Pressable>
        ) : (
          <View style={styles.avatarWrap}>{avatarInner}</View>
        )}
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {category.name}
          </Text>
          <Text style={styles.sum}>{formatMoney(sum)}</Text>
        </View>
        {category.pin ? <Ionicons name="bookmark" size={14} color={colors.primary} /> : null}
      </Pressable>

      {allowManage ? (
        expanded ? (
          <View style={styles.actions}>
            <IconButton onPress={handlePin} styles={styles} disabled={pinning}>
              {pinning ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons
                  name={category.pin ? 'bookmark' : 'bookmark-outline'}
                  size={17}
                  color={category.pin ? colors.primary : colors.textSecondary}
                />
              )}
            </IconButton>
            <IconButton onPress={handleEdit} styles={styles}>
              <Ionicons name="create-outline" size={17} color={colors.textSecondary} />
            </IconButton>
            <IconButton onPress={handleDelete} styles={styles} disabled={deleting}>
              {deleting ? (
                <ActivityIndicator size="small" color={colors.danger} />
              ) : (
                <Ionicons name="trash-outline" size={17} color={colors.danger} />
              )}
            </IconButton>
          </View>
        ) : (
          <IconButton onPress={handleToggleExpand} styles={styles}>
            <Ionicons name="ellipsis-horizontal" size={16} color={colors.textSecondary} />
          </IconButton>
        )
      ) : null}
    </View>
  );
};

interface IconButtonProps {
  onPress: () => void;
  disabled?: boolean;
  styles: ReturnType<typeof createStyles>;
  children: React.ReactNode;
}

const IconButton: React.FC<IconButtonProps> = ({ onPress, disabled, styles, children }) => (
  <Pressable
    style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
    onPress={onPress}
    disabled={disabled}
    accessibilityRole="button"
    hitSlop={4}
  >
    {children}
  </Pressable>
);

const createStyles = ({ colors, spacing, radius, typography }: ThemeValue) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm,
      gap: spacing.sm,
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
    avatarWrap: {
      position: 'relative',
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarImage: {
      width: 44,
      height: 44,
      borderRadius: radius.md,
      backgroundColor: colors.surfaceMuted,
    },
    avatarText: {
      ...typography.label,
      fontSize: 15,
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
    sum: {
      ...typography.caption,
      marginTop: spacing.xxs,
      fontSize: 13,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xxs,
    },
    iconBtn: {
      width: 30,
      height: 30,
      borderRadius: radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceMuted,
    },
  });

export default memo(CategoryRow);
