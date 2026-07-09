import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../../i18n';
import { useAppTheme } from '../../theme';
import type { ThemeValue } from '../../theme/ThemeProvider';
import { getPhoneValidationError } from '../../utils/phone';
import {
  DeviceContact,
  ContactsPermissionError,
  loadDeviceContacts,
} from '../../utils/deviceContacts';
import DeviceContactRow from './DeviceContactRow';

interface Props {
  visible: boolean;
  onClose: () => void;
  // Allaqachon qo'shilgan raqamlar (normalizatsiya qilingan) — belgilash uchun.
  existingPhones: Set<string>;
  // Tanlanganlarni qo'shadi, natijani qaytaradi.
  onSubmit: (selected: DeviceContact[]) => Promise<{ added: number; failed: number }>;
}

type LoadError = 'permission' | 'generic' | null;

/** Telefon kontaktlaridan ko'plab mijoz tanlab qo'shish bottom-sheet'i. */
const DeviceContactsPickerModal: React.FC<Props> = ({ visible, onClose, existingPhones, onSubmit }) => {
  const { t } = useI18n();
  const theme = useAppTheme();
  const { colors } = theme;
  const styles = useMemo(() => createStyles(theme), [theme]);

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

  // Har ochilishda toza holat + kontaktlarni qayta o'qish.
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
      const next = new Set(prev);
      if (allSelected) selectableFiltered.forEach((c) => next.delete(c.id));
      else selectableFiltered.forEach((c) => next.add(c.id));
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
    ({ item }: { item: DeviceContact }) => (
      <DeviceContactRow
        contact={item}
        checked={selected.has(item.id)}
        added={isAdded(item)}
        valid={isValid(item)}
        onToggle={toggle}
      />
    ),
    [selected, isAdded, isValid, toggle]
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title} accessibilityRole="header">
              {t('contactPicker.title')}
            </Text>
            <Pressable
              style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={t('common.cancel')}
              hitSlop={6}
            >
              <Ionicons name="close" size={20} color={colors.textPrimary} />
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.centeredText}>{t('contactPicker.loading')}</Text>
            </View>
          ) : loadError ? (
            <View style={styles.centered}>
              {loadError === 'permission' ? (
                <Ionicons name="lock-closed-outline" size={28} color={colors.textSecondary} />
              ) : null}
              <Text style={styles.centeredText}>
                {loadError === 'permission' ? t('contactPicker.permissionDenied') : t('contactPicker.loadError')}
              </Text>
              <Pressable
                style={({ pressed }) => [styles.retryBtn, pressed && styles.pressed]}
                onPress={load}
                accessibilityRole="button"
                accessibilityLabel={t('common.retry')}
              >
                <Text style={styles.retryText}>{t('common.retry')}</Text>
              </Pressable>
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
                  accessibilityLabel={t('contactPicker.search')}
                />
              </View>

              {selectableFiltered.length > 0 ? (
                <Pressable
                  style={({ pressed }) => [styles.selectAllRow, pressed && styles.pressed]}
                  onPress={toggleAll}
                  accessibilityRole="button"
                  accessibilityLabel={allSelected ? t('contactPicker.deselectAll') : t('contactPicker.selectAll')}
                >
                  <Text style={styles.selectAllText}>
                    {allSelected ? t('contactPicker.deselectAll') : t('contactPicker.selectAll')}
                  </Text>
                </Pressable>
              ) : null}

              {result ? (
                <Text style={styles.resultText} accessibilityLiveRegion="polite">
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

              <Pressable
                style={({ pressed }) => [
                  styles.addBtn,
                  (selectedCount === 0 || adding) && styles.addBtnDisabled,
                  pressed && selectedCount > 0 && !adding && styles.addBtnPressed,
                ]}
                onPress={handleSubmit}
                disabled={selectedCount === 0 || adding}
                accessibilityRole="button"
                accessibilityState={{ disabled: selectedCount === 0 || adding, busy: adding }}
                accessibilityLabel={t('contactPicker.add')}
              >
                {adding ? (
                  <ActivityIndicator size="small" color={colors.textOnPrimary} />
                ) : (
                  <Text style={styles.addBtnText}>
                    {t('contactPicker.add')}
                    {selectedCount > 0 ? ` (${selectedCount})` : ''}
                  </Text>
                )}
              </Pressable>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const createStyles = ({ colors, spacing, radius, typography }: ThemeValue) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.background,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      paddingBottom: spacing.md,
      maxHeight: '85%',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.sm,
    },
    title: {
      ...typography.heading2,
      fontSize: 18,
      color: colors.textPrimary,
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceMuted,
    },
    pressed: {
      opacity: 0.7,
    },
    centered: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.xxl + spacing.xs,
      gap: spacing.xs,
    },
    centeredText: {
      ...typography.bodySmall,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    retryBtn: {
      marginTop: spacing.xxs,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radius.sm,
      backgroundColor: colors.primarySoft,
    },
    retryText: {
      ...typography.button,
      fontSize: 13,
      color: colors.primary,
    },
    searchWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      backgroundColor: colors.surface,
      marginBottom: spacing.xs,
    },
    searchInput: {
      ...typography.bodySmall,
      fontSize: 15,
      flex: 1,
      color: colors.textPrimary,
      padding: 0,
    },
    selectAllRow: {
      alignSelf: 'flex-end',
      paddingVertical: spacing.xxs,
      paddingHorizontal: spacing.xxs,
    },
    selectAllText: {
      ...typography.button,
      fontSize: 13,
      color: colors.primary,
    },
    resultText: {
      ...typography.label,
      color: colors.textSecondary,
      paddingVertical: spacing.xxs,
    },
    list: {
      flexGrow: 0,
    },
    emptyText: {
      ...typography.bodySmall,
      textAlign: 'center',
      color: colors.textSecondary,
      paddingVertical: spacing.lg,
    },
    addBtn: {
      marginTop: spacing.sm,
      height: 50,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
    },
    addBtnDisabled: {
      opacity: 0.5,
    },
    addBtnPressed: {
      backgroundColor: colors.primaryPressed,
    },
    addBtnText: {
      ...typography.button,
      color: colors.textOnPrimary,
    },
  });

export default DeviceContactsPickerModal;
