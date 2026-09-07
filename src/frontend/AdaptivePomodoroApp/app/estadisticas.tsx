import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

import { AtmosphericBackground } from '@/components/atmospheric-background';
import { GlassPanel } from '@/components/glass-panel';
import { GradientText } from '@/components/gradient-text';
import { DesignColors, DesignFonts, DesignSpacing, DesignTypography } from '@/constants/design';
import { PRESENTACION_ANIMO, PRESENTACION_DEFECTO } from '@/constants/moods';
import {
  Estadisticas,
  Resumen,
  TendenciaEstado,
  formatFechaSesion,
  formatMinutos,
  getEstadisticas,
  getResumen,
  getTendencia,
} from '@/lib/pomodoro';
import { ApiError } from '@/lib/api';
import { getUser } from '@/lib/auth-storage';

// Posición decorativa de cada ánimo dentro del mapa: no codifica ningún dato,
// solo reparte visualmente los 4 grupos de puntos para que no se amontonen
// (como en el mockup original, que también era una distribución abstracta).
const ANCLA_POR_ESTADO: Record<number, { top: number; left: number }> = {
  1: { top: 25, left: 25 },
  2: { top: 72, left: 68 },
  3: { top: 15, left: 80 },
  4: { top: 55, left: 40 },
};
const ANCLA_DEFECTO = { top: 50, left: 50 };

// Jitter determinista (mismo resultado en cada render, a diferencia de
// Math.random()) para separar puntos del mismo ánimo sin que "salten" cada
// vez que el componente se vuelve a pintar.
function jitter(indice: number, sal: number) {
  return Math.sin(indice * 12.9898 + sal) * 0.5 + 0.5;
}

