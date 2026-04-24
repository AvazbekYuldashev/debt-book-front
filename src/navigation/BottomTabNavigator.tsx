import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import DebtsStack from './DebtsStack';
import ExpensesStack from './ExpensesStack';
import ProfileStack from './ProfileStack';
import { Feather } from '@expo/vector-icons';
import { ROUTES } from './routes';
import colors from '../styles/colors';

const Tab = createBottomTabNavigator();

const BottomTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          borderTopColor: '#E5E7EB',
          height: 62,
          paddingBottom: 8,
          paddingTop: 6,
          backgroundColor: '#FFFFFF',
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        tabBarIcon: ({ color, focused }) => {
          let iconName: React.ComponentProps<typeof Feather>['name'] = 'circle';
          if (route.name === ROUTES.DEBTS) {
            iconName = 'list';
          } else if (route.name === ROUTES.EXPENSES) {
            iconName = 'dollar-sign';
          } else if (route.name === ROUTES.PROFILE) {
            iconName = 'user';
          }
          return <Feather name={iconName} size={focused ? 22 : 20} color={color} />;
        },
      })}
    >
      <Tab.Screen name={ROUTES.DEBTS} component={DebtsStack} />
      <Tab.Screen name={ROUTES.EXPENSES} component={ExpensesStack} />
      <Tab.Screen name={ROUTES.PROFILE} component={ProfileStack} />
    </Tab.Navigator>
  );
};

export default BottomTabNavigator;
