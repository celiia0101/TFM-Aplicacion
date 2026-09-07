import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { DesignColors } from '@/constants/design';
import { BreathingGlow } from '@/components/breathing-glow';

export function AtmosphericBackground() {
  const { width, height } = useWindowDimensions();
  // Pensado para pantallas de móvil en vertical, donde ancho y alto son
  // parecidos. En una ventana de escritorio ancha y baja (mismo build web,
  // ventana grande) "ancho" puede ser mucho mayor que "alto", y el halo
  // salía gigante y tapaba el contenido. El tope evita eso sin cambiar cómo
  // se ve en móvil (ahí nunca se llega a este límite).
  const size = Math.min(Math.max(width, height) * 0.9, 900);

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
