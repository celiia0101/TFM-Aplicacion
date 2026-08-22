import { useAudioPlayer } from 'expo-audio';

// Sonido corto (sintetizado, no descargado) para avisar al terminar una fase
// del pomodoro. Ver assets/sounds/alarm.wav.
export function useAlarmSound() {
  const player = useAudioPlayer(require('../assets/sounds/alarm.wav'));

  return () => {
    try {
      player.seekTo(0);
      player.play();
    } catch {
      // En web, si el usuario aún no ha interactuado con la página, el
      // navegador puede bloquear el autoplay de audio; lo ignoramos.
    }
  };
}
