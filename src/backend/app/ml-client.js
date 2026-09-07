// Cliente para el servicio Python (FastAPI + MiniBatchKMeans) que mantiene
// un modelo de clustering por usuario para personalizar la duración del
// pomodoro. Ver src/API/main.py.
const ML_API_URL = process.env.ML_API_URL ?? 'http://localhost:8000';

// En desarrollo, el servicio Python a veces todavía no ha terminado de
// arrancar (o se reinició por --reload) justo cuando llega la primera
// petición, y fetch() falla con un error de red (no una respuesta HTTP). Un
// par de reintentos cortos absorben ese hueco sin tapar errores reales: solo
// reintenta si fetch() lanza (conexión rechazada/inexistente), no si el
// servicio responde con un código de error.
async function fetchConReintento(url, options, intentos = 3, esperaMs = 400) {
  for (let intento = 1; intento <= intentos; intento++) {
    try {
      return await fetch(url, options);
    } catch (err) {
      if (intento === intentos) throw err;
      await new Promise((resolve) => setTimeout(resolve, esperaMs));
    }
  }
}

export async function obtenerCentroides(userId) {
  const res = await fetchConReintento(`${ML_API_URL}/api/get_clusters/${userId}`);
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
  const res = await fetchConReintento(`${ML_API_URL}/api/fin_sesion/${userId}?${params}`, { method: 'POST' });
  if (!res.ok) throw new Error(`El servicio de IA respondió ${res.status}`);
  return res.json();
}
