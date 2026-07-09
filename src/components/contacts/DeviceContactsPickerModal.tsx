import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../../i18n';
import { useAppTheme } from '../../theme';
import { ColorTokens } from '../../theme/colors';
import { getPhoneValidationError, formatPhoneDisplay } from '../../utils/phone';
import {
  DeviceContact,
  ContactsPermissionError,
  loadDeviceContacts,
} from '../../utils/deviceContacts';

interface Props {
  visible: boolean;
  onClose: () => void;
  // Allaqachon qo'shilgan raqamlar (normalizatsiya qilingan) — belgilash uchun.
  existingPhones: Set<string>;
  // Tanlanganlarni qo'shadi, natijani qaytaradi.
  onSubmit: (selected: DeviceContact[]) => Promise<{ added: number; failed: number }>;
}

type LoadError = 'permission' | 'generic' | null;

const DeviceContactsPickerModal: React.FC<Props> = ({ visible, onClose, existingPhones, onSubmit }) => {
  const { t } = useI18n();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<LoadError>(null);
  const [contacts, setContacts] = useState<DeviceContact[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);
  const [result, setResult] = useState<{ added: number; failed: number } | null>(null);

  const isValid = useCallback((c: DeviceContact) => getPhoneValidationError(c.phone) === null, []);
  const isAdded = useCallback((c: DeviceContact) => existingPhones.has(c.phone), [existingPhones]);
  const isSelectable = useCallback((c: DeviceContact) => isValid(c) && !isAdded(c), [isValid, isAdded]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const list = await loadDeviceContacts();
      setContacts(list);
    } catch (e) {
      setLoadError(e instanceof ContactsPermissionError ? 'permission' : 'generic');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    setSearch('');
    setSelected(new Set());
    setResult(null);
    load();
  }, [visible, load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const qDigits = q.replace(/\D/g, '');
    if (!q) return contacts;
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (qDigits.length > 0 && (c.phone.includes(qDigits) || c.rawPhone.replace(/\D/g, '').includes(qDigits)))
    );
  }, [contacts, search]);

  const selectableFiltered = useMemo(() => filtered.filter(isSelectable), [filtered, isSelectable]);
  const allSelected = selectableFiltered.length > 0 && selectableFiltered.every((c) => selected.has(c.id));

  const toggle = useCallback((c: DeviceContact) => {
    if (!isSelectable(c)) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(c.id)) next.delete(c.id);
      else next.add(c.id);
      return next;
    });
  }, [isSelectable]);

  const toggleAll = useCallback(() => {
    setSelected((prev) => {
      if (allSelected) {
        const next = new Set(prev);
        selectableFiltered.forEach((c) => next.delete(c.id));
        return next;
      }
      const next = new Set(prev);
      selectableFiltered.forEach((c) => next.add(c.id));
      return next;
    });
  }, [allSelected, selectableFiltered]);

  const handleSubmit = useCallback(async () => {
    const chosen = contacts.filter((c) => selected.has(c.id) && isSelectable(c));
    if (chosen.length === 0) return;
    setAdding(true);
    setResult(null);
    try {
      const res = await onSubmit(chosen);
      setResult(res);
      setSelected(new Set());
    } finally {
      setAdding(false);
    }
  }, [contacts, selected, isSelectable, onSubmit]);

  const selectedCount = selected.size;

  const renderItem = useCallback(
    ({ item }: { item: DeviceContact }) => {
      const added = isAdded(item);
      const valid = isValid(item);
      const checked = selected.has(item.id);
      const disabled = added || !valid;
      return (
        <TouchableOpacity
          style={[styles.row, disabled && styles.rowDisabled]}
          activeOpacity={disabled ? 1 : 0.7}
          onPress={() => toggle(item)}
        >
          <View style={[styles.checkbox, checked && styles.checkboxChecked, disabled && styles.checkboxDisabled]}>
            {checked ? <Ionicons name="checkmark" size={14} color={colors.textOnPrimary} /> : null}
          </View>
          <View style={styles.rowInfo}>
            <Text style={styles.rowName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.rowPhone} numberOfLines={1}>{formatPhoneDisplay(item.phone) || item.rawPhone}</Text>
          </View>
          {added ? (
            <Text style={styles.badgeAdded}>{t('contactPicker.alreadyAdded')}</Text>
          ) : !valid ? (
            <Text style={styles.badgeInvalid}>{t('contactPicker.invalidPhone')}</Text>
          ) : null}
        </TouchableOpacity>
      );
    },
    [colors.textOnPrimary, isAdded, isValid, selected, styles, t, toggle]
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('contactPicker.title')}</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.centeredText}>{t('contactPicker.loading')}</Text>
            </View>
          ) : loadError === 'permission' ? (
            <View style={styles.centered}>
              <Ionicons name="lock-closed-outline" size={28} color={colors.textSecondary} />
              <Text style={styles.centeredText}>{t('contactPicker.permissionDenied')}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={load}>
                <Text style={styles.retryText}>{t('common.retry')}</Text>
              </TouchableOpacity>
            </View>
          ) : loadError === 'generic' ? (
            <View style={styles.centered}>
              <Text style={styles.centeredText}>{t('contactPicker.loadError')}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={load}>
                <Text style={styles.retryText}>{t('common.retry')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.searchWrap}>
                <Ionicons name="search" size={16} color={colors.textSecondary} />
                <TextInput
                  style={styles.searchInput}
                  value={search}
                  onChangeText={setSearch}
                  placeholder={t('contactPicker.search')}
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              {selectableFiltered.length > 0 ? (
                <TouchableOpacity style={styles.selectAllRow} onPress={toggleAll}>
                  <Text style={styles.selectAllText}>
                    {allSelected ? t('contactPicker.deselectAll') : t('contactPicker.selectAll')}
                  </Text>
                </TouchableOpacity>
              ) : null}

              {result ? (
                <Text style={styles.resultText}>
                  {t('contactPicker.result', { added: result.added, failed: result.failed })}
                </Text>
              ) : null}

              <FlatList
                data={filtered}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={<Text style={styles.emptyText}>{t('contactPicker.empty')}</Text>}
                style={styles.list}
                initialNumToRender={20}
              />

              <TouchableOpacity
                style={[styles.addBtn, (selectedCount === 0 || adding) && styles.addBtnDisabled]}
                onPress={handleSubmit}
                disabled={selectedCount === 0 || adding}
              >
                {adding ? (
                  <ActivityIndicator size="small" color={colors.textOnPrimary} />
                ) : (
                  <Text style={styles.addBtnText}>
                    {t('contactPicker.add')}{selectedCount > 0 ? ` (${selectedCount})` : ''}
                  </Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 16,
      maxHeight: '85%',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceMuted,
    },
    centered: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 48,
      gap: 10,
    },
    centeredText: {
      color: colors.textSecondary,
      fontSize: 14,
      textAlign: 'center',
    },
    retryBtn: {
      marginTop: 6,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor: colors.primarySoft,
    },
    retryText: {
      color: colors.primary,
      fontWeight: '700',
      fontSize: 13,
    },
    searchWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: colors.surface,
      marginBottom: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      color: colors.textPrimary,
      padding: 0,
    },
    selectAllRow: {
      alignSelf: 'flex-end',
      paddingVertical: 6,
      paddingHorizontal: 4,
    },
    selectAllText: {
      color: colors.primary,
      fontWeight: '700',
      fontSize: 13,
    },
    resultText: {
      color: colors.textSecondary,
      fontSize: 13,
      fontWeight: '600',
      paddingVertical: 6,
    },
    list: {
      flexGrow: 0,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 4,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    rowDisabled: {
      opacity: 0.5,
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxChecked: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    checkboxDisabled: {
      borderColor: colors.border,
    },
    rowInfo: {
      flex: 1,
    },
    rowName: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    rowPhone: {
      marginTop: 2,
      fontSize: 13,
      color: colors.textSecondary,
    },
    badgeAdded: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.positive,
    },
    badgeInvalid: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.negative,
    },
    emptyText: {
      textAlign: 'center',
      color: colors.textSecondary,
      paddingVertical: 28,
    },
    addBtn: {
      marginTop: 12,
      height: 50,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
    },
    addBtnDisabled: {
      opacity: 0.5,
    },
    addBtnText: {
      color: colors.textOnPrimary,
      fontWeight: '700',
      fontSize: 15,
    },
  });

export default DeviceContactsPickerModal;
