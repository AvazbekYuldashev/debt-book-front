import React, { memo, useCallback, useContext, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { AuthContext } from '../../auth/context/AuthContext';
import { WorkspaceContext } from '../context/WorkspaceContext';
import { useMyBusinesses, myBusinessesQueryKey } from '../hooks/useMyBusinesses';
import { useUnreadByWorkspace } from '../../notifications/hooks/useNotifications';
import { BusinessDTO } from '../types/business';
import CreateBusinessModal from './CreateBusinessModal';
import WorkspacePickerModal from './WorkspacePickerModal';
import { ROUTES } from '../../../app/navigation/routes';
import type { MainTabNavigation } from '../../../app/navigation/types';
import { useI18n } from '../../../shared/i18n';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import UserAvatar from '../../../shared/ui/UserAvatar';
import InitialsAvatar from '../../../shared/ui/InitialsAvatar';
import { buildAttachUrl, normalizeAttachUrl } from '../../../shared/lib/attachUrl';

const BADGE_AVATAR_SIZE = 38;

interface BadgeAvatarProps {
  isBusiness: boolean;
  activeBusiness?: BusinessDTO;
  personalPhotoUri?: string;
}

/** Trigger'dagi avatar: biznes rasmi → bosh harflar → ikonka; shaxsiyda rasm → ikonka. */
const BadgeAvatar = memo<BadgeAvatarProps>(({ isBusiness, activeBusiness, personalPhotoUri }) => {
  const { colors } = useAppTheme();
  if (isBusiness) {
    if (activeBusiness?.photoId) {
      return <UserAvatar uri={buildAttachUrl(activeBusiness.photoId)} size={BADGE_AVATAR_SIZE} />;
    }
    if (activeBusiness) {
      return <InitialsAvatar name={activeBusiness.name} size={BADGE_AVATAR_SIZE} />;
    }
    return <Ionicons name="business" size={20} color={colors.textSecondary} />;
  }
  if (personalPhotoUri) {
    return <UserAvatar uri={personalPhotoUri} size={BADGE_AVATAR_SIZE} />;
  }
  return <Ionicons name="person" size={20} color={colors.textSecondary} />;
});
BadgeAvatar.displayName = 'BadgeAvatar';

/**
 * Joriy workspace (shaxsiy/biznes) ko'rsatkichi va almashtirgichi.
 * Bizneslar useMyBusinesses query'sidan keladi — bir nechta instansiya
 * (DebtList, Profile) bitta so'rovni ulashadi.
 */
const WorkspaceSwitcher: React.FC = () => {
  const { t } = useI18n();
  const theme = useAppTheme();
  const { colors } = theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const navigation = useNavigation<MainTabNavigation>();
  const queryClient = useQueryClient();
  const { profile } = useContext(AuthContext);
  const { workspace, setPersonalWorkspace, setBusinessWorkspace } = useContext(WorkspaceContext);

  const [pickerVisible, setPickerVisible] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);

  const { data: businesses = [], isLoading, error, refetch } = useMyBusinesses();

  // Ekranga qaytilganda ro'yxatni yangilaymiz; keshdagi ma'lumot ko'rinib turadi (flickersiz).
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  // Bildirishnomalar ish maydonlari bo'yicha ajratilgan — boshqa maydonda
  // yangi xabar borligi faqat shu yerda ko'rinadi.
  const { data: unreadRows } = useUnreadByWorkspace();
  const unreadByWorkspace = useMemo(() => {
    const map: Record<string, number> = {};
    for (const row of unreadRows ?? []) {
      if (row.unreadCount > 0) map[row.businessId ?? 'personal'] = row.unreadCount;
    }
    return map;
  }, [unreadRows]);

  const isBusiness = workspace.mode === 'business';
  const activeBusiness = useMemo(
    () => (isBusiness ? businesses.find((b) => b.id === workspace.activeBusinessId) : undefined),
    [isBusiness, businesses, workspace.activeBusinessId],
  );

  const contextLabel =
    isBusiness && workspace.activeBusinessName ? workspace.activeBusinessName : t('workspace.personal');

  const profilePhotoUri = useMemo(() => {
    const photo = profile?.photo;
    if (!photo) return undefined;
    return normalizeAttachUrl(photo.url) || buildAttachUrl(photo.id) || undefined;
  }, [profile?.photo]);

  const invalidateBusinesses = useCallback(
    () => queryClient.invalidateQueries({ queryKey: myBusinessesQueryKey(profile?.id) }),
    [queryClient, profile?.id],
  );

  const handleSelectPersonal = useCallback(() => {
    setPersonalWorkspace();
    setPickerVisible(false);
  }, [setPersonalWorkspace]);

  const handleSelectBusiness = useCallback(
    (business: BusinessDTO) => {
      setBusinessWorkspace({ id: business.id, name: business.name, role: business.currentRole });
      setPickerVisible(false);
    },
    [setBusinessWorkspace],
  );

  const handleManage = useCallback(() => {
    setPickerVisible(false);
    navigation.navigate(ROUTES.PROFILE, { screen: ROUTES.MY_BUSINESSES });
  }, [navigation]);

  const handleOpenCreate = useCallback(() => {
    setPickerVisible(false);
    setCreateModalVisible(true);
  }, []);

  const handleCreated = useCallback(
    (created: BusinessDTO) => {
      setBusinessWorkspace({ id: created.id, name: created.name, role: created.currentRole });
      invalidateBusinesses();
    },
    [setBusinessWorkspace, invalidateBusinesses],
  );

  return (
    <View style={styles.wrapper}>
      <Pressable
        style={({ pressed }) => [
          styles.trigger,
          isBusiness ? styles.triggerBusiness : styles.triggerPersonal,
          pressed && styles.triggerPressed,
        ]}
        onPress={() => setPickerVisible(true)}
        accessibilityRole="button"
        accessibilityLabel={`${t('workspace.title')}: ${contextLabel}`}
      >
        <View style={styles.iconBadge}>
          <BadgeAvatar
            isBusiness={isBusiness}
            activeBusiness={activeBusiness}
            personalPhotoUri={profilePhotoUri}
          />
        </View>
        <View style={styles.labelWrap}>
          <View style={styles.labelRow}>
            <Text numberOfLines={1} style={styles.label}>
              {contextLabel}
            </Text>
            {isBusiness && workspace.activeBusinessRole ? (
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>{workspace.activeBusinessRole}</Text>
              </View>
            ) : null}
          </View>
        </View>
        <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
      </Pressable>

      <WorkspacePickerModal
        visible={pickerVisible}
        businesses={businesses}
        loading={isLoading}
        errorText={error instanceof Error ? error.message : undefined}
        isPersonal={!isBusiness}
        activeBusinessId={isBusiness ? workspace.activeBusinessId ?? undefined : undefined}
        unreadByWorkspace={unreadByWorkspace}
        onClose={() => setPickerVisible(false)}
        onSelectPersonal={handleSelectPersonal}
        onSelectBusiness={handleSelectBusiness}
        onManage={handleManage}
        onCreate={handleOpenCreate}
      />

      <CreateBusinessModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onCreated={handleCreated}
      />
    </View>
  );
};

