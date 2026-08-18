import { Platform } from 'react-native';

// El emulador de Android no puede resolver "localhost" hacia el host,
// usa la IP especial 10.0.2.2. iOS/web simulator sí resuelven localhost.
// En un dispositivo físico habría que sustituir esto por la IP de tu
// máquina en la red local (ej. http://192.168.1.X:4000).
const LOCAL_HOST = Platform.select({ android: '10.0.2.2', default: 'localhost' });
export const API_URL = `http://${LOCAL_HOST}:4000`;

export class ApiError extends Error {}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError('No se pudo conectar con el servidor');
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(data.message ?? 'Algo salió mal');
  }

  return data as T;
}
