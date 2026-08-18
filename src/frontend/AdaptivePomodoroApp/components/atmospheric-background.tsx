import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { DesignColors } from '@/constants/design';

function Aura({ delay, style, color }: { delay: number; style: object; color: string }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration: 5000, easing: Easing.inOut(Easing.ease) }), -1, true)
    );
  }, [delay, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + progress.value * 0.1 }],
    opacity: 0.2 + progress.value * 0.2,
  }));

  return <Animated.View style={[styles.aura, { backgroundColor: color }, style, animatedStyle]} />;
}

export function AtmosphericBackground() {
  const { width, height } = useWindowDimensions();
  const size = Math.max(width, height) * 0.9;

  return (
    <View style={styles.container} pointerEvents="none">
      <Aura
        delay={0}
        color={DesignColors.primary}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          top: -size * 0.35,
          right: -size * 0.35,
        }}
      />
      <Aura
        delay={3000}
        color={DesignColors.secondary}
        style={{
          width: size * 0.7,
          height: size * 0.7,
          borderRadius: (size * 0.7) / 2,
          bottom: -size * 0.2,
          left: -size * 0.2,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    backgroundColor: DesignColors.surface,
  },
  aura: {
    position: 'absolute',
    opacity: 0.15,
  },
});
