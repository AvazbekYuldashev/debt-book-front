import React, { useContext, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import colors from '../styles/colors';
import { verifySms, resendSms } from '../api/auth';
import { AuthContext } from '../context/AuthContext';
import { ProfileDTO } from '../types';

const SmsVerificationScreen: React.FC<{ navigation: any; route: any }> = ({ route }) => {
  const username = String(route?.params?.username || '').trim();
  const [code, setCode] = useState('');
  const { setProfile } = useContext(AuthContext);

  const handleVerify = async () => {
    if (!username) {
      Alert.alert('Verification failed', 'Username topilmadi, qayta ro`yxatdan o`ting');
      return;
    }
    try {
      const profile = await verifySms({ phone: username, code: code.trim() }) as ProfileDTO;
      setProfile(profile);
      Alert.alert('Success', 'Verification completed');
    } catch (e) {
      console.error(e);
      const message = e instanceof Error ? e.message : 'Please check code';
      Alert.alert('Verification failed', message);
    }
  };

  const handleResend = async () => {
    if (!username) {
      Alert.alert('Error', 'Username topilmadi, qayta ro`yxatdan o`ting');
      return;
    }
    try {
      await resendSms({ phone: username });
      Alert.alert('Sent', 'Verification code resent');
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Unable to resend');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SMS Tasdiqlash</Text>
      <TextInput
        style={styles.input}
        placeholder="Kod"
        value={code}
        onChangeText={setCode}
        keyboardType="numeric"
      />
      <TouchableOpacity style={styles.button} onPress={handleVerify}>
        <Text style={styles.buttonText}>Tasdiqlash</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.linkButton} onPress={handleResend}>
        <Text style={styles.linkText}>Qayta yuborish</Text>
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
  linkButton: {
    marginTop: 12,
    alignItems: 'center',
  },
  linkText: {
    color: colors.primary,
    fontSize: 14,
  },
});

export default SmsVerificationScreen;
