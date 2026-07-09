import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import DebtsStack from './DebtsStack';
import ExpensesStack from './ExpensesStack';
import ProfileStack from './ProfileStack';
import { Feather } from '@expo/vector-icons';
import { ROUTES } from './routes';
import type { MainTabParamList } from './types';
import { useI18n } from '../i18n';
import { useAppTheme } from '../theme';

const Tab = createBottomTabNavigator<MainTabParamList>();

const BottomTabNavigator: React.FC = () => {
  const { t } = useI18n();
  const { colors } = useAppTheme();
  const tabLabel = (routeName: string) => {
    if (routeName === ROUTES.DEBTS) return t('tab.debts');
    if (routeName === ROUTES.EXPENSES) return t('tab.expenses');
    if (routeName === ROUTES.PROFILE) return t('tab.profile');
    return routeName;
  };
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarLabel: tabLabel(route.name),
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          borderTopColor: colors.border,
          height: 62,
          paddingBottom: 8,
          paddingTop: 6,
          backgroundColor: colors.surface,
          shadowColor: '#0F172A',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.10,
          shadowRadius: 12,
          elevation: 16,
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
