import React, { memo, useMemo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SkeletonShimmer from '../../../shared/ui/SkeletonShimmer';
import { BusinessDTO } from '../types/business';
import { useI18n } from '../../../shared/i18n';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';

interface WorkspacePickerModalProps {
  visible: boolean;
  businesses: BusinessDTO[];
  loading: boolean;
  errorText?: string;
  isPersonal: boolean;
  activeBusinessId?: string;
  onClose: () => void;
  onSelectPersonal: () => void;
  onSelectBusiness: (business: BusinessDTO) => void;
  onManage: () => void;
  onCreate: () => void;
}

/** Workspace (shaxsiy/biznes) tanlash dropdown modali. */
const WorkspacePickerModal: React.FC<WorkspacePickerModalProps> = ({
  visible,
  businesses,
  loading,
  errorText,
  isPersonal,
  activeBusinessId,
  onClose,
  onSelectPersonal,
  onSelectBusiness,
  onManage,
  onCreate,
}) => {
  const { t } = useI18n();
  const theme = useAppTheme();
  const { colors } = theme;
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('common.cancel')}>
        {/* Karta ichidagi bosishlar backdrop'ga o'tmasin. */}
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title} accessibilityRole="header">
            {t('workspace.title')}
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.optionRow,
              isPersonal && styles.optionActive,
              pressed && styles.optionPressed,
            ]}
            onPress={onSelectPersonal}
            accessibilityRole="button"
            accessibilityState={{ selected: isPersonal }}
            accessibilityLabel={t('workspace.personal')}
          >
            <Text style={styles.optionText}>{t('workspace.personal')}</Text>
            {isPersonal ? <Ionicons name="checkmark" size={16} color={colors.primary} /> : null}
          </Pressable>

          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>{t('business.myBusinesses')}</Text>
            <Pressable
              onPress={onManage}
              style={({ pressed }) => pressed && styles.optionPressed}
              accessibilityRole="link"
              accessibilityLabel={t('workspace.manage')}
              hitSlop={6}
            >
              <Text style={styles.linkText}>{t('workspace.manage')}</Text>
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.skeletonWrap}>
              <SkeletonShimmer height={38} borderRadius={theme.radius.md} />
              <SkeletonShimmer height={38} borderRadius={theme.radius.md} />
            </View>
          ) : businesses.length === 0 ? (
            <Text style={styles.emptyText}>{t('workspace.noBusiness')}</Text>
          ) : (
            <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
              {businesses.map((business) => {
                const isActive = business.id === activeBusinessId;
                return (
                  <Pressable
                    key={business.id}
                    style={({ pressed }) => [
                      styles.optionRow,
                      isActive && styles.optionActive,
                      pressed && styles.optionPressed,
                    ]}
                    onPress={() => onSelectBusiness(business)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isActive }}
                    accessibilityLabel={business.name}
                  >
                    <View style={styles.businessMeta}>
                      <Text style={styles.optionText} numberOfLines={1}>
                        {business.name}
                      </Text>
                      <Text style={styles.businessSub}>{business.currentRole}</Text>
                    </View>
                    {isActive ? <Ionicons name="checkmark" size={16} color={colors.primary} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          {errorText ? <Text style={styles.error}>{errorText}</Text> : null}

          <Pressable
            style={({ pressed }) => [styles.createBtn, pressed && styles.createBtnPressed]}
            onPress={onCreate}
            accessibilityRole="button"
            accessibilityLabel={t('business.createTitle')}
          >
            <Ionicons name="add-circle-outline" size={16} color={colors.textOnPrimary} />
            <Text style={styles.createBtnText}>{t('business.createTitle')}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const createStyles = ({ colors, spacing, radius, typography }: ThemeValue) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'center',
      paddingHorizontal: spacing.md,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.sm,
      maxHeight: '75%',
    },
    title: {
      ...typography.heading2,
      fontSize: 17,
      color: colors.textPrimary,
      marginBottom: spacing.xs,
    },
    sectionRow: {
      marginTop: spacing.xs,
      marginBottom: spacing.xxs,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    sectionTitle: {
      ...typography.label,
      color: colors.textSecondary,
    },
    linkText: {
      ...typography.label,
      fontSize: 12,
      color: colors.primary,
    },
    list: {
      flexGrow: 0,
    },
    optionRow: {
      minHeight: 38,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: spacing.xs,
      paddingVertical: spacing.xxs,
      marginBottom: spacing.xxs,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surface,
    },
    optionActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
    },
    optionPressed: {
      opacity: 0.7,
    },
    optionText: {
      ...typography.bodySmall,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    businessMeta: {
      flexShrink: 1,
    },
    businessSub: {
      ...typography.caption,
      fontSize: 11,
      marginTop: 2,
      color: colors.textSecondary,
    },
    skeletonWrap: {
      gap: spacing.xxs,
      marginBottom: spacing.xxs,
    },
    emptyText: {
      ...typography.bodySmall,
      color: colors.textSecondary,
      marginBottom: spacing.xs,
    },
    error: {
      ...typography.caption,
      color: colors.danger,
      marginTop: spacing.xxs,
    },
    createBtn: {
      marginTop: spacing.xs,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xxs,
      borderRadius: radius.md,
      backgroundColor: colors.primary,
      minHeight: 40,
    },
    createBtnPressed: {
      backgroundColor: colors.primaryPressed,
    },
    createBtnText: {
      ...typography.button,
      fontSize: 13,
      color: colors.textOnPrimary,
    },
  });

export default memo(WorkspacePickerModal);
