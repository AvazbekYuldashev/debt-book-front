import React, { useCallback, useContext, useMemo, useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import Input from '../../../shared/ui/Input';
import Button from '../../../shared/ui/Button';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import { modalCardLayout } from '../../../shared/ui/modalLayout';
import { AuthContext } from '../../auth/context/AuthContext';
import { WorkspaceContext } from '../context/WorkspaceContext';
import { useMyBusinesses, myBusinessesQueryKey } from '../hooks/useMyBusinesses';
import { updateBusinessUsername } from '../services/businessService';
import { normalizeBusinessUsername, validateBusinessUsername } from '../lib/businessUsername';
import type { BusinessDTO } from '../types/business';

/**
 * Username'siz biznesga kirgan EGASINI uni to'ldirishga majburlaydi.
 *
 * Username majburiy bo'ldi, lekin bu faqat YANGI bizneslarni qamraydi —
 * ilgari yaratilganlarda maydon bo'sh. Bunday biznesni boshqalar mijoz
 * sifatida qo'sha olmaydi: qidiruv endi username bo'yicha ishlaydi, ya'ni
 * biznes amalda ko'rinmas holatda qoladi.
 *
 * "Axborotni tahrirlash" ekranida ham majburiy, lekin u YETARLI emas —
 * egasi u yerga umuman kirmasligi mumkin. Shuning uchun darvoza: biznes
 * ish maydoniga o'tilganda oyna ochiladi va yopilmaydi.
 *
 * ATAYIN faqat EGASIGA: username'ni faqat u o'zgartira oladi (server ham
 * shuni tekshiradi), a'zoga to'siq qo'yish esa ishini bekorga to'xtatardi.
 */
const BusinessUsernameGate: React.FC = () => {
  const theme = useAppTheme();
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { profile } = useContext(AuthContext);
  const { workspace } = useContext(WorkspaceContext);
  const queryClient = useQueryClient();

  const isOwner = workspace.mode === 'business' && workspace.activeBusinessRole === 'OWNER';
  const { data: businesses } = useMyBusinesses(isOwner);
  const active = useMemo(
    () => businesses?.find((b) => b.id === workspace.activeBusinessId) ?? null,
    [businesses, workspace.activeBusinessId],
  );

  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    const businessId = workspace.activeBusinessId;
    if (!profile?.jwt || !businessId) return;

    const clean = username.trim();
    const invalidKey = validateBusinessUsername(clean);
    if (invalidKey) {
      setError(t(invalidKey));
      return;
    }

    setSaving(true);
    setError('');
    try {
      const updated = await updateBusinessUsername(businessId, clean, profile.jwt);
      // Keshni darhol yangilaymiz — aks holda darvoza yopilgach ham ro'yxatda
      // eski (bo'sh) qiymat qolib, oyna qayta ochilib ketardi.
      queryClient.setQueryData<BusinessDTO[]>(myBusinessesQueryKey(profile.id), (prev) =>
        prev?.map((b) => (b.id === businessId ? { ...b, ...updated } : b)),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : t('profile.genericError'));
    } finally {
      setSaving(false);
    }
  }, [profile?.jwt, profile?.id, workspace.activeBusinessId, username, queryClient, t]);

  // Ro'yxat hali kelmagan bo'lsa jim turamiz: bo'sh username DEB O'YLAB
  // oynani ochib yuborish noto'g'ri bo'lardi.
  if (!isOwner || !active) return null;
  if (active.username && active.username.trim()) return null;

  return (
    // onRequestClose ATAYIN bo'sh: Android'dagi "orqaga" tugmasi ham
    // darvozani yopmasin — aks holda majburlashning ma'nosi qolmasdi.
    <Modal transparent visible animationType="fade" onRequestClose={() => {}}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{t('business.usernameGateTitle')}</Text>
          <Text style={styles.message}>{t('business.usernameGateMessage')}</Text>

          <Input
            label={t('profile.businessUsername')}
            value={username}
            onChangeText={(value) => {
              setError('');
              setUsername(normalizeBusinessUsername(value));
            }}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="salom_market"
          />
          <Text style={styles.hint}>{t('profile.businessUsernameHint')}</Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {/* "Keyinroq" tugmasi YO'Q — shu darvozaning butun maqsadi shu. */}
          <Button title={t('common.save')} onPress={handleSave} loading={saving} />
        </View>
      </View>
    </Modal>
  );
};

const createStyles = ({ colors, spacing, radius, typography, glass }: ThemeValue) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      ...glass.scrim,
      justifyContent: 'center',
      padding: spacing.md,
    },
    card: {
      ...modalCardLayout,
      // QUYUQ, shisha emas: bu to'sadigan oyna va ortidagi ekran ko'rinib
      // tursa, foydalanuvchi undan foydalanmoqchi bo'lib urinaveradi.
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      padding: spacing.md,
      gap: spacing.xs,
    },
    title: {
      ...typography.heading2,
      fontSize: 18,
      color: colors.textPrimary,
    },
    message: {
      ...typography.bodySmall,
      color: colors.textSecondary,
      marginBottom: spacing.xs,
    },
    hint: {
      ...typography.caption,
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: spacing.xs,
    },
    error: {
      ...typography.bodySmall,
      color: colors.danger,
      marginBottom: spacing.xxs,
    },
  });

export default BusinessUsernameGate;
