import React, { useContext, useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import NotificationWatcher from '../components/NotificationWatcher';
import { AuthContext } from '../context/AuthContext';
import { WorkspaceContext } from '../context/WorkspaceContext';
import { getMyProfile } from '../api/profile';
import { buildAttachUrl } from '../shared/attachUrl';
import AuthStack from './AuthStack';
import BottomTabNavigator from './BottomTabNavigator';
import ConsentGate from '../components/legal/ConsentGate';

const CenteredLoader: React.FC = () => (
  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
    <ActivityIndicator />
  </View>
);

const RootNavigator: React.FC = () => {
  const { profile, isAuthReady, setProfile } = useContext(AuthContext);
  const { isWorkspaceReady } = useContext(WorkspaceContext);

  useEffect(() => {
    if (!profile?.jwt) return;
    getMyProfile(profile.jwt)
      .then((fresh) => {
        const f = fresh as Record<string, unknown>;
        const nested = f.photo as Record<string, unknown> | undefined;
        const photoId =
          (nested?.id as string | undefined) ||
          (f.photoId as string | undefined);
        const rawUrl = nested?.url as string | undefined;
        const photoUrl = buildAttachUrl(photoId) || rawUrl;
        if (!photoId && !photoUrl) return;
        setProfile((prev) =>
          prev ? { ...prev, photo: { id: photoId, url: photoUrl } } : prev
        );
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.jwt]);

  if (!isAuthReady || !isWorkspaceReady) {
    return <CenteredLoader />;
  }
  if (!profile) {
    return <AuthStack />;
  }
  return (
    <>
      <NotificationWatcher />
      <BottomTabNavigator />
      <ConsentGate />
    </>
  );
};

export default RootNavigator;
