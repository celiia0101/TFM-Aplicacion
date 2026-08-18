import { StyleSheet, View, ViewProps } from 'react-native';
import { BlurView } from 'expo-blur';
import { DesignRadius } from '@/constants/design';

type GlassPanelProps = ViewProps & {
  radius?: number;
};

export function GlassPanel({ style, children, radius = DesignRadius.xl, ...rest }: GlassPanelProps) {
  return (
    <View style={[styles.wrapper, { borderRadius: radius }, style]} {...rest}>
      <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFillObject} />
      <View style={styles.overlay} />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(31, 31, 40, 0.4)',
  },
  content: {
    padding: 0,
  },
});
