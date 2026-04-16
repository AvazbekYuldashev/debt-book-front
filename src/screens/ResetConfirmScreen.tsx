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
import { confirmReset } from '../api/auth';

const ResetConfirmScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [confirmCode, setConfirmCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleUsernameChange = (value: string) => {
    let digits = value.replace(/\D/g, '');
    if (digits.startsWith('998')) {
      digits = digits.slice(3);
    }
    setUsername(digits.slice(0, 9));
  };

  const handleConfirm = async () => {
    try {
      await confirmReset({
        username: username.trim(),
        confirmCode: confirmCode.trim(),
        password,
      });
      Alert.alert('Success', 'Password updated');
      navigation.navigate('Login');
    } catch (e) {
      console.error(e);
      const message = e instanceof Error ? e.message : 'Unable to reset password';
      Alert.alert('Error', message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Parolni yangilash</Text>
      <View style={styles.phoneInputRow}>
        <Text style={styles.phonePrefix}>+998</Text>
        <TextInput
          style={styles.phoneInput}
          placeholder="902597891"
          value={username}
          onChangeText={handleUsernameChange}
          keyboardType="number-pad"
        />
      </View>
      <TextInput
        style={styles.input}
        placeholder="Tasdiqlash kodi"
        value={confirmCode}
        onChangeText={setConfirmCode}
        keyboardType="numeric"
      />
      <View style={styles.passwordInputRow}>
        <TextInput
          style={[styles.input, styles.passwordInput]}
          placeholder="Yangi parol"
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={setPassword}
        />
        <TouchableOpacity style={styles.passwordToggle} onPress={() => setShowPassword((prev) => !prev)}>
          <Text style={styles.passwordToggleText}>{showPassword ? 'Yashir' : "Ko'rsat"}</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.button} onPress={handleConfirm}>
        <Text style={styles.buttonText}>Yangilash</Text>
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
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 20,
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
    backgroundColor: '#fff',
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
    color: colors.textPrimary,
    marginRight: 8,
    fontWeight: '600',
  },
  phoneInput: {
    flex: 1,
    paddingVertical: 12,
    color: colors.textPrimary,
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
});

export default ResetConfirmScreen;
