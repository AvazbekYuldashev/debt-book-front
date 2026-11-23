import React, { memo, useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Modal from './AppModal';
import Button from './Button';
import { useAppTheme } from '../theme';
import type { ThemeValue } from '../theme/ThemeProvider';
import { useI18n } from '../i18n';
import { outbox } from '../lib/outbox';
import { useOutboxCount } from '../lib/useOutbox';
import { isDeleteAction, outboxLabelKey, outboxTime } from '../lib/describeOutboxItem';
import { modalCardLayout } from './modalLayout';

/**
 * Yuborilmagan amallar ro'yxati.
 *
 * NEGA RO'YXAT, "go'yoki yozildi" ko'rinishi emas: balanslar serverda
 * hisoblanadi va oflaynda qo'shilgan qarzni ro'yxatga shunchaki
 * qo'shib qo'yish yakuniy summalarni NOTO'G'RI ko'rsatardi. Pul
 * ma'lumotida soxta raqamdan ko'ra halol "mana, bu amallar hali
 * yuborilmadi" ma'lumoti xavfsizroq.
 *
 * "Hozir yuborish" tugmasi ham shu uchun: odam internet qaytganini
 * o'zi ko'rib turib, kutib o'tirmasdan urinib ko'ra oladi.
 */
const OutboxModal: React.FC<{ visible: boolean; onClose: () => void }> = ({ visible, onClose }) => {
  const theme = useAppTheme();
  const { colors } = theme;
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const count = useOutboxCount();
  const [sending, setSending] = useState(false);

  const items = outbox.list();

  const sendNow = useCallback(async () => {
    setSending(true);
    try {
      await outbox.flush();
    } finally {
      setSending(false);
    }
  }, []);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Ionicons name="cloud-upload-outline" size={18} color={colors.primary} />
            <Text style={styles.title} numberOfLines={1}>
              {t('sync.title')}
            </Text>
          </View>

          {count === 0 ? (
            <Text style={styles.empty}>{t('sync.empty')}</Text>
          ) : (
            <>
              <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
                {items.map((item) => (
                  <View key={item.id} style={styles.row}>
                    <Text style={styles.rowLabel} numberOfLines={1}>
                      {t(outboxLabelKey(item))}
                      {isDeleteAction(item) ? ` ${t('outbox.deleteSuffix')}` : ''}
                    </Text>
                    <Text style={styles.rowTime}>{outboxTime(item)}</Text>
                  </View>
                ))}
              </ScrollView>
              <Text style={styles.hint}>{t('sync.hint')}</Text>
            </>
          )}

          <View style={styles.actions}>
            {count > 0 ? (
              <Button title={t('sync.sendNow')} onPress={sendNow} loading={sending} />
            ) : null}
            <Button title={t('common.close')} variant="secondary" onPress={onClose} />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (theme: ThemeValue) => {
  const { colors, spacing, radius, typography, glass } = theme;
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.md,
      ...glass.scrim,
    },
    card: {
      ...modalCardLayout,
      ...glass.modal,
      borderRadius: radius.xxl,
      padding: spacing.md,
      gap: spacing.sm,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    title: {
      ...typography.heading3,
      color: colors.textPrimary,
      flexShrink: 1,
    },
    list: {
      maxHeight: 220,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
      paddingVertical: spacing.xs,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    rowLabel: {
      ...typography.body,
      fontSize: 15,
      color: colors.textPrimary,
      flexShrink: 1,
    },
    rowTime: {
      ...typography.caption,
      fontSize: 12,
      color: colors.textSecondary,
      fontVariant: ['tabular-nums'],
    },
    hint: {
      ...typography.caption,
      fontSize: 12,
      color: colors.textSecondary,
    },
    empty: {
      ...typography.body,
      color: colors.textSecondary,
      paddingVertical: spacing.sm,
    },
    actions: {
      gap: spacing.xs,
    },
  });
};

export default memo(OutboxModal);
