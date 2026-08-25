import React, { useCallback, useContext, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Card from '../../../shared/ui/Card';
import ScreenHeader from '../../../shared/ui/ScreenHeader';
import { SkeletonCardList } from '../../../shared/ui/SkeletonShimmer';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import { AuthContext } from '../../auth/context/AuthContext';
import { formatDateTime } from '../../../shared/lib/money';
import { ROUTES } from '../../../app/navigation/routes';
import type { GapScreenProps } from '../../../app/navigation/types';
import { getGapHistory } from '../services/gapService';
import type { GapAuditResponseDTO } from '../types/gap';

/**
 * Guruh tarixi — o'chirilmaydigan yozuvlar.
 *
 * DIQQAT: `description` matni BACKEND tomonidan Accept-Language bo'yicha
 * render qilinadi. Bu yerda tarjima qilinmaydi — aks holda bir xil hodisa
 * ikki joyda ikki xil ta'riflanib qolar edi.
 */
const GapHistoryScreen: React.FC<GapScreenProps<typeof ROUTES.GAP_HISTORY>> = ({
  navigation,
  route,
}) => {
  const { groupId, groupName } = route.params;
  const theme = useAppTheme();
  const { colors } = theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { profile } = useContext(AuthContext);

  const [items, setItems] = useState<GapAuditResponseDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(
    async (showSpinner = true) => {
      if (!profile?.jwt) return;
      if (showSpinner) setLoading(true);
      setError('');
      try {
        const page = await getGapHistory(groupId, { page: 1, size: 50 }, profile.jwt);
        setItems(page.content ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : t('common.error'));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [groupId, profile?.jwt, t],
  );

  useFocusEffect(
    useCallback(() => {
      load(items.length === 0);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [load]),
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScreenHeader
        title={t('gap.history.title')}
        subtitle={groupName}
        onBack={() => navigation.goBack()}
      />

      {loading && items.length === 0 ? (
        <SkeletonCardList count={5} containerStyle={styles.body} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load(false);
              }}
              tintColor={colors.primary}
            />
          }
        >
          {error ? <Text style={styles.error}>{error}</Text> : null}

          {items.length === 0 ? (
            <Card style={styles.card}>
              <Text style={styles.muted}>{t('gap.history.empty')}</Text>
            </Card>
          ) : (
            items.map((item) => (
              <View key={item.id} style={styles.row}>
                <View style={styles.dot}>
                  <Feather name="check" size={12} color={colors.primaryPressed} />
                </View>
                <View style={styles.rowBody}>
                  <Text style={styles.description}>{item.description}</Text>
                  <Text style={styles.meta}>
                    {item.actorName ? `${item.actorName} · ` : ''}
                    {item.createdDate ? formatDateTime(item.createdDate) : ''}
                  </Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
};

const createStyles = ({ colors, spacing, radius, typography }: ThemeValue) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    body: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
    card: { marginBottom: spacing.sm },
    row: {
      flexDirection: 'row',
      gap: spacing.sm,
      paddingVertical: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    dot: {
      width: 26,
      height: 26,
      borderRadius: radius.pill,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 2,
    },
    rowBody: { flex: 1, gap: 2 },
    description: {
      ...typography.bodySmall,
      color: colors.textPrimary,
    },
    meta: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    muted: {
      ...typography.bodySmall,
      color: colors.textSecondary,
    },
    error: {
      ...typography.bodySmall,
      color: colors.danger,
      marginBottom: spacing.xs,
    },
  });

export default GapHistoryScreen;
