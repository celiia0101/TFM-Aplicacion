import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';

import { GlassPanel } from '@/components/glass-panel';
import { DesignColors, DesignFonts, DesignSpacing, DesignTypography } from '@/constants/design';
import { CentroideInfo, formatDuracionSegundos, MotivoSalida } from '@/lib/pomodoro';

type Ritmo = 'corto' | 'ideal' | 'largo';

const AJUSTE_BASE: Record<Ritmo, number> = { corto: -5, ideal: 0, largo: 5 };
const AJUSTE_MIN = -15;
const AJUSTE_MAX = 15;
const AJUSTE_PASO = 5;

// "Más corto/Ideal/Más largo" no es un estado propio: se deriva siempre del
// signo del ajuste, para que mover el stepper directamente (sin tocar los
// botones) también actualice cuál aparece marcado.
function ritmoDeAjuste(ajuste: number): Ritmo {
  if (ajuste < 0) return 'corto';
  if (ajuste > 0) return 'largo';
  return 'ideal';
}


// La sesión pudo terminar de formas muy distintas (completa, parada,
// interrumpida...); el título y el icono deben reflejarlo con honestidad,
// no celebrar un "excelente trabajo" si en realidad se cortó a medias.
const COPY_POR_MOTIVO: Record<MotivoSalida, { icono: keyof typeof MaterialIcons.glyphMap; titulo: string; subtitulo: string }> = {
  completada: {
    icono: 'emoji-events',
    titulo: '¡Sesión completada!',
    subtitulo: 'Terminaste todas las rondas previstas.',
  },
  detenida: {
    icono: 'info',
    titulo: 'Sesión detenida',
    subtitulo: 'Guardamos tu progreso real hasta este punto.',
  },
  interrumpida: {
    icono: 'info',
    titulo: 'Sesión interrumpida',
    subtitulo: 'Saliste de la app durante el trabajo; guardamos tu tiempo real.',
  },
  pausada: {
    icono: 'info',
    titulo: 'Sesión finalizada',
    subtitulo: 'Elegiste terminar aquí; guardamos tu tiempo real de concentración.',
  },
};

