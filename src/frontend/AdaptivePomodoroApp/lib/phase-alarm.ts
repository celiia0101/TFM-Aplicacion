import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

// Para que "suene como el temporizador del móvil" también cuando el teléfono
// está bloqueado, programamos una notificación local con sonido en vez de
// depender de que el JS siga corriendo en segundo plano (el SO lo suspende).
// expo-notifications no soporta programar notificaciones locales en web, así
// que ahí no hacemos nada (el sonido en foreground sigue funcionando igual).

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let permisoConcedido: boolean | null = null;

async function asegurarPermiso(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  if (permisoConcedido !== null) return permisoConcedido;

  const actual = await Notifications.getPermissionsAsync();
  if (actual.status === 'granted') {
    permisoConcedido = true;
    return true;
  }
  const solicitado = await Notifications.requestPermissionsAsync();
  permisoConcedido = solicitado.status === 'granted';
  return permisoConcedido;
}

export async function programarAlarmaFase(segundos: number, titulo: string, cuerpo: string): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  const ok = await asegurarPermiso();
  if (!ok) return null;

  try {
    return await Notifications.scheduleNotificationAsync({
      content: { title: titulo, body: cuerpo, sound: true },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.max(1, Math.round(segundos)),
      },
    });
  } catch {
    return null;
  }
}

export async function cancelarAlarma(id: string | null): Promise<void> {
  if (!id || Platform.OS === 'web') return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // Ya se disparó o ya no existe; no pasa nada.
  }
}
