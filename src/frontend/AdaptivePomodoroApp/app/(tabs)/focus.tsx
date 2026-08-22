import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';

import { AtmosphericBackground } from '@/components/atmospheric-background';
import { TopAppBar } from '@/components/top-app-bar';
import { GlassPanel } from '@/components/glass-panel';
import { BreathingGlow } from '@/components/breathing-glow';
import { FocusTimer, MotivoSalida } from '@/components/focus-timer';
import { DesignColors, DesignFonts, DesignRadius, DesignSpacing, DesignTypography } from '@/constants/design';
import { EstadoAnimo, getEstadosAnimo, getDuracion, getResumen } from '@/lib/pomodoro';
import { ApiError } from '@/lib/api';
import { getUser } from '@/lib/auth-storage';
import { PRESENTACION_ANIMO, PRESENTACION_DEFECTO } from '@/constants/moods';

const REPETICIONES_MIN = 1;
const REPETICIONES_MAX = 8;

type Sesion = {
  estadoId: number;
  estadoAnimo: string;
  tiempoTrabajo: number;
  tiempoDescanso: number;
  repeticiones: number;
};

export default function FocusScreen() {
  const router = useRouter();
  const [userId, setUserId] = useState<number | null>(null);
  const [estados, setEstados] = useState<EstadoAnimo[]>([]);
  const [seleccionado, setSeleccionado] = useState<number | null>(null);
  const [sesionesHoy, setSesionesHoy] = useState(0);
  const [loading, setLoading] = useState(true);
  const [preparandoSesion, setPreparandoSesion] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sesionActiva, setSesionActiva] = useState<Sesion | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [repeticiones, setRepeticiones] = useState(4);
  const [avisoSalida, setAvisoSalida] = useState<string | null>(null);

  const cargarDatos = useCallback(async () => {
    setErrorMessage(null);
    try {
      const user = await getUser();
      if (!user) {
        setErrorMessage('No se encontró la sesión. Vuelve a iniciar sesión.');
        return;
      }
      setUserId(user.id);

      const [{ estados: lista }, resumen] = await Promise.all([getEstadosAnimo(), getResumen(user.id)]);
      setEstados(lista);
      setSesionesHoy(resumen.sesionesHoy);
      setSeleccionado((actual) => actual ?? (lista.length > 0 ? lista[0].id : null));
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : 'No se pudieron cargar los datos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const handleConfirmarRepeticiones = async () => {
    if (!userId || seleccionado === null) return;
    const estado = estados.find((e) => e.id === seleccionado);
    if (!estado) return;

    setPreparandoSesion(true);
    setErrorMessage(null);
    try {
      const duracion = await getDuracion(userId, seleccionado);
      setModalVisible(false);
      setSesionActiva({
        estadoId: estado.id,
        estadoAnimo: estado.estadoAnimo,
        tiempoTrabajo: duracion.tiempoTrabajo,
        tiempoDescanso: duracion.tiempoDescanso,
        repeticiones,
      });
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : 'No se pudo preparar la sesión');
    } finally {
      setPreparandoSesion(false);
    }
  };

  if (sesionActiva && userId) {
    return (
      <View style={styles.root}>
        <AtmosphericBackground />
        <TopAppBar title="PomodoroIA" />
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <FocusTimer
            userId={userId}
            estadoId={sesionActiva.estadoId}
            estadoAnimo={sesionActiva.estadoAnimo}
            tiempoTrabajoMin={sesionActiva.tiempoTrabajo}
            tiempoDescansoMin={sesionActiva.tiempoDescanso}
            repeticiones={sesionActiva.repeticiones}
            sesionesHoy={sesionesHoy}
            onSesionRegistrada={() => setSesionesHoy((n) => n + 1)}
            onVerEstadisticas={() => {
              setSesionActiva(null);
              router.push('/home');
            }}
            onSalir={(motivo: MotivoSalida) => {
              setSesionActiva(null);
              setAvisoSalida(
                motivo === 'interrumpida'
                  ? 'Sesión interrumpida: saliste de la app durante el trabajo, así que solo se guardó el tiempo real hasta ese momento.'
                  : motivo === 'pausada'
                    ? 'Finalizaste la sesión desde la pausa: se guardó tu tiempo real de concentración.'
                    : null
              );
              cargarDatos();
            }}
          />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <AtmosphericBackground />
      <TopAppBar title="PomodoroIA" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.headline}>Hola, ¿cómo nos sentimos hoy?</Text>
          <Text style={styles.subheadline}>Ajustaremos tu ritmo según tu energía actual.</Text>
        </View>

        {loading && (
          <View style={styles.centered}>
            <ActivityIndicator color={DesignColors.primary} />
          </View>
        )}

        {!loading && errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}

        {!loading && !errorMessage && avisoSalida && (
          <GlassPanel style={styles.avisoCard}>
            <MaterialIcons name="info-outline" size={18} color={DesignColors.tertiary} />
            <Text style={styles.avisoText}>{avisoSalida}</Text>
          </GlassPanel>
        )}

        {!loading && estados.length > 0 && (
          <>
            <View style={styles.grid}>
              {estados.map((estado) => {
                const presentacion = PRESENTACION_ANIMO[estado.id] ?? PRESENTACION_DEFECTO;
                const activo = seleccionado === estado.id;
                return (
                  <Pressable key={estado.id} style={styles.cardWrapper} onPress={() => setSeleccionado(estado.id)}>
                    <GlassPanel
                      style={[styles.card, activo && { borderColor: presentacion.color, borderWidth: 1.5 }]}
                    >
                      <BreathingGlow
                        color={presentacion.color}
                        style={styles.orb}
                        opacityRange={activo ? [0.5, 0.8] : [0.25, 0.4]}
                        scaleAmount={activo ? 0.2 : 0.1}
                      />
                      <MaterialIcons
                        name={presentacion.icon}
                        size={28}
                        color={DesignColors.onSurfaceVariant}
                        style={styles.cardIcon}
                      />
                      <Text style={styles.cardLabel}>{estado.estadoAnimo}</Text>
                      <Text style={styles.cardSubtitle}>{presentacion.subtitulo}</Text>
                    </GlassPanel>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.footer}>
              <Pressable
                disabled={seleccionado === null}
                onPress={() => {
                  setAvisoSalida(null);
                  setModalVisible(true);
                }}
              >
                <LinearGradient
                  colors={[DesignColors.primary, DesignColors.secondary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.ctaButton}
                >
                  <Text style={styles.ctaButtonText}>Empezar Sesión</Text>
                </LinearGradient>
              </Pressable>
              <Text style={styles.footerCaption}>POMODOROIA ADAPTIVE ENGINE</Text>
            </View>
          </>
        )}
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setModalVisible(false)}>
          <Pressable onPress={(e) => e.stopPropagation()}>
            <GlassPanel style={styles.modalCard} radius={DesignRadius.xl}>
              <Text style={styles.modalTitle}>¿Cuántas rondas quieres hacer?</Text>
              <Text style={styles.modalSubtitle}>Cada ronda es un bloque de trabajo + un descanso.</Text>

              <View style={styles.stepper}>
                <Pressable
                  style={styles.stepperButton}
                  disabled={repeticiones <= REPETICIONES_MIN}
                  onPress={() => setRepeticiones((r) => Math.max(REPETICIONES_MIN, r - 1))}
                >
                  <MaterialIcons name="remove" size={22} color={DesignColors.onSurface} />
                </Pressable>
                <Text style={styles.stepperValue}>{repeticiones}</Text>
                <Pressable
                  style={styles.stepperButton}
                  disabled={repeticiones >= REPETICIONES_MAX}
                  onPress={() => setRepeticiones((r) => Math.min(REPETICIONES_MAX, r + 1))}
                >
                  <MaterialIcons name="add" size={22} color={DesignColors.onSurface} />
                </Pressable>
              </View>

              <Pressable onPress={handleConfirmarRepeticiones} disabled={preparandoSesion}>
                <LinearGradient
                  colors={[DesignColors.primary, DesignColors.secondary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.modalCta}
                >
                  {preparandoSesion ? (
                    <ActivityIndicator color={DesignColors.onPrimary} />
                  ) : (
                    <Text style={styles.ctaButtonText}>Empezar</Text>
                  )}
                </LinearGradient>
              </Pressable>
            </GlassPanel>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: DesignColors.surface },
  scrollContent: {
    paddingTop: 100,
    paddingBottom: 120,
    paddingHorizontal: DesignSpacing.containerPadding,
    gap: 48,
  },
  centered: { paddingVertical: 40, alignItems: 'center' },
  errorText: { ...DesignTypography.bodyMd, color: DesignColors.error, textAlign: 'center' },
  avisoCard: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    alignItems: 'flex-start',
    borderColor: 'rgba(255,182,149,0.3)',
    borderWidth: 1,
  },
  avisoText: {
    ...DesignTypography.bodyMd,
    fontSize: 13,
    color: DesignColors.onSurface,
    flex: 1,
  },
  hero: { alignItems: 'center', gap: 8 },
  headline: {
    ...DesignTypography.headlineLgMobile,
    color: DesignColors.onSurface,
    textAlign: 'center',
  },
  subheadline: {
    ...DesignTypography.bodyMd,
    color: DesignColors.onSurfaceVariant,
    opacity: 0.7,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: DesignSpacing.cardGap,
    justifyContent: 'space-between',
  },
  cardWrapper: {
    // 46% y no 47%: con gap + justifyContent:'space-between', 47%+47%+gap
    // supera el 100% del contenedor por una fracción de píxel y hace que
    // cada tarjeta salte a su propia fila en vez de quedar 2 por fila.
    width: '46%',
  },
  card: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 12,
    overflow: 'hidden',
  },
  orb: {
    position: 'absolute',
    width: 64,
    height: 64,
    top: '50%',
    left: '50%',
    marginTop: -32,
    marginLeft: -32,
  },
  cardIcon: { zIndex: 1 },
  cardLabel: {
    ...DesignTypography.labelCaps,
    color: DesignColors.onSurface,
    textTransform: 'uppercase',
    zIndex: 1,
  },
  cardSubtitle: {
    fontFamily: DesignFonts.body,
    fontSize: 13,
    color: DesignColors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 16,
    zIndex: 1,
  },
  footer: { alignItems: 'center', gap: 20 },
  ctaButton: {
    paddingVertical: 18,
    paddingHorizontal: 64,
    borderRadius: 999,
    alignItems: 'center',
    minWidth: 220,
  },
  ctaButtonText: {
    fontFamily: DesignFonts.label,
    fontSize: 14,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: DesignColors.onPrimary,
  },
  footerCaption: {
    fontFamily: DesignFonts.label,
    fontSize: 10,
    letterSpacing: 1,
    color: 'rgba(199,196,216,0.5)',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(14,13,22,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: DesignSpacing.containerPadding,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    padding: DesignSpacing.containerPadding,
    alignItems: 'center',
    gap: 20,
  },
  modalTitle: {
    ...DesignTypography.headlineLgMobile,
    fontSize: 20,
    color: DesignColors.onSurface,
    textAlign: 'center',
  },
  modalSubtitle: {
    ...DesignTypography.bodyMd,
    fontSize: 14,
    color: DesignColors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: -12,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  stepperButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  stepperValue: {
    fontFamily: DesignFonts.headlineBold,
    fontSize: 36,
    minWidth: 48,
    textAlign: 'center',
    color: DesignColors.onSurface,
  },
  modalCta: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: 'center',
  },
});
