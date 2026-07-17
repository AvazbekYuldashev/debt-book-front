import React, { useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import UserAvatar from '../../../shared/ui/UserAvatar';
import InitialsAvatar from '../../../shared/ui/InitialsAvatar';
import { buildAttachUrl } from '../../../shared/lib/attachUrl';
import type { BusinessDTO } from '../../business/types/business';

const AVATAR_SIZE = 84;

interface ProfileAvatarProps {
  isBusiness: boolean;
  activeBusiness: BusinessDTO | null;
  personalPhotoUri: string;
  editing: boolean;
  /** Rasmni o'zgartirish huquqi: shaxsiyda har doim, biznesда faqat OWNER. */
  canEdit: boolean;
  onEditPhoto: () => void;
  onPreview: () => void;
}

/** Profil (yoki faol biznes) avatari va uni tahrirlash tugmasi. */
const ProfileAvatar: React.FC<ProfileAvatarProps> = ({
  isBusiness,
  activeBusiness,
  personalPhotoUri,
  editing,
  canEdit,
  onEditPhoto,
  onPreview,
}) => {
  const theme = useAppTheme();
  const { colors } = theme;
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const editButton = canEdit ? (
    <Pressable
      style={({ pressed }) => [styles.editBtn, pressed && styles.pressed]}
      onPress={onEditPhoto}
      disabled={editing}
      accessibilityRole="button"
      accessibilityLabel={t('contact.changePhoto')}
    >
      {editing ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <Ionicons name="create-outline" size={16} color={colors.primary} />
      )}
    </Pressable>
  ) : null;

  // Business rejimi — hech qachon shaxsiy foto ko'rsatilmaydi.
  if (isBusiness) {
    if (!activeBusiness) {
      return (
        <View style={styles.block}>
          <View style={[styles.businessAvatar, { backgroundColor: colors.surfaceMuted }]} />
        </View>
      );
    }
    return (
      <View style={styles.block}>
        {activeBusiness.photoId ? (
          <UserAvatar uri={buildAttachUrl(activeBusiness.photoId)} size={AVATAR_SIZE} />
        ) : (
          <InitialsAvatar name={activeBusiness.name} size={AVATAR_SIZE} />
        )}
        {editButton}
      </View>
    );
  }

  return (
    <View style={styles.block}>
      <Pressable onPress={onPreview} disabled={!personalPhotoUri} accessibilityRole="imagebutton">
        <UserAvatar uri={personalPhotoUri} size={AVATAR_SIZE} />
      </Pressable>
      {editButton}
    </View>
  );
};

const createStyles = ({ colors, spacing, radius, typography }: ThemeValue) =>
  StyleSheet.create({
    block: {
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    businessAvatar: {
      width: AVATAR_SIZE,
      height: AVATAR_SIZE,
      borderRadius: AVATAR_SIZE / 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    editBtn: {
      marginTop: spacing.xs,
      width: 34,
      height: 34,
      borderRadius: radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    pressed: {
      opacity: 0.6,
    },
  });

export default ProfileAvatar;
