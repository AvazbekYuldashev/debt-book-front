import React, { useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../theme';
import type { ThemeValue } from '../../theme/ThemeProvider';
import { useI18n } from '../../i18n';
import UserAvatar from '../../shared/ui/UserAvatar';
import { getInitials, pickAvatarColor } from '../../shared/ui/avatar';
import { buildProfilePhotoUrl } from './profilePhoto';
import type { BusinessDTO } from '../../types/business';

const AVATAR_SIZE = 84;

interface ProfileAvatarProps {
  isBusiness: boolean;
  activeBusiness: BusinessDTO | null;
  personalPhotoUri: string;
  editing: boolean;
  onEditPhoto: () => void;
  onPreview: () => void;
}

/** Profil (yoki faol biznes) avatari va uni tahrirlash tugmasi. */
const ProfileAvatar: React.FC<ProfileAvatarProps> = ({
  isBusiness,
  activeBusiness,
  personalPhotoUri,
  editing,
  onEditPhoto,
  onPreview,
}) => {
  const theme = useAppTheme();
  const { colors } = theme;
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const editButton = (
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
  );

  // Business rejimi — hech qachon shaxsiy foto ko'rsatilmaydi.
  if (isBusiness) {
    if (!activeBusiness) {
      return (
        <View style={styles.block}>
          <View style={[styles.businessAvatar, { backgroundColor: colors.surfaceMuted }]} />
        </View>
      );
    }
    const color = pickAvatarColor(activeBusiness.name);
    return (
      <View style={styles.block}>
        {activeBusiness.photoId ? (
          <UserAvatar uri={buildProfilePhotoUrl(activeBusiness.photoId)} size={AVATAR_SIZE} />
        ) : (
          <View style={[styles.businessAvatar, { backgroundColor: color.bg }]}>
            <Text style={[styles.businessInitials, { color: color.fg }]}>{getInitials(activeBusiness.name)}</Text>
          </View>
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
    businessInitials: {
      ...typography.heading1,
      fontSize: 30,
      fontWeight: '700',
      letterSpacing: -0.5,
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
