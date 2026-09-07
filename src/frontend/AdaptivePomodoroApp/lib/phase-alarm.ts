import { Platform } from 'react-native';
import type * as NotificationsType from 'expo-notifications';
import Constants, { ExecutionEnvironment } from 'expo-constants';

// Para que "suene como el temporizador del móvil" también cuando el teléfono
// está bloqueado, programamos una notificación local con sonido en vez de
// depender de que el JS siga corriendo en segundo plano (el SO lo suspende).
// expo-notifications no soporta programar notificaciones locales en web, así
// que ahí no hacemos nada (el sonido en foreground sigue funcionando igual).
//
// Tampoco es fiable dentro de Expo Go (Expo lo desaconseja explícitamente
// desde el SDK 53 y puede llegar a cerrar la app en iOS): solo lo activamos
// en un development build o standalone. Por eso el módulo se carga con
// require() dentro del if, en vez de un import estático arriba del archivo:
// un import se ejecuta siempre al cargar este fichero (registrando el módulo
// nativo aunque no lo usemos), mientras que este require() solo se ejecuta
// si "disponible" es true, así que en Expo Go ni siquiera se toca.
const disponible =
  Platform.OS !== 'web' && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

let Notifications: typeof NotificationsType | null = null;
if (disponible) {
  Notifications = require('expo-notifications');
  Notifications!.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

let permisoConcedido: boolean | null = null;

async function asegurarPermiso(): Promise<boolean> {
  if (!Notifications) return false;
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
  if (!Notifications) return null;

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
  if (!id || !Notifications) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // Ya se disparó o ya no existe; no pasa nada.
  }
}
