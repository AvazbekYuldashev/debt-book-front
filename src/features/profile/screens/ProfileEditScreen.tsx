import React, { useContext, useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import ScreenHeader from '../../../shared/ui/ScreenHeader';
import Card from '../../../shared/ui/Card';
import Input from '../../../shared/ui/Input';
import Button from '../../../shared/ui/Button';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import { AuthContext } from '../../auth/context/AuthContext';
import { WorkspaceContext } from '../../business/context/WorkspaceContext';
import { useMyBusinesses, myBusinessesQueryKey } from '../../business/hooks/useMyBusinesses';
import { updateBusiness } from '../../business/services/businessService';
import type { BusinessDTO } from '../../business/types/business';
import type { ProfileScreenProps } from '../../../app/navigation/types';
import type { ROUTES } from '../../../app/navigation/routes';
import {
  confirmProfileUsername,
  updateProfileDetail,
  updateProfilePassword,
  updateProfileUsername,
} from '../api/profile';
import { useProfileAction } from '../hooks/useProfileAction';

/**
 * Axborotni tahrirlash.
 *
 * Ekran ish maydoniga qarab ikki xil ishlaydi:
 *   shaxsiy  — ism-familiya, telefon va parol;
 *   biznes   — o'sha biznesning nomi va manzili.
 *
 * Biznesga o'tilganda shaxsiy profilni tahrirlash mantiqsiz bo'lardi: rasm
 * almashtirish allaqachon shu qoidaga bo'ysunadi (biznes rasmini yangilaydi),
 * qolgan maydonlar ham shunday. Telefon va parol esa faqat shaxsiy — ular
 * biznesga tegishli emas.
 *
 * Telefon alohida karta, chunki uni o'zgartirish ikki qadamli — yangi raqamga
 * SMS kod boradi va o'sha tasdiqlangandagina almashadi.
 */
const ProfileEditScreen: React.FC<ProfileScreenProps<typeof ROUTES.PROFILE_EDIT>> = ({
  navigation,
}) => {
  const theme = useAppTheme();
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { profile, setProfile } = useContext(AuthContext);
  const { workspace, setBusinessWorkspace } = useContext(WorkspaceContext);
  const { loadingKey, status, statusError, run } = useProfileAction();
  const queryClient = useQueryClient();

  const token = profile?.jwt;

  const isBusiness = workspace.mode === 'business';
  const isOwner = workspace.activeBusinessRole === 'OWNER';
  const { data: businesses } = useMyBusinesses(isBusiness);
  const activeBusiness = useMemo(
    () => (isBusiness ? businesses?.find((b) => b.id === workspace.activeBusinessId) ?? null : null),
    [isBusiness, businesses, workspace.activeBusinessId]
  );

  const [businessName, setBusinessName] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');

  // Ro'yxat kechroq kelishi mumkin — kelgach maydonlarni to'ldiramiz.
  useEffect(() => {
    if (!activeBusiness) return;
    setBusinessName(activeBusiness.name ?? '');
    setBusinessAddress(activeBusiness.address ?? '');
  }, [activeBusiness]);

  const saveBusiness = () =>
    run('business', async () => {
      const businessId = workspace.activeBusinessId;
      if (!token) throw new Error(t('profile.noToken'));
      if (!businessId) throw new Error(t('profile.genericError'));
      const cleanName = businessName.trim();
      if (!cleanName) throw new Error(t('profile.enterBusinessName'));

      const updated = await updateBusiness(
        businessId,
        { name: cleanName, address: businessAddress.trim() },
        token
      );

      queryClient.setQueryData<BusinessDTO[]>(myBusinessesQueryKey(profile?.id), (prev) =>
        prev?.map((b) => (b.id === businessId ? { ...b, ...updated } : b))
      );
      // Ish maydoni almashtirgichida ham yangi nom ko'rinsin.
      setBusinessWorkspace({
        id: businessId,
        name: updated.name,
        role: workspace.activeBusinessRole ?? 'OWNER',
      });
    });

  const [name, setName] = useState(profile?.name ?? '');
  const [surname, setSurname] = useState(profile?.surname ?? '');
  const [username, setUsername] = useState(profile?.username ?? '');
  const [pendingUsername, setPendingUsername] = useState('');
  const [confirmCode, setConfirmCode] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const saveDetail = () =>
    run('detail', async () => {
      if (!token) throw new Error(t('profile.noToken'));
      await updateProfileDetail({ name: name.trim(), surname: surname.trim() }, token);
      setProfile((prev) => (prev ? { ...prev, name: name.trim(), surname: surname.trim() } : prev));
    });

  const requestUsername = () =>
    run('username', async () => {
      if (!token) throw new Error(t('profile.noToken'));
      const clean = username.trim();
      if (!clean) throw new Error(t('profile.enterUsername'));
      await updateProfileUsername({ username: clean }, token);
      setPendingUsername(clean);
      setConfirmCode('');
    });

  const confirmUsername = () =>
    run('usernameConfirm', async () => {
      if (!token) throw new Error(t('profile.noToken'));
      const code = confirmCode.trim();
      if (!code) throw new Error(t('profile.enterCode'));
      await confirmProfileUsername({ code }, token);
      if (pendingUsername) {
        setProfile((prev) => (prev ? { ...prev, username: pendingUsername } : prev));
      }
      setPendingUsername('');
      setConfirmCode('');
    });

  const savePassword = () =>
    run('password', async () => {
      if (!token) throw new Error(t('profile.noToken'));
      if (!oldPassword.trim() || !newPassword.trim() || !confirmNewPassword.trim()) {
        throw new Error(t('profile.enterPasswords'));
      }
      if (newPassword.trim().length < 8) throw new Error(t('profile.passwordMin'));
      if (newPassword.trim() !== confirmNewPassword.trim()) {
        throw new Error(t('profile.passwordMismatch'));
      }
      await updateProfilePassword(
        { oldPassword: oldPassword.trim(), newPassword: newPassword.trim() },
        token
      );
      setOldPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    });

  // Biznes ish maydonida shu biznes tahrirlanadi, shaxsiy profil emas.
  if (isBusiness) {
    return (
      <View style={styles.container}>
        <ScreenHeader title={t('profile.editBusinessInfo')} onBack={navigation.goBack} />

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {status ? (
              <Text style={[styles.status, statusError && styles.statusError]}>{status}</Text>
            ) : null}

            <Card style={styles.card}>
              <Text style={styles.cardTitle}>{t('profile.businessSection')}</Text>
              <Input
                label={t('profile.businessName')}
                value={businessName}
                onChangeText={setBusinessName}
                editable={isOwner}
              />
              <Input
                label={t('profile.businessAddress')}
                value={businessAddress}
                onChangeText={setBusinessAddress}
                editable={isOwner}
              />
              {isOwner ? (
                <Button
                  title={t('common.save')}
                  onPress={saveBusiness}
                  loading={loadingKey === 'business'}
                />
              ) : (
                // Server ham shuni tekshiradi — bu faqat kutishni to'g'rilaydi.
                <Text style={styles.hint}>{t('profile.businessOwnerOnly')}</Text>
              )}
            </Card>

            <Text style={styles.hint}>{t('profile.personalInPersonalWorkspace')}</Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('profile.editInfo')} onBack={navigation.goBack} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {status ? (
            <Text style={[styles.status, statusError && styles.statusError]}>{status}</Text>
          ) : null}

          <Card style={styles.card}>
            <Text style={styles.cardTitle}>{t('profile.nameSection')}</Text>
            <Input label={t('profile.name')} value={name} onChangeText={setName} />
            <Input label={t('profile.surname')} value={surname} onChangeText={setSurname} />
            <Button
              title={t('common.save')}
              onPress={saveDetail}
              loading={loadingKey === 'detail'}
            />
          </Card>

          <Card style={styles.card}>
            <Text style={styles.cardTitle}>{t('profile.phoneSection')}</Text>
            <Input
              label={t('profile.phone')}
              value={username}
              onChangeText={setUsername}
              keyboardType="phone-pad"
            />
            {pendingUsername ? (
              <>
                {/* Yangi raqamga kod yuborildi — almashuv shu tasdiqdan keyin bo'ladi. */}
                <Input
                  label={t('profile.confirmCode')}
                  value={confirmCode}
                  onChangeText={setConfirmCode}
                  keyboardType="number-pad"
                />
                <Button
                  title={t('common.confirm')}
                  onPress={confirmUsername}
                  loading={loadingKey === 'usernameConfirm'}
                />
              </>
            ) : (
              <Button
                title={t('common.save')}
                variant="outline"
                onPress={requestUsername}
                loading={loadingKey === 'username'}
              />
            )}
          </Card>

          <Card style={styles.card}>
            <Text style={styles.cardTitle}>{t('profile.changePassword')}</Text>
            <Input
              label={t('profile.oldPasswordLabel')}
              value={oldPassword}
              onChangeText={setOldPassword}
              secureTextEntry
            />
            <Input
              label={t('profile.newPassword')}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
            />
            <Input
              label={t('profile.newPasswordConfirm')}
              value={confirmNewPassword}
              onChangeText={setConfirmNewPassword}
              secureTextEntry
            />
            <Button
              title={t('common.save')}
              variant="outline"
              onPress={savePassword}
              loading={loadingKey === 'password'}
            />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const createStyles = ({ colors, spacing, typography }: ThemeValue) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    flex: {
      flex: 1,
    },
    content: {
      padding: spacing.md,
      paddingBottom: spacing.xxl,
      gap: spacing.sm,
    },
    card: {
      gap: spacing.xs,
    },
    cardTitle: {
      ...typography.caption,
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    status: {
      ...typography.caption,
      color: colors.success,
      textAlign: 'center',
    },
    statusError: {
      color: colors.danger,
    },
    hint: {
      ...typography.caption,
      fontSize: 12,
      color: colors.textSecondary,
      textAlign: 'center',
    },
  });

export default ProfileEditScreen;
