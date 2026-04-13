import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleProp, View, ViewStyle } from 'react-native';

interface FadeInViewProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  delay?: number;
  duration?: number;
  fromY?: number;
}

const FadeInView: React.FC<FadeInViewProps> = ({
  children,
  style,
  delay = 40,
  duration = 360,
  fromY = 18,
}) => {
  const [visible, setVisible] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(fromY)).current;
  const useNativeDriver = Platform.OS !== 'web';

  useEffect(() => {
    if (Platform.OS === 'web') {
      const timer = setTimeout(() => setVisible(true), delay);
      return () => clearTimeout(timer);
    }

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver,
      }),
    ]).start();
    return undefined;
  }, [delay, duration, opacity, translateY, useNativeDriver]);

  if (Platform.OS === 'web') {
    return (
      <View
        style={[
          style,
          {
            opacity: visible ? 1 : 0,
            transform: [{ translateY: visible ? 0 : fromY }],
            transitionDuration: `${duration}ms`,
            transitionProperty: 'opacity, transform',
            transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
          } as unknown as ViewStyle,
        ]}
      >
        {children}
      </View>
    );
  }

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
};

export default FadeInView;
