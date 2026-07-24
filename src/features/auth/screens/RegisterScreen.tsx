import React, { useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ApiRequestError, register } from '../api/auth';
import AuthShell from '../components/AuthShell';
import AuthTextInput from '../components/AuthTextInput';
import { useAuthStyles } from '../components/authStyles';
import { useI18n } from '../../../shared/i18n';
import { useAppTheme } from '../../../shared/theme';
import type { AuthNavigation } from '../../../app/navigation/types';

const RegisterScreen: React.FC<{ navigation: AuthNavigation }> = ({ navigation }) => {
  const { t } = useI18n();
  const s = useAuthStyles();
  const { colors } = useAppTheme();
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  // Klaviaturadagi "keyingi" tugmasi bilan maydondan maydonga o'tish uchun.
  const surnameRef = useRef<TextInput>(null);
  const usernameRef = useRef<TextInput>(null);

  const handleUsernameChange = (value: string) => {
    let digits = value.replace(/\D/g, '');
    if (digits.startsWith('998')) digits = digits.slice(3);
    setUsername(digits.slice(0, 9));
  };

  const handleRegister = async () => {
    setErrorMessage('');
    const payload = { name: name.trim(), surname: surname.trim(), username: username.trim(), password };

    if (!payload.name || !payload.surname || !payload.username || !payload.password) {
      setErrorMessage(t('register.fillAll'));
      return;
    }
    if (payload.password.length < 8) {
      setErrorMessage(t('register.passwordMin'));
      return;
    }

    try {
      await register(payload);
      navigation.navigate('SmsVerification', { username: `998${payload.username}` });
    } catch (e) {
      let message = e instanceof Error ? e.message : t('common.tryAgain');
      if (e instanceof ApiRequestError) {
        const raw = typeof e.responseBody === 'string' ? e.responseBody : JSON.stringify(e.responseBody);
        message = e.message || raw || message;
      }
      setErrorMessage(message);
    }
  };

  return (
    <AuthShell icon="person-add-outline" title={t('register.title')} subtitle={t('register.subtitle')} onBack={() => navigation.goBack()}>
      <View style={s.field}>
        <Text style={s.fieldLabel}>{t('register.name')}</Text>
        <View style={s.inputRow}>
          <AuthTextInput
            style={s.input}
            placeholder={t('register.name')}
            placeholderTextColor={colors.textSecondary}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            autoComplete="name-given"
            textContentType="givenName"
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => surnameRef.current?.focus()}
          />
        </View>
      </View>

      <View style={s.field}>
        <Text style={s.fieldLabel}>{t('register.surname')}</Text>
        <View style={s.inputRow}>
          <AuthTextInput
            ref={surnameRef}
            style={s.input}
            placeholder={t('register.surname')}
            placeholderTextColor={colors.textSecondary}
            value={surname}
            onChangeText={setSurname}
            autoCapitalize="words"
            autoComplete="name-family"
            textContentType="familyName"
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => usernameRef.current?.focus()}
          />
        </View>
      </View>

      <View style={s.field}>
        <Text style={s.fieldLabel}>{t('register.phone')}</Text>
        <View style={s.inputRow}>
          <Text style={s.phonePrefix}>+998</Text>
          <AuthTextInput
            ref={usernameRef}
            style={s.input}
            placeholder="90 123 45 67"
            placeholderTextColor={colors.textSecondary}
            value={username}
            onChangeText={handleUsernameChange}
            keyboardType="number-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
          />
        </View>
      </View>

      <View style={s.field}>
        <Text style={s.fieldLabel}>{t('register.password')}</Text>
        <View style={s.inputRow}>
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
            onSubmitEditing={handleRegister}
          />
          <TouchableOpacity style={s.eyeBtn} onPress={() => setShowPassword((p) => !p)}>
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {errorMessage ? <Text style={s.errorText}>{errorMessage}</Text> : null}

      <TouchableOpacity style={s.button} onPress={handleRegister} activeOpacity={0.9}>
        <Text style={s.buttonText}>{t('register.submit')}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={s.linkCenter}>{t('register.haveAccount')}</Text>
      </TouchableOpacity>
    </AuthShell>
  );
};

export default RegisterScreen;
