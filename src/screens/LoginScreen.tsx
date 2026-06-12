import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../styles/colors';
import { ApiRequestError, login } from '../api/auth';
import { AuthContext } from '../context/AuthContext';
import AuthShell from '../components/auth/AuthShell';
import { authStyles as s } from '../components/auth/authStyles';
import { useI18n } from '../i18n';

const LoginScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { t } = useI18n();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { setProfile } = useContext(AuthContext);

  const handleUsernameChange = (value: string) => {
    let digits = value.replace(/\D/g, '');
    if (digits.startsWith('998')) digits = digits.slice(3);
    setUsername(digits.slice(0, 9));
  };

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const profile = await login({ username, password });
      setProfile(profile);
    } catch (e) {
      if (e instanceof ApiRequestError) {
        setError(e.message || t('login.error'));
        return;
      }
      if (e instanceof Error && e.message) {
        setError(e.message);
        return;
      }
      setError(t('login.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell emoji="👋" title={t('login.title')} subtitle={t('login.subtitle')}>
      <View style={s.field}>
        <Text style={s.fieldLabel}>{t('login.phone')}</Text>
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
        <Text style={s.fieldLabel}>{t('login.password')}</Text>
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

      <TouchableOpacity style={s.button} onPress={handleLogin} disabled={loading} activeOpacity={0.9}>
        {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.buttonText}>{t('login.submit')}</Text>}
      </TouchableOpacity>

      <View style={s.footerRow}>
        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
          <Text style={s.link}>{t('login.register')}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('ResetPassword')}>
          <Text style={s.link}>{t('login.reset')}</Text>
        </TouchableOpacity>
      </View>
    </AuthShell>
  );
};

export default LoginScreen;