export default function EstadisticasScreen() {
  const router = useRouter();
  const [tendencias, setTendencias] = useState<TendenciaEstado[]>([]);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [estadisticas, setEstadisticas] = useState<Estadisticas | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setErrorMessage(null);
    try {
      const user = await getUser();
      if (!user) {
        setErrorMessage('No se encontró la sesión. Vuelve a iniciar sesión.');
        return;
      }
      const [{ tendencias: listaTendencias }, resumenData, estadisticasData] = await Promise.all([
        getTendencia(user.id),
        getResumen(user.id),
        getEstadisticas(user.id),
      ]);
      setTendencias(listaTendencias);
      setResumen(resumenData);
      setEstadisticas(estadisticasData);
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : 'No se pudieron cargar las estadísticas');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  const puntosMapa = tendencias.flatMap((tendencia) => {
    const presentacion = PRESENTACION_ANIMO[tendencia.estadoId] ?? PRESENTACION_DEFECTO;
    const ancla = ANCLA_POR_ESTADO[tendencia.estadoId] ?? ANCLA_DEFECTO;
    return tendencia.puntos.map((_punto, indice) => ({
      key: `${tendencia.estadoId}-${indice}`,
      color: presentacion.color,
      top: Math.min(90, Math.max(6, ancla.top + (jitter(indice, tendencia.estadoId) - 0.5) * 36)),
      left: Math.min(90, Math.max(6, ancla.left + (jitter(indice, tendencia.estadoId * 7) - 0.5) * 36)),
      esUltimo: indice === tendencia.puntos.length - 1,
    }));
  });

  const horasSemana = estadisticas ? Math.round((estadisticas.tiempoEnfoqueSemanaMin / 60) * 10) / 10 : 0;
  const deltaMin = estadisticas
    ? estadisticas.tiempoEnfoqueSemanaMin - estadisticas.tiempoEnfoqueSemanaAnteriorMin
    : 0;
  const deltaHoras = Math.round((deltaMin / 60) * 10) / 10;
  const hayDatosComparacion =
    estadisticas !== null &&
    (estadisticas.tiempoEnfoqueSemanaMin > 0 || estadisticas.tiempoEnfoqueSemanaAnteriorMin > 0);

  const diasGrafica = resumen?.grafica ?? [];
  const maxGrafica = Math.max(1, ...diasGrafica.map((d) => d.trabajo));

  return (
    <View style={styles.root}>
      <AtmosphericBackground />

      <View style={styles.header}>
        <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFillObject} />
        <View style={styles.headerOverlay} />
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={styles.headerButton}>
            <MaterialIcons name="arrow-back" size={20} color={DesignColors.onSurfaceVariant} />
          </Pressable>
          <GradientText style={styles.headerTitle}>Bio-Analytics</GradientText>
          <View style={styles.headerButton} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {loading && (
          <View style={styles.centered}>
            <ActivityIndicator color={DesignColors.primary} />
          </View>
        )}

        {!loading && errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}

        {!loading && !errorMessage && (
          <>
            <GlassPanel style={styles.mapCard}>
              <Text style={styles.mapTitle}>Mapa de Estados Cognitivos</Text>
              <Text style={styles.mapSubtitle}>Distribución de sesiones por estado emocional predominante.</Text>

              <View style={styles.mapBox}>
                {puntosMapa.length === 0 ? (
                  <Text style={styles.emptyText}>
                    Todavía no hay sesiones suficientes para dibujar el mapa. Completa alguna sesión en Focus.
                  </Text>
                ) : (
                  puntosMapa.map((punto) => (
                    <View
                      key={punto.key}
                      style={[
                        styles.mapDot,
                        {
                          top: `${punto.top}%`,
                          left: `${punto.left}%`,
                          backgroundColor: punto.color,
                          width: punto.esUltimo ? 12 : 8,
                          height: punto.esUltimo ? 12 : 8,
                          shadowColor: punto.color,
                        },
                      ]}
                    />
                  ))
                )}
              </View>

              {tendencias.length > 0 && (
                <View style={styles.legend}>
                  {tendencias.map((tendencia) => {
                    const presentacion = PRESENTACION_ANIMO[tendencia.estadoId] ?? PRESENTACION_DEFECTO;
                    return (
                      <View key={tendencia.estadoId} style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: presentacion.color }]} />
                        <Text style={styles.legendText}>{tendencia.estadoAnimo}</Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </GlassPanel>

            <View style={styles.metricsGrid}>
              <GlassPanel style={styles.metricCard}>
                <View style={styles.metricLabelRow}>
                  <MaterialIcons name="psychology" size={16} color={DesignColors.secondary} />
                  <Text style={styles.metricLabel}>ESTA SEMANA</Text>
                </View>
                <Text style={styles.metricCaption}>Concentración Media</Text>
                <Text style={styles.metricValuePrimary}>{estadisticas?.concentracionSemana ?? 0}%</Text>
                {diasGrafica.length > 0 && (
                  <View style={styles.sparklineRow}>
                    {diasGrafica.map((dia, i) => (
                      <View
                        key={dia.fecha}
                        style={[
                          styles.sparklineBar,
                          {
                            height: `${Math.max(10, (dia.trabajo / maxGrafica) * 100)}%`,
                            backgroundColor:
                              i === diasGrafica.length - 1 ? DesignColors.primary : DesignColors.secondary,
                            opacity: 0.35 + (i / Math.max(1, diasGrafica.length - 1)) * 0.65,
                          },
                        ]}
                      />
                    ))}
                  </View>
                )}
              </GlassPanel>

              <GlassPanel style={styles.metricCard}>
                <View style={styles.metricLabelRow}>
                  <MaterialIcons name="timelapse" size={16} color={DesignColors.tertiary} />
                  <Text style={styles.metricLabel}>ESTA SEMANA</Text>
                </View>
                <Text style={styles.metricCaption}>Tiempo Real de Enfoque</Text>
                <Text style={styles.metricValueLarge}>
                  {horasSemana}
                  <Text style={styles.metricUnit}>h</Text>
                </Text>
                {hayDatosComparacion && (
                  <View style={styles.deltaRow}>
                    <MaterialIcons
                      name={deltaHoras >= 0 ? 'arrow-upward' : 'arrow-downward'}
                      size={14}
                      color={deltaHoras >= 0 ? DesignColors.secondary : DesignColors.error}
                    />
                    <Text
                      style={[
                        styles.deltaText,
                        { color: deltaHoras >= 0 ? DesignColors.secondary : DesignColors.error },
                      ]}
                    >
                      {deltaHoras >= 0 ? '+' : ''}
                      {deltaHoras}h vs. semana pasada
                    </Text>
                  </View>
                )}
              </GlassPanel>
            </View>

            <GlassPanel style={styles.sessionsCard}>
              <Text style={styles.sessionsTitle}>Sesiones Recientes</Text>

              {(!resumen || resumen.sesionesRecientes.length === 0) && (
                <Text style={styles.emptyText}>Aún no hay sesiones registradas.</Text>
              )}

              {resumen?.sesionesRecientes.map((sesion, i) => (
                <View key={`${sesion.fecha}-${i}`}>
                  <View style={styles.sessionRow}>
                    <View style={styles.sessionIcon}>
                      <MaterialIcons name="center-focus-strong" size={20} color={DesignColors.primary} />
                    </View>
                    <View style={styles.sessionInfo}>
                      <Text style={styles.sessionTitle}>Trabajo {formatMinutos(sesion.tiempoTrabajo)}</Text>
                      <Text style={styles.sessionSubtitle}>Descanso {formatMinutos(sesion.tiempoDescanso)}</Text>
                    </View>
                    <Text style={styles.sessionDate}>{formatFechaSesion(sesion.fecha)}</Text>
                  </View>
                  {i < resumen.sesionesRecientes.length - 1 && <View style={styles.divider} />}
                </View>
              ))}

              <Pressable style={styles.historyButton} onPress={() => router.push('/home')}>
                <Text style={styles.historyButtonText}>Ver Historial Completo</Text>
              </Pressable>
            </GlassPanel>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: DesignColors.surface },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 64,
    zIndex: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  headerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(19,18,27,0.8)',
  },
  headerRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: DesignSpacing.gutter,
  },
  headerButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: DesignFonts.headlineBold,
    fontSize: 18,
  },
  scrollContent: {
    paddingTop: 88,
    paddingBottom: 48,
    paddingHorizontal: DesignSpacing.containerPadding,
    gap: DesignSpacing.gutter,
  },
  centered: { paddingVertical: 48, alignItems: 'center' },
  errorText: {
    ...DesignTypography.bodyMd,
    color: DesignColors.error,
    textAlign: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    ...DesignTypography.bodyMd,
    fontSize: 13,
    color: DesignColors.onSurfaceVariant,
    opacity: 0.8,
  },
  mapCard: {
    padding: DesignSpacing.containerPadding,
    gap: 8,
  },
  mapTitle: {
    ...DesignTypography.headlineLgMobile,
    fontSize: 20,
    color: DesignColors.secondary,
  },
  mapSubtitle: {
    ...DesignTypography.bodyMd,
    fontSize: 13,
    color: DesignColors.onSurfaceVariant,
    marginBottom: 8,
  },
  mapBox: {
    width: '100%',
    height: 220,
    backgroundColor: 'rgba(14,13,22,0.5)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(199,196,216,0.15)',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  mapDot: {
    position: 'absolute',
    borderRadius: 999,
    shadowOpacity: 0.8,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'center',
    marginTop: 8,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: {
    ...DesignTypography.labelCaps,
    fontSize: 11,
    color: DesignColors.onSurfaceVariant,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: DesignSpacing.gutter,
  },
  metricCard: {
    flex: 1,
    padding: DesignSpacing.gutter,
    gap: 10,
    minHeight: 170,
  },
  metricLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metricLabel: {
    ...DesignTypography.labelCaps,
    fontSize: 10,
    color: DesignColors.onSurfaceVariant,
  },
  metricCaption: {
    ...DesignTypography.bodyMd,
    fontSize: 13,
    color: DesignColors.onSurfaceVariant,
  },
  metricValuePrimary: {
    fontFamily: DesignFonts.headlineBold,
    fontSize: 40,
    color: DesignColors.primary,
  },
  metricValueLarge: {
    fontFamily: DesignFonts.headlineBold,
    fontSize: 40,
    color: DesignColors.onSurface,
  },
  metricUnit: {
    fontFamily: DesignFonts.headline,
    fontSize: 16,
    color: DesignColors.onSurfaceVariant,
  },
  sparklineRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: 28,
    marginTop: 'auto',
  },
  sparklineBar: {
    flex: 1,
    borderRadius: 2,
  },
  deltaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 'auto' },
  deltaText: {
    fontFamily: DesignFonts.label,
    fontSize: 11,
  },
  sessionsCard: {
    padding: DesignSpacing.containerPadding,
    gap: 4,
  },
  sessionsTitle: {
    ...DesignTypography.headlineLgMobile,
    fontSize: 18,
    color: DesignColors.onSurface,
    marginBottom: 12,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  sessionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(195,192,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(195,192,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionInfo: { flex: 1, gap: 2 },
  sessionTitle: {
    fontFamily: DesignFonts.label,
    fontSize: 14,
    color: DesignColors.onSurface,
  },
  sessionSubtitle: {
    ...DesignTypography.bodyMd,
    fontSize: 12,
    color: DesignColors.onSurfaceVariant,
  },
  sessionDate: {
    ...DesignTypography.labelCaps,
    fontSize: 11,
    color: DesignColors.outline,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(199,196,216,0.1)',
  },
  historyButton: {
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(199,196,216,0.2)',
    alignItems: 'center',
  },
  historyButtonText: {
    fontFamily: DesignFonts.label,
    fontSize: 13,
    color: DesignColors.primary,
  },
});
