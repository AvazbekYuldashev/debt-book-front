import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ExpensesScreen from '../screens/ExpensesScreen';
import ExpenseCategoryDetailScreen from '../screens/ExpenseCategoryDetailScreen';
import { ROUTES } from './routes';
import { withFadeInScreen } from './withFadeInScreen';

const Stack = createNativeStackNavigator();
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
      options={{ title: 'Xarajatlar' }}
    />
  </Stack.Navigator>
);

export default ExpensesStack;
