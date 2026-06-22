import React from 'react';
import { Image, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../theme';

interface UserAvatarProps {
  uri?: string;
  size: number;
}

// Yagona avatar: rasm bo'lsa rasmni, bo'lmasa default (odam silueti) ko'rsatadi.
const UserAvatar: React.FC<UserAvatarProps> = ({ uri, size }) => {
  const { colors } = useAppTheme();
  const radius = size / 2;

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: radius, backgroundColor: colors.surfaceMuted }}
      />
    );
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor: colors.surfaceMuted,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name="person" size={Math.round(size * 0.56)} color={colors.textSecondary} />
    </View>
  );
};

export default UserAvatar;
