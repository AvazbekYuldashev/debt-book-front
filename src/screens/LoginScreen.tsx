import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import colors from '../styles/colors';
import { ApiRequestError, login } from '../api/auth';
import { AuthContext } from '../context/AuthContext';

const LoginScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { setProfile } = useContext(AuthContext);

  const handleUsernameChange = (value: string) => {
    let digits = value.replace(/\D/g, '');
    if (digits.startsWith('998')) {
      digits = digits.slice(3);
    }
    setUsername(digits.slice(0, 9));
  };

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const profile = await login({ username, password });
      setProfile(profile);
    } catch (e) {
      console.error(e);
      if (e instanceof ApiRequestError) {
        setError(e.message || 'Kirishda xatolik yuz berdi');
        return;
      }
      if (e && typeof e === 'object') {
        const maybeMessage = (e as { message?: unknown }).message;
        if (typeof maybeMessage === 'string' && maybeMessage) {
          setError(maybeMessage);
          return;
        }
      }
      if (e instanceof Error && e.message) {
        setError(e.message);
        return;
      }
      setError('Kirishda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Kirish</Text>
      <View style={styles.phoneInputRow}>
        <Text style={styles.phonePrefix}>+998</Text>
        <TextInput
          style={styles.phoneInput}
          placeholder="90 123 45 67"
          placeholderTextColor="#9CA3AF"
          value={username}
          onChangeText={handleUsernameChange}
          keyboardType="number-pad"
        />
      </View>
      <View style={styles.passwordInputRow}>
        <TextInput
          style={[styles.input, styles.passwordInput]}
          placeholder="Parol"
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={setPassword}
        />
        <TouchableOpacity style={styles.passwordToggle} onPress={() => setShowPassword((prev) => !prev)}>
          <Text style={styles.passwordToggleText}>{showPassword ? 'Yashir' : "Ko'rsat"}</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.buttonText}>Kirish</Text>}
      </TouchableOpacity>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <View style={styles.footerRow}>
        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
          <Text style={styles.link}>Ro'yxatdan o'tish</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('ResetPassword')}>
          <Text style={styles.link}>Parolni tiklash</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 24,
  },
  input: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  passwordInputRow: {
    position: 'relative',
    marginBottom: 16,
  },
  passwordInput: {
    marginBottom: 0,
    paddingRight: 80,
  },
  passwordToggle: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  passwordToggleText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  phoneInputRow: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  phonePrefix: {
    fontSize: 16,
    color: '#9CA3AF',
    marginRight: 8,
    fontWeight: '600',
  },
  phoneInput: {
    flex: 1,
    paddingVertical: 12,
    color: '#6B7280',
  },
  button: {
    backgroundColor: colors.primary,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  errorText: {
    marginTop: 12,
    color: colors.danger,
    fontSize: 13,
    textAlign: 'center',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  link: {
    color: colors.primary,
    fontSize: 14,
  },
});

export default LoginScreen;
