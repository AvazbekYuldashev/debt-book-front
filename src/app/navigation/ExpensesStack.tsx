import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ExpensesScreen from '../../features/expenses/screens/ExpensesScreen';
import ExpenseCategoryDetailScreen from '../../features/expenses/screens/ExpenseCategoryDetailScreen';
import { ROUTES } from './routes';
import type { ExpensesStackParamList } from './types';
import { withFadeInScreen } from './withFadeInScreen';

const Stack = createNativeStackNavigator<ExpensesStackParamList>();
const ExpensesScreenWithFade = withFadeInScreen(ExpensesScreen);
const ExpenseCategoryDetailScreenWithFade = withFadeInScreen(ExpenseCategoryDetailScreen);

const ExpensesStack: React.FC = () => (
  <Stack.Navigator>
    <Stack.Screen
      name={ROUTES.EXPENSE_CATEGORIES}
      component={ExpensesScreenWithFade}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name={ROUTES.EXPENSE_CATEGORY_DETAIL}
      component={ExpenseCategoryDetailScreenWithFade}
      options={{ headerShown: false }}
    />
  </Stack.Navigator>
);

export default ExpensesStack;
