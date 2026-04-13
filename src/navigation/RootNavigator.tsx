import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AuthStack from './AuthStack';
import BottomTabNavigator from './BottomTabNavigator';
import { AuthContext } from '../context/AuthContext';

const RootNavigator: React.FC = () => {
  const { profile } = useContext(AuthContext);
  return profile ? <BottomTabNavigator /> : <AuthStack />;
};

export default RootNavigator;
