import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import colors from '../styles/colors';
import { resetPassword } from '../api/auth';
import AuthShell from '../components/auth/AuthShell';
import { authStyles as s } from '../components/auth/authStyles';
import { useI18n } from '../i18n';

const ResetPasswordScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { t } = useI18n();
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
    <AuthShell emoji="🔒" title={t('reset.title')} subtitle={t('reset.subtitle')} onBack={() => navigation.goBack()}>
      <View style={s.field}>
        <Text style={s.fieldLabel}>{t('reset.phone')}</Text>
        <View style={s.inputRow}>
          <Text style={s.phonePrefix}>+998</Text>
          <TextInput
            style={s.input}
            placeholder="90 123 45 67"
            placeholderTextColor={colors.textSecondary}
            value={username}
            onChangeText={handleUsernameChange}
            keyboardType="number-pad"
          />
        </View>
      </View>

      {error ? <Text style={s.errorText}>{error}</Text> : null}

      <TouchableOpacity style={s.button} onPress={handleReset} activeOpacity={0.9}>
        <Text style={s.buttonText}>{t('reset.submit')}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={s.linkCenter}>{t('reset.backToLogin')}</Text>
      </TouchableOpacity>
    </AuthShell>
  );
};

export default ResetPasswordScreen;
