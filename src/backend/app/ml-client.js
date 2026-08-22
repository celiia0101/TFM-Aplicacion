// Cliente para el servicio Python (FastAPI + MiniBatchKMeans) que mantiene
// un modelo de clustering por usuario para personalizar la duración del
// pomodoro. Ver src/API/main.py.
const ML_API_URL = process.env.ML_API_URL ?? 'http://localhost:8000';

export async function obtenerCentroides(userId) {
  const res = await fetch(`${ML_API_URL}/api/get_clusters/${userId}`);
  if (!res.ok) throw new Error(`El servicio de IA respondió ${res.status}`);
  const data = await res.json();
  return data.clusters;
}

export async function notificarFinSesion(userId, { pomodoro, totalTime, estresNvl }) {
  const params = new URLSearchParams({
    pomodoro: String(pomodoro),
    totalTime: String(totalTime),
    estresNvl: String(estresNvl),
  });
  const res = await fetch(`${ML_API_URL}/api/fin_sesion/${userId}?${params}`, { method: 'POST' });
  if (!res.ok) throw new Error(`El servicio de IA respondió ${res.status}`);
  return res.json();
}
