import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { confirmReset } from '../api/auth';
import AuthShell from '../components/auth/AuthShell';
import { useAuthStyles } from '../components/auth/authStyles';
import { useI18n } from '../i18n';
import { useAppTheme } from '../theme';

const ResetConfirmScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
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
    <AuthShell emoji="🔑" title={t('resetConfirm.title')} subtitle={t('resetConfirm.subtitle')} onBack={() => navigation.goBack()}>
      <View style={s.field}>
        <Text style={s.fieldLabel}>{t('resetConfirm.phone')}</Text>
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

      <View style={s.field}>
        <Text style={s.fieldLabel}>{t('resetConfirm.code')}</Text>
        <View style={s.inputRow}>
          <TextInput
            style={s.input}
            placeholder={t('resetConfirm.codePlaceholder')}
            placeholderTextColor={colors.textSecondary}
            value={confirmCode}
            onChangeText={(v) => setConfirmCode(v.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
          />
        </View>
      </View>

      <View style={s.field}>
        <Text style={s.fieldLabel}>{t('resetConfirm.newPassword')}</Text>
        <View style={s.inputRow}>
          <TextInput
            style={s.input}
            placeholder="••••••••"
            placeholderTextColor={colors.textSecondary}
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity style={s.eyeBtn} onPress={() => setShowPassword((p) => !p)}>
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {error ? <Text style={s.errorText}>{error}</Text> : null}

      <TouchableOpacity style={s.button} onPress={handleConfirm} activeOpacity={0.9}>
        <Text style={s.buttonText}>{t('resetConfirm.submit')}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={s.linkCenter}>{t('reset.backToLogin')}</Text>
      </TouchableOpacity>
    </AuthShell>
  );
};

export default ResetConfirmScreen;
