import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ProductsScreen from '../../features/products/screens/ProductsScreen';
import { ROUTES } from './routes';
import type { ProductsStackParamList } from './types';
import { withFadeInScreen } from './withFadeInScreen';

const Stack = createNativeStackNavigator<ProductsStackParamList>();
const ProductsScreenWithFade = withFadeInScreen(ProductsScreen);

// Hozircha bitta ekran, lekin qolgan tablar kabi stack ichida: mahsulot
// tafsiloti / narx tarixi qo'shilganda navigator qayta qurilmaydi.
const ProductsStack: React.FC = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name={ROUTES.PRODUCT_LIST} component={ProductsScreenWithFade} />
  </Stack.Navigator>
);

export default ProductsStack;
