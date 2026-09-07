import { useEffect, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';

import { DesignColors, DesignFonts, DesignSpacing, DesignTypography } from '@/constants/design';
import { CentroideInfo, logSesion, MotivoSalida } from '@/lib/pomodoro';
import { useAlarmSound } from '@/hooks/use-alarm-sound';
import { programarAlarmaFase, cancelarAlarma } from '@/lib/phase-alarm';
import { PauseScreen } from '@/components/pause-screen';
import { SessionSummary } from '@/components/session-summary';

export type { MotivoSalida };

type ResumenPendiente = {
  trabajo: number;
  descanso: number;
  motivo: MotivoSalida;
  totalTrabajo: number;
  totalDescanso: number;
};

const RING_SIZE = 260;
const STROKE_WIDTH = 4;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const META_SESIONES_DIARIA = 4;

type Fase = 'trabajo' | 'descanso';

function formatMMSS(totalSegundos: number): string {
  const mins = Math.floor(totalSegundos / 60);
  const secs = totalSegundos % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function FocusTimer({
  userId,
  estadoId,
  estadoAnimo,
  tiempoTrabajoMin,
  tiempoDescansoMin,
  repeticiones,
  sesionesHoy,
  onSesionRegistrada,
  onSalir,
  onVerEstadisticas,
}: {
  userId: number;
  estadoId: number;
  estadoAnimo: string;
  tiempoTrabajoMin: number;
  tiempoDescansoMin: number;
  repeticiones: number;
  sesionesHoy: number;
  onSesionRegistrada: () => void;
  onSalir: (motivo: MotivoSalida) => void;
  onVerEstadisticas: () => void;
}) {
  const duracionFaseSec = useRef({ trabajo: tiempoTrabajoMin * 60, descanso: tiempoDescansoMin * 60 }).current;

  const [repeticionActual, setRepeticionActual] = useState(1);
  const [fase, setFase] = useState<Fase>('trabajo');
  const [segundosRestantes, setSegundosRestantes] = useState(duracionFaseSec.trabajo);
  const [pausado, setPausado] = useState(false);
  const [resumenPendiente, setResumenPendiente] = useState<ResumenPendiente | null>(null);
  const elapsedRef = useRef({ trabajo: 0, descanso: 0 });
  // Reflejamos el estado en refs para poder leer su valor "de verdad" de
  // forma síncrona dentro del listener de AppState (que se suscribe una
  // sola vez), sin depender de closures que quedarían desactualizadas.
  const faseRef = useRef(fase);
  const segundosRestantesRef = useRef(segundosRestantes);
  const repeticionActualRef = useRef(repeticionActual);
  faseRef.current = fase;
  segundosRestantesRef.current = segundosRestantes;
  repeticionActualRef.current = repeticionActual;

  // Evita registrar la ronda dos veces si el AppState y el intervalo del
  // contador se disparan casi a la vez.
  const salidaEnCursoRef = useRef(false);
  // Evita que dos transiciones de fase se solapen (p.ej. pulsar "Saltar" muy
  // rápido dos veces, o pulsarlo mientras la ronda anterior todavía se está
  // guardando de forma asíncrona) — eso hacía que se saltaran rondas de más
  // y dejaba la sesión en un estado inconsistente. Es un ref (no estado)
  // porque se lee dentro de closures que no siempre están actualizadas
  // (el intervalo, el listener de AppState); el estado de abajo es solo
  // para deshabilitar los botones visualmente.
  const transicionEnCursoRef = useRef(false);
  const [botonesDeshabilitados, setBotonesDeshabilitados] = useState(false);
  // Mientras está en segundo plano, el intervalo normal deja de sumar
  // tiempo: al volver reconciliamos con el reloj de pared (ver más abajo).
  const enSegundoPlanoRef = useRef(false);
  const backgroundedAtRef = useRef<number | null>(null);
  const notifIdRef = useRef<string | null>(null);
  const reproducirAlarma = useAlarmSound();
  // Acumula trabajo/descanso de TODAS las rondas de esta sesión (no se
  // resetea entre rondas, a diferencia de elapsedRef). Sirve para que el
  // resumen final muestre el tiempo y la concentración de la sesión
  // completa, no solo de la última ronda que la cerró.
  const totalSesionRef = useRef({ trabajo: 0, descanso: 0 });

  // Registra una ronda intermedia (no la última de la sesión): una fila =
  // un pomodoro completo, trabajo + descanso. Avisa también al servicio de
  // IA para que ajuste el centroide. Las rondas intermedias se registran
  // solas, sin pasar por la encuesta (esa solo aparece al terminar la
  // sesión entera, ver finalizarSesionCompleta).
  const registrarRonda = async () => {
    const { trabajo, descanso } = elapsedRef.current;
    totalSesionRef.current.trabajo += trabajo;
    totalSesionRef.current.descanso += descanso;
    const trabajoMin = Math.floor(trabajo / 60);
    const descansoMin = Math.floor(descanso / 60);

    // Evita ensuciar el historial con rondas paradas casi nada más empezar.
    if (trabajoMin + descansoMin >= 1) {
      try {
        await logSesion(userId, trabajoMin, descansoMin, estadoId, 0, trabajo, descanso);
        onSesionRegistrada();
      } catch {
        // Si falla el guardado no bloqueamos al usuario.
      }
    }
    elapsedRef.current = { trabajo: 0, descanso: 0 };
  };

  // La sesión entera termina aquí (por el motivo que sea). En vez de
  // registrar y salir directamente, mostramos la pantalla de resumen +
  // encuesta; el registro real (con el ajuste que elija el usuario) se
  // dispara desde ahí.
  const finalizarSesionCompleta = (motivo: MotivoSalida) => {
    // Con esto activo evitamos que un tick del intervalo ya en curso (el que
    // programó el setInterval anterior a este cambio de fase) dispare esto
    // una segunda vez con elapsedRef ya reseteado a 0 — la comprobación al
    // principio del tick de abajo usa este mismo ref.
    if (salidaEnCursoRef.current) return;
    salidaEnCursoRef.current = true;
    totalSesionRef.current.trabajo += elapsedRef.current.trabajo;
    totalSesionRef.current.descanso += elapsedRef.current.descanso;
    setResumenPendiente({
      ...elapsedRef.current,
      motivo,
      totalTrabajo: totalSesionRef.current.trabajo,
      totalDescanso: totalSesionRef.current.descanso,
    });
    elapsedRef.current = { trabajo: 0, descanso: 0 };
  };

  const pasarDeFase = () => {
    // Ignora llamadas solapadas: si ya hay una transición en marcha (incluido
    // el hueco async de "registrarRonda" esperando la red), esta llamada no
    // hace nada. Sin esto, pulsar "Saltar" varias veces seguidas —o que el
    // intervalo dispare justo cuando el usuario también pulsa— podía saltar
    // varias rondas de golpe y dejar repeticionActual por encima de
    // repeticiones, rompiendo la pantalla.
    if (transicionEnCursoRef.current) return;
    transicionEnCursoRef.current = true;
    setBotonesDeshabilitados(true);

    if (faseRef.current === 'trabajo') {
      setFase('descanso');
      setSegundosRestantes(duracionFaseSec.descanso);
      transicionEnCursoRef.current = false;
      setBotonesDeshabilitados(false);
      return;
    }

    if (repeticionActualRef.current < repeticiones) {
      // No es la última ronda: se registra sola y la sesión continúa.
      registrarRonda().then(() => {
        transicionEnCursoRef.current = false;
        setBotonesDeshabilitados(false);
        // La sesión pudo haber terminado por otro camino (Stop, interrupción)
        // mientras esta ronda intermedia todavía se estaba guardando.
        if (salidaEnCursoRef.current) return;
        setRepeticionActual((r) => r + 1);
        setFase('trabajo');
        setSegundosRestantes(duracionFaseSec.trabajo);
      });
    } else {
      // Última ronda: aquí termina la sesión completa.
      finalizarSesionCompleta('completada');
      transicionEnCursoRef.current = false;
      setBotonesDeshabilitados(false);
    }
  };

  useEffect(() => {
    if (pausado) return;

    const id = setInterval(() => {
      if (salidaEnCursoRef.current || enSegundoPlanoRef.current) return;

      elapsedRef.current[fase] += 1;
      setSegundosRestantes((s) => {
        if (s <= 1) {
          clearInterval(id);
          reproducirAlarma();
          pasarDeFase();
          return s;
        }
        return s - 1;
      });
    }, 1000);

    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fase, pausado, repeticionActual]);

  // La app está pensada para móvil pero también se usa en escritorio, y debe
  // comportarse "como el temporizador del móvil": bloquear el teléfono NO
  // interrumpe, el conteo sigue (por reloj de pared) y suena aunque esté
  // bloqueado (notificación local programada). La interrupción real es
  // volver a abrir la app ANTES de que la fase de trabajo debiera terminar:
  // eso sí es una señal de que se rompió la concentración.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (siguienteEstado) => {
      if (salidaEnCursoRef.current) return;

      if (siguienteEstado !== 'active') {
        if (enSegundoPlanoRef.current) return;
        enSegundoPlanoRef.current = true;
        backgroundedAtRef.current = Date.now();

        const titulo = faseRef.current === 'trabajo' ? '¡Tiempo de trabajo terminado!' : '¡Descanso terminado!';
        const cuerpo =
          faseRef.current === 'trabajo' ? 'Se acabó el tiempo de trabajo.' : 'Se acabó el descanso.';
        programarAlarmaFase(segundosRestantesRef.current, titulo, cuerpo).then((id) => {
          notifIdRef.current = id;
        });
        return;
      }

      // Volvemos a primer plano.
      if (!enSegundoPlanoRef.current) return;
      enSegundoPlanoRef.current = false;
      cancelarAlarma(notifIdRef.current);
      notifIdRef.current = null;

      const segundosFuera = backgroundedAtRef.current ? Math.round((Date.now() - backgroundedAtRef.current) / 1000) : 0;
      backgroundedAtRef.current = null;
      const restanteReal = segundosRestantesRef.current - segundosFuera;

      if (restanteReal <= 0) {
        // La fase terminó mientras estaba en segundo plano: es una
        // finalización normal, como si hubiera sonado el temporizador.
        elapsedRef.current[faseRef.current] += segundosRestantesRef.current;
        reproducirAlarma();
        setSegundosRestantes(0);
        pasarDeFase();
        return;
      }

      if (faseRef.current === 'trabajo') {
        // Volvió antes de tiempo durante el trabajo: aquí sí se rompió la
        // concentración. Se cuenta el tiempo real hasta este momento.
        elapsedRef.current.trabajo += segundosFuera;
        finalizarSesionCompleta('interrumpida');
        return;
      }

      // Volvió antes de tiempo durante el descanso: no penaliza, solo
      // continúa la cuenta atrás con el tiempo real que queda.
      elapsedRef.current.descanso += segundosFuera;
      setSegundosRestantes(restanteReal);
    });

    return () => sub.remove();
  }, []);

  useEffect(() => {
    return () => {
      cancelarAlarma(notifIdRef.current);
    };
  }, []);

  const handleSkip = () => {
    setSegundosRestantes(0);
    pasarDeFase();
  };

  const handleStop = () => {
    finalizarSesionCompleta('detenida');
  };

  // Acción rápida de la pantalla de pausa: durante el trabajo, cortar aquí
  // sí "rompe" la concentración (misma lógica que la interrupción por
  // AppState: se guarda solo el tiempo real y se cierra la ronda). Durante
  // el descanso no hay esa implicación: simplemente salta de fase, igual
  // que el botón "Saltar" normal.
  const handleAccionRapidaPausa = () => {
    if (fase === 'trabajo') {
      finalizarSesionCompleta('pausada');
      return;
    }
    setPausado(false);
    handleSkip();
  };

  // Envía la ronda final (la que cerró la sesión) con el ajuste elegido en
  // la encuesta, y devuelve cómo cambió el centroide para mostrarlo.
  const handleEnviarResumen = async (ajusteMinutos: number): Promise<CentroideInfo | null> => {
    if (!resumenPendiente) return null;
    const trabajoMin = Math.floor(resumenPendiente.trabajo / 60);
    const descansoMin = Math.floor(resumenPendiente.descanso / 60);

    if (trabajoMin + descansoMin < 1) return null;

    try {
      const respuesta = await logSesion(
        userId,
        trabajoMin,
        descansoMin,
        estadoId,
        ajusteMinutos,
        resumenPendiente.trabajo,
        resumenPendiente.descanso
      );
      onSesionRegistrada();
      return respuesta.centroideInfo;
    } catch {
      return null;
    }
  };

  const handleContinuarResumen = () => {
    if (!resumenPendiente) return;
    onSalir(resumenPendiente.motivo);
  };

  const handleVerEstadisticasResumen = async (ajusteMinutos: number) => {
    await handleEnviarResumen(ajusteMinutos);
    onVerEstadisticas();
  };

  const duracionActual = duracionFaseSec[fase];
  const progresoRestante = segundosRestantes / duracionActual;
  const dashoffset = CIRCUMFERENCE * (1 - progresoRestante);
  const colorFase = fase === 'trabajo' ? DesignColors.secondary : DesignColors.primary;
  const metaProgreso = Math.min(1, sesionesHoy / META_SESIONES_DIARIA);

  if (resumenPendiente) {
    return (
      <View style={styles.container}>
        <SessionSummary
          motivo={resumenPendiente.motivo}
          estadoAnimo={estadoAnimo}
          tiempoTrabajoSeg={resumenPendiente.totalTrabajo}
          tiempoDescansoSeg={resumenPendiente.totalDescanso}
          onFinalizar={handleEnviarResumen}
          onVerEstadisticas={handleVerEstadisticasResumen}
          onContinuar={handleContinuarResumen}
        />
      </View>
    );
  }

  if (pausado) {
    return (
      <View style={styles.container}>
        <PauseScreen
          fase={fase}
          repeticionActual={repeticionActual}
          repeticiones={repeticiones}
          segundosTranscurridos={elapsedRef.current[fase]}
          segundosRestantes={segundosRestantes}
          onSeguir={() => setPausado(false)}
          onAccionRapida={handleAccionRapidaPausa}
          accionRapidaLabel={fase === 'trabajo' ? 'Finalizar Sesión' : 'Volver al Trabajo'}
          accionRapidaIcon={fase === 'trabajo' ? 'stop' : 'bolt'}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.rondaLabel}>
        Ronda {repeticionActual} de {repeticiones}
      </Text>

      <View style={styles.ringWrapper}>
        <Svg width={RING_SIZE} height={RING_SIZE} style={styles.ringSvg}>
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RADIUS}
            stroke="rgba(255,255,255,0.05)"
            strokeWidth={STROKE_WIDTH}
            fill="transparent"
          />
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RADIUS}
            stroke={colorFase}
            strokeWidth={STROKE_WIDTH}
            fill="transparent"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashoffset}
            strokeLinecap="round"
            rotation={-90}
            originX={RING_SIZE / 2}
            originY={RING_SIZE / 2}
          />
        </Svg>
        <View style={styles.ringCenter}>
          <Text style={[styles.faseLabel, { color: colorFase }]}>
            {fase === 'trabajo' ? 'Trabajo enfocado' : 'Descanso'}
          </Text>
          <Text style={styles.tiempo}>{formatMMSS(segundosRestantes)}</Text>
        </View>
      </View>

      <View style={styles.badge}>
        <MaterialIcons name="auto-awesome" size={16} color={DesignColors.secondary} />
        <Text style={styles.badgeText}>
          Ajustado por IA ({estadoAnimo}): {tiempoTrabajoMin} min de trabajo
        </Text>
      </View>

      <View style={styles.controls}>
        <Pressable
          style={[styles.roundButtonGhost, botonesDeshabilitados && styles.roundButtonDisabled]}
          onPress={handleStop}
          disabled={botonesDeshabilitados}
        >
          <MaterialIcons name="stop" size={22} color={DesignColors.onSurfaceVariant} />
        </Pressable>

        <Pressable onPress={() => setPausado((p) => !p)}>
          <LinearGradient
            colors={[DesignColors.primary, DesignColors.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.playButton}
          >
            <MaterialIcons name={pausado ? 'play-arrow' : 'pause'} size={32} color={DesignColors.onPrimary} />
          </LinearGradient>
        </Pressable>

        <Pressable
          style={[styles.roundButtonGhost, botonesDeshabilitados && styles.roundButtonDisabled]}
          onPress={handleSkip}
          disabled={botonesDeshabilitados}
        >
          <MaterialIcons name="skip-next" size={22} color={DesignColors.onSurfaceVariant} />
        </Pressable>
      </View>

      <View style={styles.goal}>
        <View style={styles.goalHeader}>
          <Text style={styles.goalLabel}>Meta diaria</Text>
          <Text style={styles.goalValue}>
            {sesionesHoy}
            <Text style={styles.goalValueMuted}>/{META_SESIONES_DIARIA}</Text>
          </Text>
        </View>
        <View style={styles.goalTrack}>
          <View style={[styles.goalFill, { width: `${metaProgreso * 100}%` }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: 32, paddingTop: 24 },
  rondaLabel: {
    ...DesignTypography.labelCaps,
    color: DesignColors.onSurfaceVariant,
    textTransform: 'uppercase',
  },
  ringWrapper: { width: RING_SIZE, height: RING_SIZE, alignItems: 'center', justifyContent: 'center' },
  ringSvg: { position: 'absolute' },
  ringCenter: { alignItems: 'center', gap: 8 },
  faseLabel: {
    ...DesignTypography.labelCaps,
    textTransform: 'uppercase',
  },
  tiempo: {
    fontFamily: DesignFonts.headlineBold,
    fontSize: 64,
    letterSpacing: -2,
    color: DesignColors.onSurface,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: 'rgba(31,31,40,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(68,226,205,0.2)',
    maxWidth: '90%',
  },
  badgeText: {
    ...DesignTypography.labelCaps,
    color: DesignColors.onSurface,
    flexShrink: 1,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DesignSpacing.gutter,
  },
  roundButtonGhost: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  roundButtonDisabled: {
    opacity: 0.4,
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goal: { width: '100%', maxWidth: 320, gap: 12 },
  goalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  goalLabel: { ...DesignTypography.labelCaps, color: DesignColors.onSurfaceVariant },
  goalValue: {
    ...DesignTypography.headlineLgMobile,
    fontSize: 20,
    color: DesignColors.onSurface,
  },
  goalValueMuted: { color: 'rgba(199,196,216,0.5)' },
  goalTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: DesignColors.surfaceContainerHighest,
    overflow: 'hidden',
  },
  goalFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: DesignColors.secondary,
  },
});
