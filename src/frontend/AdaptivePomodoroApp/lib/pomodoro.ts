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

export function getDuracion(userId: number, estadoId: number): Promise<Duracion> {
  return apiGet<Duracion>(`/pomodoro/duracion/${userId}/${estadoId}`);
}

export type CentroideInfo = {
  antes: number | null;
  despues: number;
};

export function logSesion(
  userId: number,
  tiempoTrabajo: number,
  tiempoDescanso: number,
  estadoId: number,
  ajusteMinutos = 0
): Promise<{ error: boolean; centroideInfo: CentroideInfo | null }> {
  return apiPost('/pomodoro', { userId, tiempoTrabajo, tiempoDescanso, estadoId, ajusteMinutos });
}

export function formatMinutos(totalMinutos: number): string {
  const horas = Math.floor(totalMinutos / 60);
  const minutos = totalMinutos % 60;
  if (horas === 0) return `${minutos}m`;
  return `${horas}h ${minutos}m`;
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
