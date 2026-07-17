import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../../features/auth/screens/LoginScreen';
import RegisterScreen from '../../features/auth/screens/RegisterScreen';
import SmsVerificationScreen from '../../features/auth/screens/SmsVerificationScreen';
import ResetPasswordScreen from '../../features/auth/screens/ResetPasswordScreen';
import ResetConfirmScreen from '../../features/auth/screens/ResetConfirmScreen';
import type { AuthStackParamList } from './types';
import { withFadeInScreen } from './withFadeInScreen';

const Stack = createNativeStackNavigator<AuthStackParamList>();
const LoginScreenWithFade = withFadeInScreen(LoginScreen);
const RegisterScreenWithFade = withFadeInScreen(RegisterScreen);
const SmsVerificationScreenWithFade = withFadeInScreen(SmsVerificationScreen);
const ResetPasswordScreenWithFade = withFadeInScreen(ResetPasswordScreen);
const ResetConfirmScreenWithFade = withFadeInScreen(ResetConfirmScreen);

const AuthStack: React.FC = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreenWithFade} />
    <Stack.Screen name="Register" component={RegisterScreenWithFade} />
    <Stack.Screen name="SmsVerification" component={SmsVerificationScreenWithFade} />
    <Stack.Screen name="ResetPassword" component={ResetPasswordScreenWithFade} />
    <Stack.Screen name="ResetConfirm" component={ResetConfirmScreenWithFade} />
  </Stack.Navigator>
);

export default AuthStack;
