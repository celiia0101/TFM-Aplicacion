import { apiGet, apiPost } from '@/lib/api';

export type DiaGrafica = {
  fecha: string;
  dia: string;
  trabajo: number;
};

export type SesionReciente = {
  fecha: string;
  tiempoTrabajo: number;
  tiempoDescanso: number;
};

export type Resumen = {
  tiempoInvertidoHoy: number;
  tiempoTrabajoHoy: number;
  concentracion: number;
  sesionesHoy: number;
  grafica: DiaGrafica[];
  sesionesRecientes: SesionReciente[];
  insight: string;
  rachaDias: number;
};

export type Duracion = {
  tiempoTrabajo: number;
  tiempoDescanso: number;
};

export type EstadoAnimo = {
  id: number;
  estadoAnimo: string;
};

export type MotivoSalida = 'completada' | 'detenida' | 'interrumpida' | 'pausada';

export type PuntoTendencia = {
  fecha: string;
  tiempoTrabajo: number;
};

export type TendenciaEstado = {
  estadoId: number;
  estadoAnimo: string;
  puntos: PuntoTendencia[];
};

export function getResumen(userId: number): Promise<Resumen> {
  return apiGet<Resumen>(`/pomodoro/resumen/${userId}`);
}

export function getEstadosAnimo(): Promise<{ estados: EstadoAnimo[] }> {
  return apiGet<{ estados: EstadoAnimo[] }>('/pomodoro/estados-animo');
}

export function getTendencia(userId: number): Promise<{ tendencias: TendenciaEstado[] }> {
  return apiGet<{ tendencias: TendenciaEstado[] }>(`/pomodoro/tendencia/${userId}`);
}

export type Estadisticas = {
  concentracionSemana: number;
  tiempoEnfoqueSemanaMin: number;
  tiempoEnfoqueSemanaAnteriorMin: number;
};

export function getEstadisticas(userId: number): Promise<Estadisticas> {
  return apiGet<Estadisticas>(`/pomodoro/estadisticas/${userId}`);
}

export function getDuracion(userId: number, estadoId: number): Promise<Duracion> {
  return apiGet<Duracion>(`/pomodoro/duracion/${userId}/${estadoId}`);
}

// antes/despues vienen en SEGUNDOS (el centroide del modelo de IA), no en
// minutos: formatear con formatDuracionSegundos antes de mostrarlos.
export type CentroideInfo = {
  antes: number | null;
  despues: number;
};

export function logSesion(
  userId: number,
  tiempoTrabajo: number,
  tiempoDescanso: number,
  estadoId: number,
  ajusteMinutos = 0,
  // Segundos reales transcurridos (antes de truncar a minutos enteros): el
  // backend los usa para no perder precisión al alimentar el centroide del
  // modelo de IA. tiempoTrabajo/tiempoDescanso (en minutos) siguen siendo lo
  // que se guarda en el historial de sesiones.
  tiempoTrabajoSeg?: number,
  tiempoDescansoSeg?: number
): Promise<{ error: boolean; centroideInfo: CentroideInfo | null }> {
  return apiPost('/pomodoro', {
    userId,
    tiempoTrabajo,
    tiempoDescanso,
    estadoId,
    ajusteMinutos,
    tiempoTrabajoSeg,
    tiempoDescansoSeg,
  });
}

export function formatMinutos(totalMinutos: number): string {
  const horas = Math.floor(totalMinutos / 60);
  const minutos = totalMinutos % 60;
  if (horas === 0) return `${minutos}m`;
  return `${horas}h ${minutos}m`;
}

// Como formatMinutos pero con precisión de segundos, para duraciones cortas
// (una ronda, el tiempo transcurrido en pausa...) donde redondear a minutos
// enteros puede mostrar "0 min" y ocultar que sí ha pasado tiempo real.
export function formatDuracionSegundos(totalSegundos: number): string {
  const mins = Math.floor(totalSegundos / 60);
  const segs = Math.floor(totalSegundos % 60);
  if (mins === 0) return `${segs} s`;
  if (segs === 0) return `${mins} min`;
  return `${mins} min ${segs} s`;
}

function esMismoDia(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// "Hoy · 12:15" / "Ayer · 12:14" / "18 ago · 12:14" según qué tan reciente sea,
// para no confundir sesiones de días distintos que caen a la misma hora.
export function formatFechaSesion(fechaISO: string): string {
  const fecha = new Date(fechaISO);
  const ahora = new Date();
  const ayer = new Date(ahora);
  ayer.setDate(ayer.getDate() - 1);

  const hora = fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

  if (esMismoDia(fecha, ahora)) return `Hoy · ${hora}`;
  if (esMismoDia(fecha, ayer)) return `Ayer · ${hora}`;

  const dia = fecha.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  return `${dia} · ${hora}`;
}
