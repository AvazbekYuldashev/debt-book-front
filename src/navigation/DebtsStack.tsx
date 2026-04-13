import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DebtListScreen from '../screens/DebtListScreen';
import ContactDetailScreen from '../screens/ContactDetailScreen';
import { ROUTES } from './routes';
import { withFadeInScreen } from './withFadeInScreen';

const Stack = createNativeStackNavigator();
const DebtListScreenWithFade = withFadeInScreen(DebtListScreen);
const ContactDetailScreenWithFade = withFadeInScreen(ContactDetailScreen);

const DebtsStack: React.FC = () => (
  <Stack.Navigator>
    <Stack.Screen name={ROUTES.DEBT_LIST} component={DebtListScreenWithFade} options={{ headerShown: false }} />
    <Stack.Screen
      name={ROUTES.CONTACT_DETAIL}
      component={ContactDetailScreenWithFade}
      options={{ headerShown: false }}
    />
  </Stack.Navigator>
);

export default DebtsStack;
