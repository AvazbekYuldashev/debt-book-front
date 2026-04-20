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
import { resetPassword } from '../api/auth';

const ResetPasswordScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [username, setUsername] = useState('');

  const handleUsernameChange = (value: string) => {
    let digits = value.replace(/\D/g, '');
    if (digits.startsWith('998')) {
      digits = digits.slice(3);
    }
    setUsername(digits.slice(0, 9));
  };

  const handleReset = async () => {
    try {
      await resetPassword({ username: username.trim() });
      Alert.alert('Sent', 'Check your SMS for reset code');
      navigation.navigate('ResetConfirm');
    } catch (e) {
      console.error(e);
      const message = e instanceof Error ? e.message : 'Unable to initiate reset';
      Alert.alert('Error', message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Parolni tiklash</Text>
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
      <TouchableOpacity style={styles.button} onPress={handleReset}>
        <Text style={styles.buttonText}>Yuborish</Text>
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
});

export default ResetPasswordScreen;
