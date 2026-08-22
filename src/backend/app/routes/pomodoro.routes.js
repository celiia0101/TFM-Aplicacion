import { Router } from 'express';
import pool from '../database.js';
import { obtenerCentroides, notificarFinSesion } from '../ml-client.js';

const router = Router();

const DIAS = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];

// El descanso es fijo (no viene del modelo); solo la duración de trabajo se
// personaliza vía el centroide del usuario para ese estado de ánimo.
const DESCANSO_FIJO_MIN = 10;

// Si el servicio de IA (Python) no responde, usamos esto en vez de romper
// la pantalla de Focus. Los índices son los mismos ID_ESTADO de L_ESTADO_ANIMO.
const DURACION_DEFECTO_POR_ESTADO = { 1: 25, 2: 35, 3: 15, 4: 20 };

router.get('/duracion/:userId/:estadoId', async (req, res) => {
  const { userId, estadoId } = req.params;
  // El modelo de scikit-learn indexa sus 4 clústeres en 0-3; nuestros
  // ID_ESTADO van 1-4, así que restamos 1 al llamar al servicio de IA.
  const indiceCentroide = Number(estadoId) - 1;

  let tiempoTrabajo;
  try {
    const clusters = await obtenerCentroides(userId);
    const centroide = clusters[indiceCentroide];
    if (!centroide) throw new Error(`No existe centroide para el índice ${indiceCentroide}`);
    tiempoTrabajo = Math.max(1, Math.round(centroide[0]));
  } catch (err) {
    console.error('No se pudo consultar el servicio de IA, uso valor por defecto:', err.message);
    tiempoTrabajo = DURACION_DEFECTO_POR_ESTADO[estadoId] ?? 25;
  }

  return res.status(200).json({ error: false, tiempoTrabajo, tiempoDescanso: DESCANSO_FIJO_MIN });
});

router.get('/estados-animo', async (_req, res) => {
  try {
    const [estados] = await pool.query(
      'SELECT ID_ESTADO AS id, ESATDO_ANIMO AS estadoAnimo FROM L_ESTADO_ANIMO ORDER BY ID_ESTADO'
    );
    return res.status(200).json({ error: false, estados });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: true, message: 'Error al obtener los estados de ánimo' });
  }
});

// Historial de M_POMODORO agrupado por estado de ánimo: cómo ha ido
// cambiando el centroide (duración de trabajo) del modelo de IA con el
// tiempo, para la pantalla de Perfil.
router.get('/tendencia/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const [filas] = await pool.query(
      `SELECT p.ID_ESTADO AS estadoId, e.ESATDO_ANIMO AS estadoAnimo, p.FECHA AS fecha, p.POMODORO AS tiempoTrabajo
       FROM M_POMODORO p
       JOIN L_ESTADO_ANIMO e ON e.ID_ESTADO = p.ID_ESTADO
       WHERE p.ID_USER = ?
       ORDER BY p.ID_ESTADO, p.FECHA`,
      [userId]
    );

    const porEstado = new Map();
    for (const fila of filas) {
      if (!porEstado.has(fila.estadoId)) {
        porEstado.set(fila.estadoId, { estadoId: fila.estadoId, estadoAnimo: fila.estadoAnimo, puntos: [] });
      }
      porEstado.get(fila.estadoId).puntos.push({ fecha: fila.fecha, tiempoTrabajo: Number(fila.tiempoTrabajo) });
    }

    return res.status(200).json({ error: false, tendencias: Array.from(porEstado.values()) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: true, message: 'Error al obtener la tendencia' });
  }
});

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
  const { userId, tiempoTrabajo, tiempoDescanso = 0, estadoId, ajusteMinutos = 0 } = req.body;

  if (!userId || !tiempoTrabajo) {
    return res.status(400).json({ error: true, message: 'userId y tiempoTrabajo son obligatorios' });
  }

  try {
    await pool.query(
      'INSERT INTO M_TIEMPOS (ID_USER, FECHA, TIEMPO_TRABAJO, TIEMPO_DESCANSO) VALUES (?, NOW(), ?, ?)',
      [userId, tiempoTrabajo, tiempoDescanso]
    );

    // Alimenta el modelo de IA con esta ronda para que el próximo centroide
    // se ajuste, y guarda una foto del centroide resultante en M_POMODORO
    // para poder mostrar la tendencia en el Perfil. Si el servicio Python no
    // está levantado, no bloqueamos el guardado de la sesión por eso.
    // ajusteMinutos viene de la encuesta "¿cómo fue tu ritmo?" en la pantalla
    // de fin de sesión: aunque haya completado la ronda, puede pedir que la
    // próxima sea más corta o más larga, y eso se suma al valor real antes
    // de mandarlo al modelo.
    let centroideInfo = null;
    if (estadoId) {
      try {
        const indiceCentroide = Number(estadoId) - 1;

        let centroidePrevio = null;
        try {
          const clustersPrevios = await obtenerCentroides(userId);
          const centroidePrevioRaw = clustersPrevios[indiceCentroide];
          if (centroidePrevioRaw) centroidePrevio = Math.round(centroidePrevioRaw[0]);
        } catch {
          // Si esto falla seguimos igualmente: solo perdemos el "antes" a mostrar.
        }

        const pomodoroAjustado = Math.max(1, Math.round(tiempoTrabajo + ajusteMinutos));
        const resultado = await notificarFinSesion(userId, {
          pomodoro: pomodoroAjustado,
          totalTime: tiempoTrabajo + tiempoDescanso,
          estresNvl: indiceCentroide,
        });
        const nuevoCentroide = resultado.clusters?.[indiceCentroide];
        if (nuevoCentroide) {
          const centroideNuevoExacto = Number(nuevoCentroide[0].toFixed(2));
          await pool.query('INSERT INTO M_POMODORO (ID_USER, ID_ESTADO, FECHA, POMODORO) VALUES (?, ?, NOW(), ?)', [
            userId,
            estadoId,
            centroideNuevoExacto,
          ]);
          centroideInfo = { antes: centroidePrevio, despues: Math.round(centroideNuevoExacto) };
        }
      } catch (err) {
        console.error('No se pudo actualizar el modelo de IA:', err.message);
      }
    }

    return res.status(201).json({ error: false, centroideInfo });
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
              COALESCE(SUM(TIEMPO_TRABAJO + TIEMPO_DESCANSO), 0) AS tiempoInvertido,
              COUNT(*) AS sesiones
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
      sesionesHoy: Number(hoy.sesiones),
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
