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
  grafica: DiaGrafica[];
  sesionesRecientes: SesionReciente[];
  insight: string;
};

export function getResumen(userId: number): Promise<Resumen> {
  return apiGet<Resumen>(`/pomodoro/resumen/${userId}`);
}

export function logSesion(userId: number, tiempoTrabajo: number, tiempoDescanso = 0): Promise<void> {
  return apiPost('/pomodoro', { userId, tiempoTrabajo, tiempoDescanso });
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
