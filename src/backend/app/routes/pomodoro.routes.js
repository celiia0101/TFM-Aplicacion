import { Router } from 'express';
import pool from '../database.js';

const router = Router();

const DIAS = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];

function franjaDeHora(hora) {
  if (hora >= 5 && hora <= 11) return 'mañana';
  if (hora >= 12 && hora <= 18) return 'tarde';
  return 'noche'; // 19-23 o 0-4
}

const ARTICULO_FRANJA = { mañana: 'la mañana', tarde: 'la tarde', noche: 'la noche' };

// Insight heurístico (no ML todavía): compara, para cada franja horaria en la
// que el usuario ha tenido sesiones, su concentración media (trabajo real
// frente a trabajo+descanso) y destaca la franja donde mejor rinde.
function calcularInsight(sesiones) {
  if (sesiones.length < 3) {
    return 'Sigue registrando sesiones para que podamos mostrarte cuándo rindes mejor.';
  }

  const porFranja = {
    mañana: { trabajo: 0, total: 0 },
    tarde: { trabajo: 0, total: 0 },
    noche: { trabajo: 0, total: 0 },
  };

  for (const sesion of sesiones) {
    const franja = franjaDeHora(sesion.hora);
    porFranja[franja].trabajo += sesion.tiempoTrabajo;
    porFranja[franja].total += sesion.tiempoTrabajo + sesion.tiempoDescanso;
  }

  let mejor = null;
  for (const [franja, datos] of Object.entries(porFranja)) {
    if (datos.total === 0) continue;
    const concentracion = datos.trabajo / datos.total;
    if (!mejor || concentracion > mejor.concentracion) {
      mejor = { franja, concentracion };
    }
  }

  if (!mejor) {
    return 'Sigue registrando sesiones para que podamos mostrarte cuándo rindes mejor.';
  }

  const porcentaje = Math.round(mejor.concentracion * 100);
  return `Sueles concentrarte mejor por ${ARTICULO_FRANJA[mejor.franja]} (${porcentaje}% de concentración media).`;
}

router.post('/', async (req, res) => {
  const { userId, tiempoTrabajo, tiempoDescanso = 0 } = req.body;

  if (!userId || !tiempoTrabajo) {
    return res.status(400).json({ error: true, message: 'userId y tiempoTrabajo son obligatorios' });
  }

  try {
    await pool.query(
      'INSERT INTO M_TIEMPOS (ID_USER, FECHA, TIEMPO_TRABAJO, TIEMPO_DESCANSO) VALUES (?, NOW(), ?, ?)',
      [userId, tiempoTrabajo, tiempoDescanso]
    );
    return res.status(201).json({ error: false });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: true, message: 'Error al guardar la sesión' });
  }
});

router.get('/resumen/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const [[hoy]] = await pool.query(
      `SELECT COALESCE(SUM(TIEMPO_TRABAJO), 0) AS tiempoTrabajo,
              COALESCE(SUM(TIEMPO_TRABAJO + TIEMPO_DESCANSO), 0) AS tiempoInvertido
       FROM M_TIEMPOS
       WHERE ID_USER = ? AND DATE(FECHA) = CURDATE()`,
      [userId]
    );

    // DATE_FORMAT devuelve la fecha ya como string: si dejamos que mysql2 la
    // convierta a objeto Date y luego usamos toISOString() (UTC), el día se
    // desplaza hacia atrás en cualquier timezone con offset positivo (p.ej. CEST).
    const [porDia] = await pool.query(
      `SELECT DATE_FORMAT(FECHA, '%Y-%m-%d') AS fecha, SUM(TIEMPO_TRABAJO) AS trabajo
       FROM M_TIEMPOS
       WHERE ID_USER = ? AND FECHA >= (CURDATE() - INTERVAL 6 DAY)
       GROUP BY DATE_FORMAT(FECHA, '%Y-%m-%d')`,
      [userId]
    );

    const porDiaMap = new Map(porDia.map((fila) => [fila.fecha, Number(fila.trabajo)]));
    const grafica = [];
    for (let i = 6; i >= 0; i--) {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() - i);
      const y = fecha.getFullYear();
      const m = String(fecha.getMonth() + 1).padStart(2, '0');
      const d = String(fecha.getDate()).padStart(2, '0');
      const clave = `${y}-${m}-${d}`;
      grafica.push({
        fecha: clave,
        dia: DIAS[fecha.getDay()],
        trabajo: porDiaMap.get(clave) ?? 0,
      });
    }

    const [sesionesRecientes] = await pool.query(
      `SELECT FECHA AS fecha, TIEMPO_TRABAJO AS tiempoTrabajo, TIEMPO_DESCANSO AS tiempoDescanso
       FROM M_TIEMPOS
       WHERE ID_USER = ?
       ORDER BY FECHA DESC
       LIMIT 5`,
      [userId]
    );

    const [historicoParaInsight] = await pool.query(
      `SELECT HOUR(FECHA) AS hora, TIEMPO_TRABAJO AS tiempoTrabajo, TIEMPO_DESCANSO AS tiempoDescanso
       FROM M_TIEMPOS
       WHERE ID_USER = ?`,
      [userId]
    );

    const tiempoTrabajo = Number(hoy.tiempoTrabajo);
    const tiempoInvertido = Number(hoy.tiempoInvertido);
    const concentracion = tiempoInvertido > 0 ? Math.round((tiempoTrabajo / tiempoInvertido) * 100) : 0;
    const insight = calcularInsight(historicoParaInsight);

    return res.status(200).json({
      error: false,
      tiempoInvertidoHoy: tiempoInvertido,
      tiempoTrabajoHoy: tiempoTrabajo,
      concentracion,
      grafica,
      sesionesRecientes,
      insight,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: true, message: 'Error al obtener el resumen' });
  }
});

export default router;
