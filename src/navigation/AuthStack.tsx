import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import SmsVerificationScreen from '../screens/SmsVerificationScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import ResetConfirmScreen from '../screens/ResetConfirmScreen';
import { withFadeInScreen } from './withFadeInScreen';

const Stack = createNativeStackNavigator();
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
