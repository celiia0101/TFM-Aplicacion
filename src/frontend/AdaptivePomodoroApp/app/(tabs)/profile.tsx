import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

import { AtmosphericBackground } from '@/components/atmospheric-background';
import { TopAppBar } from '@/components/top-app-bar';
import { GlassPanel } from '@/components/glass-panel';
import { Sparkline } from '@/components/sparkline';
import { DesignColors, DesignFonts, DesignSpacing, DesignTypography } from '@/constants/design';
import { PRESENTACION_ANIMO, PRESENTACION_DEFECTO } from '@/constants/moods';
import { TendenciaEstado, getResumen, getTendencia } from '@/lib/pomodoro';
import { ApiError } from '@/lib/api';
import { StoredUser, clearToken, clearUser, getUser } from '@/lib/auth-storage';

export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState<StoredUser | null>(null);
  const [rachaDias, setRachaDias] = useState(0);
  const [tendencias, setTendencias] = useState<TendenciaEstado[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setErrorMessage(null);
    try {
      const usuarioActual = await getUser();
      if (!usuarioActual) {
        setErrorMessage('No se encontró la sesión. Vuelve a iniciar sesión.');
        return;
      }
      setUser(usuarioActual);
      const [{ tendencias: lista }, resumen] = await Promise.all([
        getTendencia(usuarioActual.id),
        getResumen(usuarioActual.id),
      ]);
      setTendencias(lista);
      setRachaDias(resumen.rachaDias);
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : 'No se pudo cargar tu tendencia');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  const handleCerrarSesion = async () => {
    await clearToken();
    await clearUser();
    router.replace('/');
  };

  return (
    <View style={styles.root}>
      <AtmosphericBackground />
      <TopAppBar title="PomodoroIA" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {user && (
          <GlassPanel style={styles.accountCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarLetter}>{user.nombreUsuario.trim().charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.accountInfo}>
              <Text style={styles.accountName}>{user.nombreUsuario}</Text>
              {rachaDias > 0 && (
                <View style={styles.rachaRow}>
                  <MaterialIcons name="bolt" size={14} color={DesignColors.secondary} />
                  <Text style={styles.rachaText}>
                    Racha de {rachaDias} {rachaDias === 1 ? 'día' : 'días'}
                  </Text>
                </View>
              )}
            </View>
          </GlassPanel>
        )}

        <View style={styles.hero}>
          <Text style={styles.headline}>Tu tendencia</Text>
          <Text style={styles.subheadline}>
            Cómo ha ido ajustando la IA tu duración de trabajo en cada estado de ánimo.
          </Text>
        </View>

        <Pressable onPress={() => router.push('/estadisticas')}>
          <GlassPanel style={styles.statsLinkCard}>
            <View style={styles.statsLinkIcon}>
              <MaterialIcons name="insights" size={20} color={DesignColors.secondary} />
            </View>
            <View style={styles.statsLinkText}>
              <Text style={styles.statsLinkTitle}>Bio-Analytics</Text>
              <Text style={styles.statsLinkSubtitle}>Mapa de estados y estadísticas de la semana</Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color={DesignColors.onSurfaceVariant} />
          </GlassPanel>
        </Pressable>

        {loading && (
          <View style={styles.centered}>
            <ActivityIndicator color={DesignColors.primary} />
          </View>
        )}

        {!loading && errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}

        {!loading && !errorMessage && tendencias.length === 0 && (
          <Text style={styles.emptyText}>
            Todavía no hay datos. Completa alguna sesión en Focus para empezar a ver tu tendencia aquí.
          </Text>
        )}

        {!loading &&
          !errorMessage &&
          tendencias.map((tendencia) => {
            const presentacion = PRESENTACION_ANIMO[tendencia.estadoId] ?? PRESENTACION_DEFECTO;
            const valores = tendencia.puntos.map((p) => p.tiempoTrabajo);
            const actual = valores[valores.length - 1];
            const primero = valores[0];
            const delta = valores.length > 1 ? Math.round((actual - primero) * 10) / 10 : 0;

            return (
              <GlassPanel key={tendencia.estadoId} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitleRow}>
                    <MaterialIcons name={presentacion.icon} size={20} color={presentacion.color} />
                    <Text style={styles.cardTitle}>{tendencia.estadoAnimo}</Text>
                  </View>
                  {valores.length > 0 && (
                    <View style={styles.cardValueWrap}>
                      <Text style={[styles.cardValue, { color: presentacion.color }]}>{actual} min</Text>
                      {delta !== 0 && (
                        <View style={styles.deltaRow}>
                          <MaterialIcons
                            name={delta > 0 ? 'trending-up' : 'trending-down'}
                            size={14}
                            color={delta > 0 ? DesignColors.tertiary : DesignColors.secondary}
                          />
                          <Text style={styles.deltaText}>
                            {delta > 0 ? '+' : ''}
                            {delta} min desde el inicio
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>

                {valores.length >= 2 ? (
                  <Sparkline values={valores} color={presentacion.color} />
                ) : (
                  <Text style={styles.emptyText}>
                    {valores.length === 1
                      ? 'Solo hay una sesión registrada todavía; completa alguna más para ver la tendencia.'
                      : 'Aún no has completado ninguna sesión con este ánimo.'}
                  </Text>
                )}
              </GlassPanel>
            );
          })}

        <GlassPanel style={styles.logoutCard}>
          <Pressable style={styles.logoutButton} onPress={handleCerrarSesion}>
            <MaterialIcons name="logout" size={20} color={DesignColors.error} />
            <Text style={styles.logoutText}>Cerrar Sesión</Text>
          </Pressable>
        </GlassPanel>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: DesignColors.surface },
  scrollContent: {
    paddingTop: 100,
    paddingBottom: 120,
    paddingHorizontal: DesignSpacing.containerPadding,
    gap: DesignSpacing.gutter,
  },
  centered: { paddingVertical: 40, alignItems: 'center' },
  errorText: { ...DesignTypography.bodyMd, color: DesignColors.error, textAlign: 'center' },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: DesignSpacing.containerPadding,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: DesignColors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DesignColors.surfaceContainerHighest,
  },
  avatarLetter: {
    fontFamily: DesignFonts.headlineBold,
    fontSize: 22,
    color: DesignColors.secondary,
  },
  accountInfo: { gap: 4 },
  accountName: {
    ...DesignTypography.headlineLgMobile,
    fontSize: 18,
    color: DesignColors.onSurface,
  },
  rachaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rachaText: {
    ...DesignTypography.labelCaps,
    fontSize: 11,
    color: DesignColors.onSurfaceVariant,
  },
  logoutCard: { overflow: 'hidden' },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
  },
  logoutText: {
    fontFamily: DesignFonts.label,
    fontSize: 15,
    color: DesignColors.error,
  },
  hero: { gap: 8, marginBottom: 8 },
  statsLinkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: DesignSpacing.gutter,
  },
  statsLinkIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(68, 226, 205, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsLinkText: { flex: 1, gap: 2 },
  statsLinkTitle: {
    fontFamily: DesignFonts.label,
    fontSize: 15,
    color: DesignColors.onSurface,
  },
  statsLinkSubtitle: {
    ...DesignTypography.bodyMd,
    fontSize: 12,
    color: DesignColors.onSurfaceVariant,
  },
  headline: {
    ...DesignTypography.headlineLgMobile,
    color: DesignColors.onSurface,
  },
  subheadline: {
    ...DesignTypography.bodyMd,
    fontSize: 14,
    color: DesignColors.onSurfaceVariant,
    opacity: 0.8,
  },
  card: {
    padding: DesignSpacing.containerPadding,
    gap: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    ...DesignTypography.labelCaps,
    color: DesignColors.onSurface,
    textTransform: 'uppercase',
  },
  cardValueWrap: { alignItems: 'flex-end', gap: 2 },
  cardValue: {
    fontFamily: DesignFonts.headlineBold,
    fontSize: 20,
  },
  deltaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  deltaText: {
    fontFamily: DesignFonts.label,
    fontSize: 10,
    color: DesignColors.onSurfaceVariant,
  },
  emptyText: {
    ...DesignTypography.bodyMd,
    fontSize: 13,
    color: DesignColors.onSurfaceVariant,
    opacity: 0.7,
  },
});
