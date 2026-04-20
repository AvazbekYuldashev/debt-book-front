import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import colors from '../styles/colors';
import { ApiRequestError, register } from '../api/auth';

const RegisterScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleUsernameChange = (value: string) => {
    let digits = value.replace(/\D/g, '');
    if (digits.startsWith('998')) {
      digits = digits.slice(3);
    }
    setUsername(digits.slice(0, 9));
  };

  const handleRegister = async () => {
    setErrorMessage('');
    const payload = {
      name: name.trim(),
      surname: surname.trim(),
      username: username.trim(),
      password,
    };

    if (!payload.name || !payload.surname || !payload.username || !payload.password) {
      Alert.alert('Xatolik', 'Barcha maydonlarni to`ldiring');
      return;
    }

    if (payload.password.length < 8) {
      Alert.alert('Xatolik', 'Parol kamida 8 ta belgidan iborat bo`lishi kerak');
      return;
    }

    try {
      await register(payload);
      Alert.alert('Success', 'Registration successful. Please verify via SMS');
      navigation.navigate('SmsVerification', { username: `998${payload.username}` });
    } catch (e) {
      console.error('Registration failed', e);
      let message = e instanceof Error ? e.message : 'Please try again';
      if (e instanceof ApiRequestError) {
        const raw =
          typeof e.responseBody === 'string'
            ? e.responseBody
            : JSON.stringify(e.responseBody);
        console.log('Registration error response:', { status: e.status, body: e.responseBody });
        message = raw || message;
      }
      setErrorMessage(message);
      Alert.alert('Registration failed', message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ro'yxatdan o'tish</Text>
      <TextInput
        style={styles.input}
        placeholder="Ism"
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={styles.input}
        placeholder="Familya"
        value={surname}
        onChangeText={setSurname}
      />
      <View style={styles.phoneInputRow}>
        <Text style={styles.phonePrefix}>+998</Text>
        <TextInput
          style={styles.phoneInput}
          placeholder="+998 90 123 45 67"
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
      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
      <TouchableOpacity style={styles.button} onPress={handleRegister}>
        <Text style={styles.buttonText}>Ro'yxatdan o'tish</Text>
      </TouchableOpacity>
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
  errorText: {
    color: colors.danger,
    marginBottom: 10,
    fontSize: 14,
  },
});

export default RegisterScreen;
