import React, { useCallback, useContext, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { AuthContext } from '../../context/AuthContext';
import { WorkspaceContext } from '../../context/WorkspaceContext';
import { getMyBusinesses } from '../../services/businessService';
import { BusinessDTO } from '../../types/business';
import CreateBusinessModal from './CreateBusinessModal';
import { ROUTES } from '../../navigation/routes';
import { useI18n } from '../../i18n';
import { useAppTheme } from '../../theme';
import { ColorTokens } from '../../theme/colors';

const WorkspaceSwitcher: React.FC = () => {
  const { t } = useI18n();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const { profile } = useContext(AuthContext);
  const { workspace, setPersonalWorkspace, setBusinessWorkspace } = useContext(WorkspaceContext);
  const [businesses, setBusinesses] = useState<BusinessDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [visible, setVisible] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);

  const loadBusinesses = useCallback(async () => {
    if (!profile?.jwt) {
      setBusinesses([]);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await getMyBusinesses(profile.jwt);
      setBusinesses(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('workspace.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [profile?.jwt]);

  useFocusEffect(
    useCallback(() => {
      loadBusinesses();
    }, [loadBusinesses])
  );

  const openBusiness = (business: BusinessDTO) => {
    setBusinessWorkspace({
      id: business.id,
      name: business.name,
      role: business.currentRole,
    });
    setVisible(false);
  };

  const contextLabel =
    workspace.mode === 'business' && workspace.activeBusinessName
      ? workspace.activeBusinessName
      : t('workspace.personal');

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity style={styles.trigger} onPress={() => setVisible(true)}>
        <View style={styles.labelWrap}>
          <Text numberOfLines={1} style={styles.label}>
            {contextLabel}
          </Text>
          {workspace.mode === 'business' && workspace.activeBusinessRole ? (
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>{workspace.activeBusinessRole}</Text>
            </View>
          ) : null}
        </View>
        <Ionicons name="chevron-down-outline" size={18} color={colors.textSecondary} />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <TouchableOpacity style={styles.backdrop} onPress={() => setVisible(false)} activeOpacity={1}>
          <View style={styles.card}>
            <Text style={styles.title}>{t('workspace.title')}</Text>
            <TouchableOpacity
              style={[
                styles.optionRow,
                workspace.mode === 'personal' ? styles.optionActive : null,
              ]}
              onPress={() => {
                setPersonalWorkspace();
                setVisible(false);
              }}
            >
              <Text style={styles.optionText}>{t('workspace.personal')}</Text>
              {workspace.mode === 'personal' ? <Ionicons name="checkmark" size={16} color={colors.primary} /> : null}
            </TouchableOpacity>

            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>{t('business.myBusinesses')}</Text>
              <TouchableOpacity
                onPress={() => {
                  setVisible(false);
                  navigation.navigate(ROUTES.PROFILE, { screen: ROUTES.MY_BUSINESSES });
                }}
              >
                <Text style={styles.linkText}>{t('workspace.manage')}</Text>
              </TouchableOpacity>
            </View>

            {loading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator />
              </View>
            ) : businesses.length === 0 ? (
              <Text style={styles.emptyText}>{t('workspace.noBusiness')}</Text>
            ) : (
              businesses.map((business) => {
                const isActive = workspace.mode === 'business' && workspace.activeBusinessId === business.id;
                return (
                  <TouchableOpacity
                    key={business.id}
                    style={[styles.optionRow, isActive ? styles.optionActive : null]}
                    onPress={() => openBusiness(business)}
                  >
                    <View style={styles.businessMeta}>
                      <Text style={styles.optionText}>{business.name}</Text>
                      <Text style={styles.businessSub}>{business.currentRole}</Text>
                    </View>
                    {isActive ? <Ionicons name="checkmark" size={16} color={colors.primary} /> : null}
                  </TouchableOpacity>
                );
              })
            )}
            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity
              style={styles.createBtn}
              onPress={() => {
                setVisible(false);
                setCreateModalVisible(true);
              }}
            >
              <Ionicons name="add-circle-outline" size={16} color="#FFFFFF" />
              <Text style={styles.createBtnText}>{t('business.createTitle')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <CreateBusinessModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onCreated={(created) => {
          setBusinessWorkspace({ id: created.id, name: created.name, role: created.currentRole });
          loadBusinesses();
        }}
      />
    </View>
  );
};

const createStyles = (colors: ColorTokens) => StyleSheet.create({
  wrapper: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 34,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    backgroundColor: colors.surfaceMuted,
  },
  labelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    paddingRight: 8,
  },
  label: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '600',
    flexShrink: 1,
  },
  roleBadge: {
    backgroundColor: colors.primarySoft,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primaryPressed,
  },
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    maxHeight: '75%',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  sectionRow: {
    marginTop: 10,
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  linkText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  optionRow: {
    minHeight: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
  },
  optionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  optionText: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  businessMeta: {
    flexShrink: 1,
  },
  businessSub: {
    marginTop: 2,
    fontSize: 11,
    color: colors.textSecondary,
  },
  loadingWrap: {
    minHeight: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: 8,
  },
  error: {
    color: colors.danger,
    fontSize: 12,
    marginTop: 2,
  },
  createBtn: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 10,
    backgroundColor: colors.primary,
    minHeight: 40,
  },
  createBtnText: {
    color: colors.textOnPrimary,
    fontWeight: '700',
    fontSize: 13,
  },
});

export default WorkspaceSwitcher;
