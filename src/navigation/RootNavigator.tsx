import React, { useContext } from 'react';
import { ActivityIndicator, View } from 'react-native';
import AuthStack from './AuthStack';
import BottomTabNavigator from './BottomTabNavigator';
import { AuthContext } from '../context/AuthContext';

const RootNavigator: React.FC = () => {
  const { profile, isAuthReady } = useContext(AuthContext);
  if (!isAuthReady) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }
  return profile ? <BottomTabNavigator /> : <AuthStack />;
};

export default RootNavigator;
