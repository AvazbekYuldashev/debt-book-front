import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getInitials, pickAvatarColor } from './avatar';
import { useAppTheme } from '../theme';

interface InitialsAvatarProps {
  name: string;
  size: number;
}

/** Rasm bo'lmaganda: ismdan deterministik rangli bosh-harf doiracha. */
const InitialsAvatar: React.FC<InitialsAvatarProps> = ({ name, size }) => {
  const { colors } = useAppTheme();
  const { bg, fg } = pickAvatarColor(name, colors);
  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bg },
      ]}
      accessibilityLabel={name}
    >
      <Text style={[styles.text, { color: fg, fontSize: Math.round(size * 0.36) }]}>
        {getInitials(name)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '700',
    letterSpacing: -0.5,
  },
});

export default memo(InitialsAvatar);
