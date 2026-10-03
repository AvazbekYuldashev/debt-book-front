import React, { useContext, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { verifySms, resendSms } from '../api/auth';
import { AuthContext } from '../context/AuthContext';
import { ProfileDTO } from '../../../shared/types';
import AuthShell from '../components/AuthShell';
import AuthButton from '../components/AuthButton';
import AuthTextInput from '../components/AuthTextInput';
import AuthField from '../components/AuthField';
import { useAuthStyles } from '../components/authStyles';
import { useI18n } from '../../../shared/i18n';
import { useAppTheme } from '../../../shared/theme';
import type { AuthScreenProps } from '../../../app/navigation/types';

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
    <AuthShell
      title={t('sms.title')}
      subtitle={t('sms.subtitle')}
      onBack={() => navigation.goBack()}
      bottomAction={<AuthButton label={t('sms.submit')} onPress={handleVerify} loading={loading} />}
    >
      <AuthField label={t('sms.code')}>
        <AuthTextInput
          style={s.codeInput}
          placeholder="• • • • •"
          placeholderTextColor={colors.textSecondary}
          value={code}
          onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
          keyboardType="number-pad"
          autoComplete="sms-otp"
          textContentType="oneTimeCode"
        />
      </AuthField>

      {error ? <Text style={s.errorText}>{error}</Text> : null}

      {/* Kod kelmasa - qayta yuborish. Tasdiqlash tugmasi pastda
          mixlangani uchun bu qator maydonga yaqin turadi. */}
      <View style={s.footerRow}>
        <Text style={s.footerText}>{t('sms.notReceived')}</Text>
        <TouchableOpacity onPress={handleResend}>
          <Text style={s.footerLink}>{t('sms.resend')}</Text>
        </TouchableOpacity>
      </View>
    </AuthShell>
  );
};

export default SmsVerificationScreen;
