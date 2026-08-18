import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, Easing } from 'react-native-reanimated';

import { AtmosphericBackground } from '@/components/atmospheric-background';
import { BreathingGlow } from '@/components/breathing-glow';
import { TopAppBar } from '@/components/top-app-bar';
import { GlassPanel } from '@/components/glass-panel';
import { FocusWaveChart } from '@/components/focus-wave-chart';
import { DesignColors, DesignFonts, DesignRadius, DesignSpacing, DesignTypography } from '@/constants/design';
import { getUser } from '@/lib/auth-storage';
import { formatFechaSesion, formatMinutos, getResumen, Resumen } from '@/lib/pomodoro';
import { ApiError } from '@/lib/api';

export default function HomeScreen() {
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const float = useSharedValue(0);
  useEffect(() => {
    float.value = withRepeat(withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [float]);
  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -float.value * 6 }],
  }));

  const cargarResumen = useCallback(async () => {
    setErrorMessage(null);
    try {
      const user = await getUser();
      if (!user) {
        setErrorMessage('No se encontró la sesión. Vuelve a iniciar sesión.');
        return;
      }
      const data = await getResumen(user.id);
      setResumen(data);
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : 'No se pudo cargar el resumen');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarResumen();
  }, [cargarResumen]);

  // Recarga al volver a esta pestaña, por si se acaba de registrar una sesión en Focus.
  useFocusEffect(
    useCallback(() => {
      cargarResumen();
    }, [cargarResumen])
  );

  return (
    <View style={styles.root}>
      <AtmosphericBackground />
      <TopAppBar title="PomodoroIA" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.headline}>Tu Ritmo Hoy</Text>

        {loading && (
          <View style={styles.centered}>
            <ActivityIndicator color={DesignColors.primary} />
          </View>
        )}

        {!loading && errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}

        {!loading && resumen && (
          <>
            <View style={styles.ringSection}>
              <BreathingGlow color={DesignColors.primary} style={styles.glowPrimary} duration={5000} />
              <BreathingGlow color={DesignColors.secondary} style={styles.glowSecondary} duration={5000} delay={1000} />

              <View style={styles.ring}>
                <Text style={styles.ringLabel}>TIEMPO INVERTIDO</Text>
                <Text style={styles.ringValue}>{formatMinutos(resumen.tiempoInvertidoHoy)}</Text>
              </View>

              <Animated.View style={[styles.flowBadge, floatStyle]}>
                <Text style={styles.flowLabel}>CONCENTRACIÓN</Text>
                <Text style={styles.flowValue}>{resumen.concentracion}%</Text>
              </Animated.View>
            </View>

            <GlassPanel style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <View>
                  <Text style={styles.cardTitle}>Sinfonía de Enfoque</Text>
                  <Text style={styles.cardSubtitle}>Últimos 7 días</Text>
                </View>
              </View>
              <FocusWaveChart
                data={resumen.grafica.map((d) => d.trabajo)}
                labels={resumen.grafica.map((d) => d.dia)}
              />
            </GlassPanel>

            <GlassPanel style={styles.insightCard}>
              <View style={styles.insightRow}>
                <View style={styles.insightIcon}>
                  <MaterialIcons name="lightbulb" size={20} color={DesignColors.secondary} />
                </View>
                <View style={styles.insightTextWrap}>
                  <Text style={styles.insightLabel}>INSIGHT</Text>
                  <Text style={styles.insightText}>{resumen.insight}</Text>
                </View>
              </View>
              <MaterialIcons
                name="psychology"
                size={130}
                color={DesignColors.onSurface}
                style={styles.insightWatermark}
              />
            </GlassPanel>

            <View style={styles.sessionsSection}>
              <Text style={styles.sessionsTitle}>Sesiones Recientes</Text>
              {resumen.sesionesRecientes.length === 0 && (
                <Text style={styles.emptyText}>Aún no hay sesiones registradas.</Text>
              )}
              {resumen.sesionesRecientes.map((sesion) => (
                <GlassPanel key={sesion.fecha} style={styles.sessionRow} radius={DesignRadius.lg}>
                  <Text style={styles.sessionName}>{formatFechaSesion(sesion.fecha)}</Text>
                  <Text style={styles.sessionDuration}>{formatMinutos(sesion.tiempoTrabajo)}</Text>
                </GlassPanel>
              ))}
            </View>

            <LinearGradient
              colors={[DesignColors.primaryContainer, DesignColors.secondaryContainer]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.imageBlock}
            >
              <Text style={styles.imageBlockTitle}>Tu ritmo es único.</Text>
              <Text style={styles.imageBlockSubtitle}>PomodoroIA se adapta a ti en tiempo real.</Text>
            </LinearGradient>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: DesignColors.surface },
  scrollContent: {
    paddingTop: 88,
    paddingBottom: 120,
    paddingHorizontal: DesignSpacing.containerPadding,
    gap: DesignSpacing.gutter,
  },
  headline: {
    ...DesignTypography.headlineLgMobile,
    color: DesignColors.onSurface,
  },
  centered: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  errorText: {
    ...DesignTypography.bodyMd,
    color: DesignColors.error,
    textAlign: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    ...DesignTypography.bodyMd,
    color: DesignColors.onSurfaceVariant,
  },
  ringSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  glowPrimary: {
    width: 220,
    height: 220,
  },
  glowSecondary: {
    width: 170,
    height: 170,
    top: 20,
  },
  ring: {
    width: 210,
    height: 210,
    borderRadius: 105,
    borderWidth: 2,
    borderColor: 'rgba(195, 192, 255, 0.2)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
  },
  ringLabel: {
    ...DesignTypography.labelCaps,
    fontSize: 10,
    color: 'rgba(195, 192, 255, 0.8)',
    textAlign: 'center',
  },
  ringValue: {
    fontFamily: DesignFonts.headlineBold,
    fontSize: 34,
    color: DesignColors.primary,
  },
  flowBadge: {
    position: 'absolute',
    top: 4,
    right: -4,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(68, 226, 205, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(68, 226, 205, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 6,
  },
  flowLabel: {
    fontFamily: DesignFonts.label,
    fontSize: 7,
    letterSpacing: 0.5,
    color: DesignColors.secondary,
    textAlign: 'center',
  },
  flowValue: {
    fontFamily: DesignFonts.headline,
    fontSize: 17,
    color: DesignColors.secondary,
  },
  card: {
    padding: DesignSpacing.containerPadding,
    gap: DesignSpacing.gutter,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  cardTitle: {
    ...DesignTypography.headlineLgMobile,
    fontSize: 18,
    color: DesignColors.onSurface,
  },
  cardSubtitle: {
    ...DesignTypography.bodyMd,
    fontSize: 14,
    color: DesignColors.onSurfaceVariant,
  },
  insightCard: {
    padding: DesignSpacing.containerPadding,
    borderLeftWidth: 3,
    borderLeftColor: DesignColors.secondary,
    overflow: 'hidden',
  },
  insightRow: {
    flexDirection: 'row',
    gap: DesignSpacing.gutter,
    alignItems: 'flex-start',
  },
  insightIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(68, 226, 205, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightTextWrap: {
    flex: 1,
    gap: 4,
  },
  insightLabel: {
    ...DesignTypography.labelCaps,
    color: DesignColors.secondary,
  },
  insightText: {
    ...DesignTypography.bodyMd,
    color: DesignColors.onSurface,
  },
  insightWatermark: {
    position: 'absolute',
    right: -24,
    bottom: -24,
    opacity: 0.08,
  },
  sessionsSection: {
    gap: DesignSpacing.base,
  },
  sessionsTitle: {
    ...DesignTypography.labelCaps,
    color: DesignColors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  sessionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  sessionName: {
    ...DesignTypography.bodyMd,
    color: DesignColors.onSurface,
    fontFamily: DesignFonts.label,
    fontSize: 15,
  },
  sessionDuration: {
    ...DesignTypography.labelCaps,
    color: DesignColors.secondary,
  },
  imageBlock: {
    height: 160,
    borderRadius: DesignRadius.xl,
    padding: DesignSpacing.containerPadding,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  imageBlockTitle: {
    ...DesignTypography.headlineLgMobile,
    fontSize: 20,
    color: '#ffffff',
  },
  imageBlockSubtitle: {
    ...DesignTypography.bodyMd,
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
  },
});
