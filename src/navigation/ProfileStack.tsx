import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ProfileScreen from '../screens/ProfileScreen';
import MyBusinessesScreen from '../screens/MyBusinessesScreen';
import BusinessMembersScreen from '../screens/BusinessMembersScreen';
import OfferScreen from '../screens/legal/OfferScreen';
import TermsScreen from '../screens/legal/TermsScreen';
import PrivacyPolicyScreen from '../screens/legal/PrivacyPolicyScreen';
import { ROUTES } from './routes';
import type { ProfileStackParamList } from './types';
import { withFadeInScreen } from './withFadeInScreen';
import { useI18n } from '../i18n';

const Stack = createNativeStackNavigator<ProfileStackParamList>();

const ProfileScreenWithFade = withFadeInScreen(ProfileScreen);
const MyBusinessesScreenWithFade = withFadeInScreen(MyBusinessesScreen);
const BusinessMembersScreenWithFade = withFadeInScreen(BusinessMembersScreen);
const OfferScreenWithFade = withFadeInScreen(OfferScreen);
const TermsScreenWithFade = withFadeInScreen(TermsScreen);
const PrivacyPolicyScreenWithFade = withFadeInScreen(PrivacyPolicyScreen);

const ProfileStack: React.FC = () => {
  const { t } = useI18n();
  return (
    <Stack.Navigator>
      <Stack.Screen name={ROUTES.PROFILE_HOME} component={ProfileScreenWithFade} options={{ headerShown: false }} />
      <Stack.Screen name={ROUTES.MY_BUSINESSES} component={MyBusinessesScreenWithFade} options={{ title: 'My Businesses' }} />
      <Stack.Screen
        name={ROUTES.BUSINESS_MEMBERS}
        component={BusinessMembersScreenWithFade}
        options={{ title: 'Business Members' }}
      />
      <Stack.Screen name={ROUTES.OFFER} component={OfferScreenWithFade} options={{ title: t('legal.offerTitle') }} />
      <Stack.Screen name={ROUTES.TERMS} component={TermsScreenWithFade} options={{ title: t('legal.termsTitle') }} />
      <Stack.Screen
        name={ROUTES.PRIVACY_POLICY}
        component={PrivacyPolicyScreenWithFade}
        options={{ title: t('legal.privacyTitle') }}
      />
    </Stack.Navigator>
  );
};

export default ProfileStack;
