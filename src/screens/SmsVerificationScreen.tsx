import React, { useContext, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import colors from '../styles/colors';
import { verifySms, resendSms } from '../api/auth';
import { AuthContext } from '../context/AuthContext';
import { ProfileDTO } from '../types';
import AuthShell from '../components/auth/AuthShell';
import { authStyles as s } from '../components/auth/authStyles';

const SmsVerificationScreen: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  const username = String(route?.params?.username || '').trim();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setProfile } = useContext(AuthContext);

  const handleVerify = async () => {
    setError('');
    if (!username) {
      setError("Raqam topilmadi, qayta ro'yxatdan o'ting");
      return;
    }
    setLoading(true);
    try {
      const profile = (await verifySms({ phone: username, code: code.trim() })) as ProfileDTO;
      setProfile(profile);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kodni tekshiring");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    if (!username) {
      setError("Raqam topilmadi, qayta ro'yxatdan o'ting");
      return;
    }
    try {
      await resendSms({ phone: username });
    } catch (e) {
      setError("Qayta yuborib bo'lmadi");
    }
  };

  return (
    <AuthShell emoji="✉️" title="SMS tasdiqlash" subtitle="Raqamingizga yuborilgan kodni kiriting" onBack={() => navigation.goBack()}>
      <View style={s.field}>
        <Text style={s.fieldLabel}>Tasdiqlash kodi</Text>
        <View style={s.inputRow}>
          <TextInput
            style={s.codeInput}
            placeholder="• • • • •"
            placeholderTextColor={colors.textSecondary}
            value={code}
            onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
          />
        </View>
      </View>

      {error ? <Text style={s.errorText}>{error}</Text> : null}

      <TouchableOpacity style={s.button} onPress={handleVerify} disabled={loading} activeOpacity={0.9}>
        {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.buttonText}>Tasdiqlash</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={handleResend}>
        <Text style={s.linkCenter}>Kodni qayta yuborish</Text>
      </TouchableOpacity>
    </AuthShell>
  );
};

export default SmsVerificationScreen;