export function SessionSummary({
  motivo,
  estadoAnimo,
  tiempoTrabajoSeg,
  tiempoPlaneadoSeg,
  onFinalizar,
  onVerEstadisticas,
  onContinuar,
}: {
  motivo: MotivoSalida;
  estadoAnimo: string;
  tiempoTrabajoSeg: number;
  tiempoPlaneadoSeg: number;
  onFinalizar: (ajusteMinutos: number) => Promise<CentroideInfo | null>;
  onVerEstadisticas: (ajusteMinutos: number) => void;
  onContinuar: () => void;
}) {
  const copy = COPY_POR_MOTIVO[motivo];
  const [ajuste, setAjuste] = useState(0);
  const ritmo = ritmoDeAjuste(ajuste);
  const [enviando, setEnviando] = useState(false);
  // undefined = todavía no se ha enviado la encuesta; null = se envió pero
  // sin info de centroide (p.ej. el servicio de IA no respondió).
  const [resultado, setResultado] = useState<CentroideInfo | null | undefined>(undefined);

  // La concentración compara el trabajo real contra el tiempo TOTAL
  // PLANEADO (rondas × duración recomendada de trabajo+descanso), no contra
  // lo que de verdad ocurrió: si el usuario para a medias, debe reflejar
  // cuánto de la sesión prevista completó de verdad, no un 100% artificial
  // por no haber llegado a descansar nunca.
  const concentracionSesion =
    tiempoPlaneadoSeg > 0 ? Math.round((tiempoTrabajoSeg / tiempoPlaneadoSeg) * 100) : 0;

  const handleFinalizar = async () => {
    setEnviando(true);
    const info = await onFinalizar(ajuste);
    setEnviando(false);
    setResultado(info);
  };

  if (resultado !== undefined) {
    return (
      <View style={styles.container}>
        <View style={styles.iconoWrap}>
          <MaterialIcons name="check-circle" size={44} color={DesignColors.secondary} />
        </View>
        <Text style={styles.headline}>¡Listo!</Text>

        {resultado ? (
          <GlassPanel style={styles.card}>
            <Text style={styles.cardLabel}>PRÓXIMA DURACIÓN RECOMENDADA</Text>
            <View style={styles.centroideRow}>
              {resultado.antes !== null && (
                <>
                  <Text style={styles.centroideAntes}>{formatDuracionSegundos(resultado.antes)}</Text>
                  <MaterialIcons name="arrow-forward" size={18} color={DesignColors.onSurfaceVariant} />
                </>
              )}
              <Text style={styles.centroideDespues}>{formatDuracionSegundos(resultado.despues)}</Text>
            </View>
            <Text style={styles.cardCaption}>
              {resultado.coincideConElegido
                ? `Para el ánimo "${estadoAnimo}", según tu encuesta.`
                : `Esta sesión se pareció más a tu ritmo de "${resultado.estadoAnimoReal}", así que ajustamos ese en su lugar.`}
            </Text>
          </GlassPanel>
        ) : (
          <Text style={styles.subheadline}>Tu sesión quedó guardada.</Text>
        )}

        <Pressable onPress={onContinuar} style={styles.actionWidth}>
          <LinearGradient
            colors={[DesignColors.primary, DesignColors.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>Continuar</Text>
          </LinearGradient>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.iconoWrap}>
        <MaterialIcons name={copy.icono} size={40} color={DesignColors.secondary} />
      </View>
      <Text style={styles.headline}>{copy.titulo}</Text>
      <Text style={styles.subheadline}>{copy.subtitulo}</Text>

      <GlassPanel style={styles.card}>
        <Text style={styles.cardLabel}>RESUMEN DE LA SESIÓN</Text>

        <View style={styles.filaResumen}>
          <View style={styles.filaResumenIzq}>
            <MaterialIcons name="timer" size={18} color={DesignColors.onSurfaceVariant} />
            <Text style={styles.filaResumenLabel}>Trabajo</Text>
          </View>
          <Text style={styles.filaResumenValor}>{formatDuracionSegundos(tiempoTrabajoSeg)}</Text>
        </View>

        <View style={styles.filaResumen}>
          <View style={styles.filaResumenIzq}>
            <MaterialIcons name="bolt" size={18} color={DesignColors.secondary} />
            <Text style={styles.filaResumenLabel}>Concentración</Text>
          </View>
          <Text style={[styles.filaResumenValor, { color: DesignColors.secondary }]}>{concentracionSesion}%</Text>
        </View>
      </GlassPanel>

      <GlassPanel style={styles.card}>
        <Text style={styles.cardLabel}>¿CÓMO FUE TU RITMO?</Text>
        <Text style={styles.cardCaption}>¿Podrías haber aguantado más o prefieres sesiones más cortas?</Text>

        <View style={styles.segmentado}>
          {(['corto', 'ideal', 'largo'] as Ritmo[]).map((r) => (
            <Pressable
              key={r}
              style={[styles.segmentoBtn, ritmo === r && styles.segmentoBtnActivo]}
              onPress={() => setAjuste(AJUSTE_BASE[r])}
            >
              <Text style={[styles.segmentoTexto, ritmo === r && styles.segmentoTextoActivo]}>
                {r === 'corto' ? 'Más corto' : r === 'ideal' ? 'Ideal' : 'Más largo'}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.ajusteRow}>
          <Text style={styles.ajusteLabel}>Ajustar por minutos</Text>
          <Text style={styles.ajusteValor}>
            {ajuste > 0 ? '+' : ''}
            {ajuste} min
          </Text>
        </View>
        <View style={styles.stepperFino}>
          <Pressable
            style={styles.stepperFinoBtn}
            disabled={ajuste <= AJUSTE_MIN}
            onPress={() => setAjuste((a) => Math.max(AJUSTE_MIN, a - AJUSTE_PASO))}
          >
            <MaterialIcons name="remove" size={18} color={DesignColors.onSurface} />
          </Pressable>
          <View style={styles.stepperFinoTrack}>
            <View
              style={[styles.stepperFinoFill, { width: `${((ajuste - AJUSTE_MIN) / (AJUSTE_MAX - AJUSTE_MIN)) * 100}%` }]}
            />
          </View>
          <Pressable
            style={styles.stepperFinoBtn}
            disabled={ajuste >= AJUSTE_MAX}
            onPress={() => setAjuste((a) => Math.min(AJUSTE_MAX, a + AJUSTE_PASO))}
          >
            <MaterialIcons name="add" size={18} color={DesignColors.onSurface} />
          </Pressable>
        </View>
      </GlassPanel>

      <View style={styles.acciones}>
        <Pressable onPress={handleFinalizar} disabled={enviando}>
          <LinearGradient
            colors={[DesignColors.primary, DesignColors.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.primaryButton}
          >
            {enviando ? (
              <ActivityIndicator color={DesignColors.onPrimary} />
            ) : (
              <View style={styles.botonContenido}>
                <Text style={styles.primaryButtonText}>Finalizar</Text>
                <MaterialIcons name="check-circle" size={18} color={DesignColors.onPrimary} />
              </View>
            )}
          </LinearGradient>
        </Pressable>

        <Pressable onPress={() => onVerEstadisticas(ajuste)} disabled={enviando}>
          <GlassPanel style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Ver Estadísticas</Text>
            <MaterialIcons name="bar-chart" size={18} color={DesignColors.onSurface} />
          </GlassPanel>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: DesignSpacing.gutter, paddingTop: 16, paddingBottom: 24 },
  iconoWrap: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(68,226,205,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(68,226,205,0.3)',
    marginBottom: 4,
  },
  headline: {
    ...DesignTypography.headlineLgMobile,
    color: DesignColors.onSurface,
    textAlign: 'center',
  },
  subheadline: {
    ...DesignTypography.bodyMd,
    fontSize: 14,
    color: DesignColors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: -8,
  },
  card: {
    width: '100%',
    padding: DesignSpacing.containerPadding,
    gap: 14,
  },
  cardLabel: {
    ...DesignTypography.labelCaps,
    color: DesignColors.primary,
    textTransform: 'uppercase',
  },
  cardCaption: {
    ...DesignTypography.bodyMd,
    fontSize: 13,
    color: DesignColors.onSurfaceVariant,
    marginTop: -8,
  },
  filaResumen: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    paddingBottom: 10,
  },
  filaResumenIzq: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  filaResumenLabel: { ...DesignTypography.bodyMd, fontSize: 14, color: DesignColors.onSurfaceVariant },
  filaResumenValor: {
    fontFamily: DesignFonts.headlineBold,
    fontSize: 18,
    color: DesignColors.onSurface,
  },
  segmentado: {
    flexDirection: 'row',
    backgroundColor: DesignColors.surfaceContainerHighest,
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  segmentoBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 9,
    alignItems: 'center',
  },
  segmentoBtnActivo: {
    backgroundColor: 'rgba(195,192,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(195,192,255,0.35)',
  },
  segmentoTexto: {
    fontFamily: DesignFonts.label,
    fontSize: 12,
    color: DesignColors.onSurfaceVariant,
  },
  segmentoTextoActivo: { color: DesignColors.primary },
  ajusteRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  ajusteLabel: { ...DesignTypography.bodyMd, fontSize: 13, color: DesignColors.onSurfaceVariant },
  ajusteValor: { fontFamily: DesignFonts.label, fontSize: 13, color: DesignColors.secondary },
  stepperFino: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepperFinoBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  stepperFinoTrack: {
    flex: 1,
    height: 4,
    borderRadius: 999,
    backgroundColor: DesignColors.surfaceContainerHighest,
    overflow: 'hidden',
  },
  stepperFinoFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: DesignColors.secondary,
  },
  acciones: { width: '100%', gap: 12 },
  actionWidth: { width: '100%', maxWidth: 280 },
  botonContenido: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
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
    gap: 8,
    paddingVertical: 15,
    borderRadius: 16,
  },
  secondaryButtonText: {
    fontFamily: DesignFonts.body,
    fontSize: 15,
    color: DesignColors.onSurface,
  },
  centroideRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  centroideAntes: {
    fontFamily: DesignFonts.body,
    fontSize: 16,
    color: DesignColors.onSurfaceVariant,
    textDecorationLine: 'line-through',
  },
  centroideDespues: {
    fontFamily: DesignFonts.headlineBold,
    fontSize: 24,
    color: DesignColors.secondary,
  },
});
