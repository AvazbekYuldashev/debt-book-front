import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, DimensionValue, Easing, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useAppTheme } from '../theme';

interface SkeletonShimmerProps {
  height?: number;
  width?: DimensionValue;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

const SkeletonShimmer: React.FC<SkeletonShimmerProps> = ({
  height = 16,
  width = '100%',
  borderRadius = 10,
  style,
}) => {
  const { colors } = useAppTheme();
  const progress = useRef(new Animated.Value(0)).current;
  const [layoutWidth, setLayoutWidth] = useState(0);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: 1150,
        easing: Easing.linear,
        useNativeDriver: false,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [progress]);

  const shimmerTranslate = useMemo(() => {
    const travel = Math.max(layoutWidth, 160);
    return progress.interpolate({
      inputRange: [0, 1],
      outputRange: [-travel, travel],
    });
  }, [layoutWidth, progress]);

  return (
    <View
      onLayout={(event) => {
        const measured = event.nativeEvent.layout.width;
        if (measured > 0 && measured !== layoutWidth) setLayoutWidth(measured);
      }}
      style={[
        styles.base,
        { height, width, borderRadius, backgroundColor: colors.gray100 },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.shimmerBar,
          { transform: [{ translateX: shimmerTranslate }] },
        ]}
      />
    </View>
  );
};

export const SkeletonCardList: React.FC<{ count?: number; containerStyle?: StyleProp<ViewStyle> }> = ({
  count = 4,
  containerStyle,
}) => {
  const { spacing, colors } = useAppTheme();

  return (
    <View style={containerStyle}>
      {Array.from({ length: count }, (_, index) => (
        <View
          key={`skeleton-card-${index}`}
          style={[styles.card, { marginBottom: spacing.sm, backgroundColor: colors.surface }]}
        >
          <SkeletonShimmer height={18} width="62%" borderRadius={8} />
          <SkeletonShimmer height={14} width="38%" borderRadius={8} style={{ marginTop: spacing.xs }} />
        </View>
      ))}
    </View>
  );
};

/**
 * Kontaktlar ro'yxati uchun skelet. O'lchamlari HAQIQIY qator bilan bir xil
 * (avatar 48, paddingVertical 12 => 72px) — ma'lumot kelganda "layout shift"
 * bo'lmaydi, ro'yxat sakramaydi.
 */
export const SkeletonContactList: React.FC<{ count?: number }> = ({ count = 6 }) => {
  const { spacing, colors } = useAppTheme();

  return (
    <View>
      {Array.from({ length: count }, (_, index) => (
        <View key={`skeleton-row-${index}`}>
          <View style={styles.row}>
            <SkeletonShimmer height={48} width={48} borderRadius={24} />
            <View style={styles.rowInfo}>
              <SkeletonShimmer height={15} width={`${58 + ((index * 11) % 26)}%`} borderRadius={7} />
              <SkeletonShimmer
                height={12}
                width={`${38 + ((index * 7) % 18)}%`}
                borderRadius={6}
                style={{ marginTop: spacing.xs }}
              />
            </View>
            <SkeletonShimmer height={26} width={84} borderRadius={13} />
          </View>
          {index < count - 1 ? (
            <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
          ) : null}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rowInfo: {
    flex: 1,
    minWidth: 0,
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 76,
  },
  shimmerBar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '35%',
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  card: {
    padding: 14,
    borderRadius: 14,
  },
});

export default SkeletonShimmer;
