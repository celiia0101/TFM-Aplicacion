import { MaterialIcons } from '@expo/vector-icons';
import { DesignColors } from '@/constants/design';

export type IconName = keyof typeof MaterialIcons.glyphMap;

// L_ESTADO_ANIMO solo guarda id + etiqueta de texto; el icono, el subtítulo y
// el color de acento son puramente de presentación y viven aquí, indexados
// por ID_ESTADO (estable: es la PK que también referencia M_POMODORO).
export const PRESENTACION_ANIMO: Record<number, { icon: IconName; subtitulo: string; color: string }> = {
  1: { icon: 'sentiment-satisfied', subtitulo: 'Ritmo equilibrado', color: DesignColors.secondary }, // Bien
  2: { icon: 'whatshot', subtitulo: 'Bajo presión', color: DesignColors.error }, // Estresado
  3: { icon: 'bolt', subtitulo: 'Energía a tope', color: DesignColors.tertiary }, // Puedo con Todo
  4: { icon: 'bedtime', subtitulo: 'Necesito calma', color: DesignColors.primary }, // Cansado
};

export const PRESENTACION_DEFECTO = {
  icon: 'psychology' as IconName,
  subtitulo: '',
  color: DesignColors.secondary,
};
