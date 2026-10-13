import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import RentalListScreen from '../../features/rentals/screens/RentalListScreen';
import { ROUTES } from './routes';
import type { RentalsStackParamList } from './types';
import { withFadeInScreen } from './withFadeInScreen';

const Stack = createNativeStackNavigator<RentalsStackParamList>();
const RentalListScreenWithFade = withFadeInScreen(RentalListScreen);

/**
 * Ijara — Mahsulotlar kabi BIZNES bo'limi (tabni BottomTabNavigator
 * yashiradi). Ombor ham, ijaralar ham shu yerda: buyumlar biznesniki va
 * uning barcha adminlariga ko'rinadi.
 *
 * Hozircha bitta ekran, lekin qolgan tablar kabi stack ichida: buyum
 * tafsiloti alohida ekranga chiqsa navigator qayta qurilmaydi.
 */
const RentalsStack: React.FC = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name={ROUTES.RENTAL_LIST} component={RentalListScreenWithFade} />
  </Stack.Navigator>
);

export default RentalsStack;
