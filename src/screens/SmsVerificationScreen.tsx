import React, { useContext, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { verifySms, resendSms } from '../api/auth';
import { AuthContext } from '../context/AuthContext';
import { ProfileDTO } from '../types';
import AuthShell from '../components/auth/AuthShell';
import { useAuthStyles } from '../components/auth/authStyles';
import { useI18n } from '../i18n';
import { useAppTheme } from '../theme';
import type { AuthScreenProps } from '../navigation/types';

const SmsVerificationScreen: React.FC<AuthScreenProps<'SmsVerification'>> = ({ navigation, route }) => {
  const { t } = useI18n();
  const s = useAuthStyles();
  const { colors } = useAppTheme();
  const username = String(route?.params?.username || '').trim();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setProfile } = useContext(AuthContext);

  const handleVerify = async () => {
    setError('');
    if (!username) {
      setError(t('sms.noNumber'));
      return;
    }
    setLoading(true);
    try {
      const profile = (await verifySms({ phone: username, code: code.trim() })) as ProfileDTO;
      setProfile(profile);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('sms.checkCode'));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    if (!username) {
      setError(t('sms.noNumber'));
      return;
    }
    try {
      await resendSms({ phone: username });
    } catch (e) {
      setError(t('sms.resendFailed'));
    }
  };

  return (
    <AuthShell icon="mail-outline" title={t('sms.title')} subtitle={t('sms.subtitle')} onBack={() => navigation.goBack()}>
      <View style={s.field}>
        <Text style={s.fieldLabel}>{t('sms.code')}</Text>
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
        {loading ? <ActivityIndicator size="small" color={colors.textOnPrimary} /> : <Text style={s.buttonText}>{t('sms.submit')}</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={handleResend}>
        <Text style={s.linkCenter}>{t('sms.resend')}</Text>
      </TouchableOpacity>
    </AuthShell>
  );
};

export default SmsVerificationScreen;
