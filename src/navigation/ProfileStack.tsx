import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ProfileScreen from '../screens/ProfileScreen';
import MyBusinessesScreen from '../screens/MyBusinessesScreen';
import BusinessMembersScreen from '../screens/BusinessMembersScreen';
import { ROUTES } from './routes';
import { withFadeInScreen } from './withFadeInScreen';

const Stack = createNativeStackNavigator();

const ProfileScreenWithFade = withFadeInScreen(ProfileScreen);
const MyBusinessesScreenWithFade = withFadeInScreen(MyBusinessesScreen);
const BusinessMembersScreenWithFade = withFadeInScreen(BusinessMembersScreen);

const ProfileStack: React.FC = () => (
  <Stack.Navigator>
    <Stack.Screen name={ROUTES.PROFILE_HOME} component={ProfileScreenWithFade} options={{ headerShown: false }} />
    <Stack.Screen name={ROUTES.MY_BUSINESSES} component={MyBusinessesScreenWithFade} options={{ title: 'My Businesses' }} />
    <Stack.Screen
      name={ROUTES.BUSINESS_MEMBERS}
      component={BusinessMembersScreenWithFade}
      options={{ title: 'Business Members' }}
    />
  </Stack.Navigator>
);

export default ProfileStack;
