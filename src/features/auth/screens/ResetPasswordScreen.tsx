import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { resetPassword } from '../api/auth';
import AuthShell from '../components/AuthShell';
import AuthButton from '../components/AuthButton';
import AuthTextInput from '../components/AuthTextInput';
import AuthField from '../components/AuthField';
import { useAuthStyles } from '../components/authStyles';
import { useI18n } from '../../../shared/i18n';
import { useAppTheme } from '../../../shared/theme';
import type { AuthNavigation } from '../../../app/navigation/types';

const ResetPasswordScreen: React.FC<{ navigation: AuthNavigation }> = ({ navigation }) => {
  const { t } = useI18n();
  const s = useAuthStyles();
  const { colors } = useAppTheme();
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');

  const handleUsernameChange = (value: string) => {
    let digits = value.replace(/\D/g, '');
    if (digits.startsWith('998')) digits = digits.slice(3);
    setUsername(digits.slice(0, 9));
  };

  const handleReset = async () => {
    setError('');
    try {
      await resetPassword({ username: username.trim() });
      Alert.alert(t('reset.sentTitle'), t('reset.sentBody'));
      navigation.navigate('ResetConfirm');
    } catch (e) {
      setError(e instanceof Error ? e.message : t('reset.failed'));
    }
  };

  return (
    <AuthShell
      title={t('reset.title')}
      subtitle={t('reset.subtitle')}
      onBack={() => navigation.goBack()}
      /* Maydon bittagina: tugma uning ostida, ekran o'rtasida osilib
         qolardi. Pastga mixlangani barmoqqa ham yaqin. */
      bottomAction={<AuthButton label={t('reset.submit')} onPress={handleReset} />}
    >
      <AuthField label={t('reset.phone')}>
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

      {error ? <Text style={s.errorText}>{error}</Text> : null}

      <View style={s.footerRow}>
        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={s.footerLink}>{t('reset.backToLogin')}</Text>
        </TouchableOpacity>
      </View>
    </AuthShell>
  );
};

export default ResetPasswordScreen;
