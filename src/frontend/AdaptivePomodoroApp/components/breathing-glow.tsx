import { useEffect } from 'react';
import { StyleProp, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';

type BreathingGlowProps = {
  style: StyleProp<ViewStyle>;
  color: string;
  delay?: number;
  duration?: number;
  scaleAmount?: number;
  opacityRange?: [number, number];
};

// El sistema de diseño pide que la interfaz "respire" (ver DESIGN.md: "living
// organism that breathes"). Este componente encapsula esa animación para
// reutilizarla en cualquier resplandor difuso (fondo, anillos, insignias...).
export function BreathingGlow({
  style,
  color,
  delay = 0,
  duration = 5000,
  scaleAmount = 0.1,
  opacityRange = [0.2, 0.4],
}: BreathingGlowProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration, easing: Easing.inOut(Easing.ease) }), -1, true)
    );
  }, [delay, duration, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + progress.value * scaleAmount }],
    opacity: opacityRange[0] + progress.value * (opacityRange[1] - opacityRange[0]),
  }));

  return <Animated.View style={[styles.glow, { backgroundColor: color }, style, animatedStyle]} />;
}

const styles = StyleSheet.create({
  glow: {
    position: 'absolute',
    borderRadius: 999,
  },
});
