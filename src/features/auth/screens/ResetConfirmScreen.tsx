import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { confirmReset } from '../api/auth';
import AuthShell from '../components/AuthShell';
import AuthButton from '../components/AuthButton';
import AuthTextInput from '../components/AuthTextInput';
import AuthField from '../components/AuthField';
import { useAuthStyles } from '../components/authStyles';
import { useI18n } from '../../../shared/i18n';
import { useAppTheme } from '../../../shared/theme';
import type { AuthNavigation } from '../../../app/navigation/types';

const ResetConfirmScreen: React.FC<{ navigation: AuthNavigation }> = ({ navigation }) => {
  const { t } = useI18n();
  const s = useAuthStyles();
  const { colors } = useAppTheme();
  const [username, setUsername] = useState('');
  const [confirmCode, setConfirmCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleUsernameChange = (value: string) => {
    let digits = value.replace(/\D/g, '');
    if (digits.startsWith('998')) digits = digits.slice(3);
    setUsername(digits.slice(0, 9));
  };

  const handleConfirm = async () => {
    setError('');
    try {
      await confirmReset({ username: username.trim(), confirmCode: confirmCode.trim(), password });
      Alert.alert(t('resetConfirm.successTitle'), t('resetConfirm.successBody'));
      navigation.navigate('Login');
    } catch (e) {
      setError(e instanceof Error ? e.message : t('resetConfirm.failed'));
    }
  };

  return (
    <AuthShell
      title={t('resetConfirm.title')}
      subtitle={t('resetConfirm.subtitle')}
      onBack={() => navigation.goBack()}
      bottomAction={<AuthButton label={t('resetConfirm.submit')} onPress={handleConfirm} />}
    >
      <AuthField label={t('resetConfirm.phone')}>
        <Text style={s.phonePrefix}>+998</Text>
        <AuthTextInput
          style={s.input}
          placeholder="90 123 45 67"
          placeholderTextColor={colors.textSecondary}
          value={username}
          onChangeText={handleUsernameChange}
          keyboardType="number-pad"
        />
      </AuthField>

      <AuthField label={t('resetConfirm.code')}>
        <AuthTextInput
          style={s.input}
          placeholder={t('resetConfirm.codePlaceholder')}
          placeholderTextColor={colors.textSecondary}
          value={confirmCode}
          onChangeText={(v) => setConfirmCode(v.replace(/\D/g, '').slice(0, 6))}
          keyboardType="number-pad"
        />
      </AuthField>

      <AuthField label={t('resetConfirm.newPassword')}>
        <AuthTextInput
          style={s.input}
          placeholder="••••••••"
          placeholderTextColor={colors.textSecondary}
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={setPassword}
          autoComplete="password-new"
          textContentType="newPassword"
          returnKeyType="done"
          onSubmitEditing={handleConfirm}
        />
        <TouchableOpacity style={s.eyeBtn} onPress={() => setShowPassword((p) => !p)}>
          <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </AuthField>

      {error ? <Text style={s.errorText}>{error}</Text> : null}

      <View style={s.footerRow}>
        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={s.footerLink}>{t('reset.backToLogin')}</Text>
        </TouchableOpacity>
      </View>
    </AuthShell>
  );
};

export default ResetConfirmScreen;
