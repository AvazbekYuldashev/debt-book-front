import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DebtListScreen from '../../features/debts/screens/DebtListScreen';
import ContactDetailScreen from '../../features/debts/screens/ContactDetailScreen';
import NotificationsScreen from '../../features/notifications/screens/NotificationsScreen';
import { ROUTES } from './routes';
import type { DebtsStackParamList } from './types';
import { withFadeInScreen } from './withFadeInScreen';

const Stack = createNativeStackNavigator<DebtsStackParamList>();
const DebtListScreenWithFade = withFadeInScreen(DebtListScreen);
const ContactDetailScreenWithFade = withFadeInScreen(ContactDetailScreen);
const NotificationsScreenWithFade = withFadeInScreen(NotificationsScreen);

const DebtsStack: React.FC = () => (
  <Stack.Navigator>
    <Stack.Screen name={ROUTES.DEBT_LIST} component={DebtListScreenWithFade} options={{ headerShown: false }} />
    <Stack.Screen
      name={ROUTES.CONTACT_DETAIL}
      component={ContactDetailScreenWithFade}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name={ROUTES.NOTIFICATIONS}
      component={NotificationsScreenWithFade}
      options={{ headerShown: false }}
    />
  </Stack.Navigator>
);

export default DebtsStack;
