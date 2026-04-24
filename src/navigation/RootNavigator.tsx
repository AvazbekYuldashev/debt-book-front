import React, { useContext } from 'react';
import { ActivityIndicator, View } from 'react-native';
import AuthStack from './AuthStack';
import BottomTabNavigator from './BottomTabNavigator';
import { AuthContext } from '../context/AuthContext';
import { WorkspaceContext } from '../context/WorkspaceContext';

const RootNavigator: React.FC = () => {
  const { profile, isAuthReady } = useContext(AuthContext);
  const { isWorkspaceReady } = useContext(WorkspaceContext);
  if (!isAuthReady || !isWorkspaceReady) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }
  return profile ? <BottomTabNavigator /> : <AuthStack />;
};

export default RootNavigator;
