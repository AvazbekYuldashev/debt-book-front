import React from 'react';
import { Image, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../theme';
import { pickAvatarColor } from './avatar';

interface UserAvatarProps {
  uri?: string;
  size: number;
  /**
   * Rasm bo'lmaganda doiracha rangini aniqlaydigan urug'. Berilsa — ismdan
   * DETERMINISTIK pastel rang tanlanadi (bir xil ism doim bir xil rangda),
   * berilmasa neytral kulrang qoladi.
   */
  name?: string;
}

/**
 * Yagona avatar: rasm bo'lsa rasmni, bo'lmasa odam siluetini ko'rsatadi.
 *
 * Rasm yo'q holat ATAYIN rangli: ro'yxatda o'nlab kontakt bir xil kulrang
 * doiracha bo'lib turganda ko'z ularni ajrata olmaydi. Pastel fon + to'qroq
 * ikonka rangi qatorlarni "skanerlash"ni osonlashtiradi va ro'yxatga jonlilik
 * beradi — bosh harflardan farqli o'laroq, siluet har qanday alifboda ishlaydi.
 */
const UserAvatar: React.FC<UserAvatarProps> = ({ uri, size, name }) => {
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

  const palette = name ? pickAvatarColor(name) : undefined;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor: palette?.bg ?? colors.surfaceMuted,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons
        name="person"
        size={Math.round(size * 0.52)}
        color={palette?.fg ?? colors.textSecondary}
      />
    </View>
  );
};

export default UserAvatar;