const createStyles = ({ colors, spacing, radius, typography }: ThemeValue) =>
  StyleSheet.create({
    wrapper: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.xs,
      paddingBottom: spacing.xxs,
      backgroundColor: colors.background,
    },
    // Fonsiz, soyasiz: bu navigatsiya emas, kontekst ko'rsatkichi.
    trigger: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      alignSelf: 'flex-start',
      maxWidth: '100%',
      minHeight: 36,
      borderRadius: radius.pill,
      paddingRight: spacing.xs,
    },
    triggerPersonal: {},
    triggerBusiness: {},
    triggerPressed: {
      opacity: 0.55,
    },
    iconBadge: {
      width: BADGE_AVATAR_SIZE,
      height: BADGE_AVATAR_SIZE,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceMuted,
      overflow: 'hidden',
    },
    labelWrap: {
      flexShrink: 1,
      minWidth: 0,
    },
    labelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    label: {
      ...typography.label,
      fontWeight: '700',
      color: colors.textSecondary,
      flexShrink: 1,
    },
    roleBadge: {
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.xs,
      paddingVertical: 2,
    },
    roleBadgeText: {
      ...typography.caption,
      fontSize: 10,
      fontWeight: '700',
      color: colors.textSecondary,
    },
  });

export default WorkspaceSwitcher;
