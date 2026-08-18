import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { DesignColors } from '@/constants/design';
import { BreathingGlow } from '@/components/breathing-glow';

export function AtmosphericBackground() {
  const { width, height } = useWindowDimensions();
  const size = Math.max(width, height) * 0.9;

  return (
    <View style={styles.container} pointerEvents="none">
      <BreathingGlow
        delay={0}
        color={DesignColors.primary}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          top: -size * 0.35,
          right: -size * 0.35,
          opacity: 0.15,
        }}
      />
      <BreathingGlow
        delay={3000}
        color={DesignColors.secondary}
        style={{
          width: size * 0.7,
          height: size * 0.7,
          borderRadius: (size * 0.7) / 2,
          bottom: -size * 0.2,
          left: -size * 0.2,
          opacity: 0.15,
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
});
