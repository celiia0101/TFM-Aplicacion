import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';

import { GlassPanel } from '@/components/glass-panel';
import { BreathingGlow } from '@/components/breathing-glow';
import { DesignColors, DesignFonts, DesignSpacing, DesignTypography } from '@/constants/design';

const ORB_SIZE = 260;

export function PauseScreen({
  fase,
  repeticionActual,
  repeticiones,
  minutosTranscurridos,
  minutosRestantes,
  onSeguir,
  onAccionRapida,
  accionRapidaLabel,
  accionRapidaIcon,
}: {
  fase: 'trabajo' | 'descanso';
  repeticionActual: number;
  repeticiones: number;
  minutosTranscurridos: number;
  minutosRestantes: number;
  onSeguir: () => void;
  onAccionRapida: () => void;
  accionRapidaLabel: string;
  accionRapidaIcon: keyof typeof MaterialIcons.glyphMap;
}) {
  const esTrabajo = fase === 'trabajo';

  return (
    <View style={styles.container}>
      <View style={styles.progreso}>
        <View style={styles.dots}>
          {Array.from({ length: repeticiones }).map((_, i) => (
            <View key={i} style={[styles.dot, i < repeticionActual && styles.dotActiva]} />
          ))}
        </View>
        <Text style={styles.progresoLabel}>
          Ronda {repeticionActual} de {repeticiones}
        </Text>
      </View>

      <View style={styles.orbWrapper}>
        <BreathingGlow
          color={esTrabajo ? DesignColors.secondary : DesignColors.primary}
          style={styles.orbGlow1}
          opacityRange={[0.25, 0.45]}
          scaleAmount={0.15}
          duration={8000}
        />
        <BreathingGlow
          color={esTrabajo ? DesignColors.primaryContainer : DesignColors.secondaryContainer}
          style={styles.orbGlow2}
          opacityRange={[0.15, 0.3]}
          scaleAmount={0.1}
          duration={8000}
          delay={1500}
        />

        <View style={styles.orbContent}>
          <Text style={styles.headline}>{esTrabajo ? '¿Necesitas un respiro?' : '¿Ya has descansado?'}</Text>

          <GlassPanel style={styles.messagePanel}>
            <Text style={styles.messageText}>
              {esTrabajo
                ? `Llevas ${minutosTranscurridos} min concentrado en esta ronda. Quedan ${minutosRestantes} min de trabajo.`
                : `Llevas ${minutosTranscurridos} min de descanso. Quedan ${minutosRestantes} min.`}
            </Text>
          </GlassPanel>
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable onPress={onSeguir}>
          <LinearGradient
            colors={[DesignColors.primary, DesignColors.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.primaryButton}
          >
            <MaterialIcons name="play-arrow" size={22} color={DesignColors.onPrimary} />
            <Text style={styles.primaryButtonText}>{esTrabajo ? 'Seguir Enfocado' : 'Seguir Descansando'}</Text>
          </LinearGradient>
        </Pressable>

        <Pressable onPress={onAccionRapida}>
          <GlassPanel style={styles.secondaryButton}>
            <MaterialIcons name={accionRapidaIcon} size={20} color={DesignColors.onSurface} />
            <Text style={styles.secondaryButtonText}>{accionRapidaLabel}</Text>
          </GlassPanel>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: 40, paddingTop: 24, paddingBottom: 24 },
  progreso: { alignItems: 'center', gap: 10 },
  dots: { flexDirection: 'row', gap: 6 },
  dot: {
    width: 28,
    height: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(68,226,205,0.25)',
  },
  dotActiva: { backgroundColor: DesignColors.secondary },
  progresoLabel: {
    ...DesignTypography.labelCaps,
    color: DesignColors.onSurfaceVariant,
    textTransform: 'uppercase',
  },
  orbWrapper: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbGlow1: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
  },
  orbGlow2: {
    width: ORB_SIZE * 0.7,
    height: ORB_SIZE * 0.7,
    borderRadius: (ORB_SIZE * 0.7) / 2,
  },
  orbContent: {
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 12,
  },
  headline: {
    ...DesignTypography.headlineLgMobile,
    color: DesignColors.onSurface,
    textAlign: 'center',
  },
  messagePanel: {
    padding: 16,
  },
  messageText: {
    ...DesignTypography.bodyMd,
    fontSize: 14,
    color: DesignColors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 20,
  },
  actions: {
    width: '100%',
    maxWidth: 320,
    gap: DesignSpacing.base * 2,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
    borderRadius: 16,
  },
  primaryButtonText: {
    fontFamily: DesignFonts.label,
    fontSize: 15,
    color: DesignColors.onPrimary,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
  },
  secondaryButtonText: {
    fontFamily: DesignFonts.body,
    fontSize: 15,
    color: DesignColors.onSurface,
  },
});
