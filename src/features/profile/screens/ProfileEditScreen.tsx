import React, { useContext, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import ScreenHeader from '../../../shared/ui/ScreenHeader';
import Card from '../../../shared/ui/Card';
import Input from '../../../shared/ui/Input';
import Button from '../../../shared/ui/Button';
import { useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import { AuthContext } from '../../auth/context/AuthContext';
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
 * Axborotni tahrirlash: ism-familiya, telefon va parol.
 *
 * Telefon alohida karta, chunki uni o'zgartirish ikki qadamli — yangi raqamga
 * SMS kod boradi va o'sha tasdiqlangandagina almashadi. Ism-familiya esa
 * darhol saqlanadi.
 */
const ProfileEditScreen: React.FC<ProfileScreenProps<typeof ROUTES.PROFILE_EDIT>> = ({
  navigation,
}) => {
  const theme = useAppTheme();
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { profile, setProfile } = useContext(AuthContext);
  const { loadingKey, status, statusError, run } = useProfileAction();

  const token = profile?.jwt;

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
  });

export default ProfileEditScreen;
