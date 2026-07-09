import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getInitials, pickAvatarColor } from './avatar';

interface InitialsAvatarProps {
  name: string;
  size: number;
}

/** Rasm bo'lmaganda: ismdan deterministik rangli bosh-harf doiracha. */
const InitialsAvatar: React.FC<InitialsAvatarProps> = ({ name, size }) => {
  const { bg, fg } = pickAvatarColor(name);
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
