import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import GapGroupsScreen from '../../features/gap/screens/GapGroupsScreen';
import GapGroupDetailScreen from '../../features/gap/screens/GapGroupDetailScreen';
import GapMembersScreen from '../../features/gap/screens/GapMembersScreen';
import GapQueueScreen from '../../features/gap/screens/GapQueueScreen';
import GapRoundsScreen from '../../features/gap/screens/GapRoundsScreen';
import GapHistoryScreen from '../../features/gap/screens/GapHistoryScreen';
import GapBalancesScreen from '../../features/gap/screens/GapBalancesScreen';
import GapSettlementScreen from '../../features/gap/screens/GapSettlementScreen';
import { ROUTES } from './routes';
import type { GapStackParamList } from './types';
import { withFadeInScreen } from './withFadeInScreen';

const Stack = createNativeStackNavigator<GapStackParamList>();

const GapGroupsScreenWithFade = withFadeInScreen(GapGroupsScreen);
const GapGroupDetailScreenWithFade = withFadeInScreen(GapGroupDetailScreen);
const GapMembersScreenWithFade = withFadeInScreen(GapMembersScreen);
const GapQueueScreenWithFade = withFadeInScreen(GapQueueScreen);
const GapRoundsScreenWithFade = withFadeInScreen(GapRoundsScreen);
const GapHistoryScreenWithFade = withFadeInScreen(GapHistoryScreen);
const GapBalancesScreenWithFade = withFadeInScreen(GapBalancesScreen);
const GapSettlementScreenWithFade = withFadeInScreen(GapSettlementScreen);

const GapStack: React.FC = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name={ROUTES.GAP_GROUPS} component={GapGroupsScreenWithFade} />
    <Stack.Screen name={ROUTES.GAP_GROUP_DETAIL} component={GapGroupDetailScreenWithFade} />
    <Stack.Screen name={ROUTES.GAP_MEMBERS} component={GapMembersScreenWithFade} />
    <Stack.Screen name={ROUTES.GAP_QUEUE} component={GapQueueScreenWithFade} />
    <Stack.Screen name={ROUTES.GAP_ROUNDS} component={GapRoundsScreenWithFade} />
    <Stack.Screen name={ROUTES.GAP_HISTORY} component={GapHistoryScreenWithFade} />
    <Stack.Screen name={ROUTES.GAP_BALANCES} component={GapBalancesScreenWithFade} />
    <Stack.Screen name={ROUTES.GAP_SETTLEMENT} component={GapSettlementScreenWithFade} />
  </Stack.Navigator>
);

export default GapStack;
