import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ProfileScreen from '../../features/profile/screens/ProfileScreen';
import MyBusinessesScreen from '../../features/business/screens/MyBusinessesScreen';
import BusinessMembersScreen from '../../features/business/screens/BusinessMembersScreen';
import OfferScreen from '../../features/legal/screens/OfferScreen';
import TermsScreen from '../../features/legal/screens/TermsScreen';
import PrivacyPolicyScreen from '../../features/legal/screens/PrivacyPolicyScreen';
import { ROUTES } from './routes';
import type { ProfileStackParamList } from './types';
import { withFadeInScreen } from './withFadeInScreen';

const Stack = createNativeStackNavigator<ProfileStackParamList>();

const ProfileScreenWithFade = withFadeInScreen(ProfileScreen);
const MyBusinessesScreenWithFade = withFadeInScreen(MyBusinessesScreen);
const BusinessMembersScreenWithFade = withFadeInScreen(BusinessMembersScreen);
const OfferScreenWithFade = withFadeInScreen(OfferScreen);
const TermsScreenWithFade = withFadeInScreen(TermsScreen);
const PrivacyPolicyScreenWithFade = withFadeInScreen(PrivacyPolicyScreen);

// Har bir ekran o'zining ScreenHeader'ini chizadi (izchil orqaga tugmasi/sarlavha
// uchun) — shuning uchun native-stack'ning standart headeri barcha ekranlarda
// yashirilgan (headerShown: false).
const ProfileStack: React.FC = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name={ROUTES.PROFILE_HOME} component={ProfileScreenWithFade} />
    <Stack.Screen name={ROUTES.MY_BUSINESSES} component={MyBusinessesScreenWithFade} />
    <Stack.Screen name={ROUTES.BUSINESS_MEMBERS} component={BusinessMembersScreenWithFade} />
    <Stack.Screen name={ROUTES.OFFER} component={OfferScreenWithFade} />
    <Stack.Screen name={ROUTES.TERMS} component={TermsScreenWithFade} />
    <Stack.Screen name={ROUTES.PRIVACY_POLICY} component={PrivacyPolicyScreenWithFade} />
  </Stack.Navigator>
);

export default ProfileStack;
