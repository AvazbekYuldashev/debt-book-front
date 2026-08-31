import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import GapListScreen from '../../features/gap/screens/GapListScreen';
import GapDetailScreen from '../../features/gap/screens/GapDetailScreen';
import GapMemberDetailScreen from '../../features/gap/screens/GapMemberDetailScreen';
import GapCreateScreen from '../../features/gap/screens/GapCreateScreen';
import { ROUTES } from './routes';
import type { GapStackParamList } from './types';
import { withFadeInScreen } from './withFadeInScreen';

const Stack = createNativeStackNavigator<GapStackParamList>();
const GapListScreenWithFade = withFadeInScreen(GapListScreen);
const GapDetailScreenWithFade = withFadeInScreen(GapDetailScreen);
const GapMemberDetailScreenWithFade = withFadeInScreen(GapMemberDetailScreen);
const GapCreateScreenWithFade = withFadeInScreen(GapCreateScreen);

const GapStack: React.FC = () => (
  <Stack.Navigator>
    <Stack.Screen name={ROUTES.GAP_LIST} component={GapListScreenWithFade} options={{ headerShown: false }} />
    <Stack.Screen
      name={ROUTES.GAP_DETAIL}
      component={GapDetailScreenWithFade}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name={ROUTES.GAP_MEMBER}
      component={GapMemberDetailScreenWithFade}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name={ROUTES.GAP_CREATE}
      component={GapCreateScreenWithFade}
      options={{ headerShown: false }}
    />
  </Stack.Navigator>
);

export default GapStack;
