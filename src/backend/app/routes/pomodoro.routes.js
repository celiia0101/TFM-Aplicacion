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

// El modelo de IA agrupa sus 4 clústeres por comportamiento real (distancia),
// no por el ID_ESTADO que eligió el usuario, así que el índice de clúster de
// cada ánimo puede migrar con el tiempo según cómo evolucionen los datos: no
// se puede fijar una vez y olvidarse. Lo que sí es estable es el ORDEN
// esperado por duración de trabajo, de menor a mayor: Estresado, Cansado,
// Bien, Puedo con Todo. Cada request recalculamos qué clúster real ocupa
// cada posición de ese ranking.
const POSICION_POR_ESTADO = {
  2: 0, // Estresado -> menor duración
  4: 1, // Cansado
  1: 2, // Bien
  3: 3, // Puedo con Todo -> mayor duración
};

// Ordena los índices de los 4 centroides crudos de menor a mayor duración de
// trabajo (centroide[0]).
function ordenarClustersPorDuracion(clusters) {
  return clusters
    .map((centroide, indice) => ({ indice, duracion: centroide[0] }))
    .sort((a, b) => a.duracion - b.duracion)
    .map((c) => c.indice);
}

// Traduce un ID_ESTADO al índice de clúster real que le corresponde AHORA
// MISMO, según cómo estén ordenados por duración los centroides del usuario.
function indiceClusterParaEstado(clusters, estadoId) {
  const posicion = POSICION_POR_ESTADO[Number(estadoId)];
  if (posicion === undefined) return undefined;
  return ordenarClustersPorDuracion(clusters)[posicion];
}

router.get('/duracion/:userId/:estadoId', async (req, res) => {
  const { userId, estadoId } = req.params;

  let tiempoTrabajo;
  try {
    const clusters = await obtenerCentroides(userId);
    const indiceCentroide = indiceClusterParaEstado(clusters, estadoId);
    const centroide = clusters[indiceCentroide];
    if (!centroide) throw new Error(`No existe centroide para el estado ${estadoId}`);
    // El modelo de IA guarda sus centroides en SEGUNDOS (para no perder
    // precisión frente a minutos enteros); aquí convertimos a minutos, que es
    // lo que espera el frontend.
    tiempoTrabajo = Math.max(1, Math.round(centroide[0] / 60));
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

function comoFechaClave(fecha) {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Días consecutivos (terminando hoy o ayer) con al menos una sesión. Si el
// usuario aún no ha hecho nada hoy pero sí ayer, la racha se sigue contando
// como viva (se rompe solo cuando pasa un día entero sin ninguna sesión).
function calcularRacha(diasConSesion) {
  if (diasConSesion.length === 0) return 0;
  const dias = new Set(diasConSesion);

  const hoy = new Date();
  const ayer = new Date(hoy);
  ayer.setDate(ayer.getDate() - 1);

  let cursor;
  if (dias.has(comoFechaClave(hoy))) cursor = hoy;
  else if (dias.has(comoFechaClave(ayer))) cursor = ayer;
  else return 0;

  let racha = 0;
  while (dias.has(comoFechaClave(cursor))) {
    racha++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return racha;
}

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
  const {
    userId,
    tiempoTrabajo,
    tiempoDescanso = 0,
    estadoId,
    ajusteMinutos = 0,
    tiempoTrabajoSeg,
    tiempoDescansoSeg,
  } = req.body;

  if (!userId || !tiempoTrabajo) {
    return res.status(400).json({ error: true, message: 'userId y tiempoTrabajo son obligatorios' });
  }

  // tiempoTrabajo/tiempoDescanso llegan ya truncados a minutos enteros (así
  // es la columna en M_TIEMPOS), pero para el modelo de IA queremos la
  // precisión real en segundos. Si el cliente no los manda (versiones viejas
  // del frontend), caemos de vuelta a los minutos truncados.
  const trabajoSegExacto = typeof tiempoTrabajoSeg === 'number' ? tiempoTrabajoSeg : tiempoTrabajo * 60;
  const descansoSegExacto = typeof tiempoDescansoSeg === 'number' ? tiempoDescansoSeg : tiempoDescanso * 60;

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
        // Necesitamos los centroides actuales SÍ o SÍ para saber a qué
        // índice de clúster real corresponde este estado de ánimo ahora
        // mismo (puede haber migrado respecto a la última sesión). Si esto
        // falla, no hay forma segura de saber a qué clúster mandar la
        // actualización, así que abortamos el bloque entero (la sesión ya
        // se guardó arriba, solo se pierde la actualización del modelo).
        const clustersPrevios = await obtenerCentroides(userId);
        const indiceCentroide = indiceClusterParaEstado(clustersPrevios, estadoId);
        const centroidePrevioRaw = clustersPrevios[indiceCentroide];
        // Los centroides del modelo ya están en SEGUNDOS: se lo pasamos tal
        // cual al frontend (que sabe formatear "min y seg") en vez de
        // redondear aquí a minutos enteros, que escondería el cambio real
        // cuando el centroide se mueve solo unos segundos.
        const centroidePrevio = centroidePrevioRaw ? Math.round(centroidePrevioRaw[0]) : null;

        // Igual que el tiempo real, el ajuste de la encuesta viene en minutos
        // y hay que pasarlo a segundos antes de sumarlo. Un pomodoro de al
        // menos 1 minuto (60s) para no mandar centroides absurdos si el
        // ajuste negativo dejara el valor en 0 o menos.
        const pomodoroAjustadoSeg = Math.max(60, Math.round(trabajoSegExacto + ajusteMinutos * 60));
        const resultado = await notificarFinSesion(userId, {
          pomodoro: pomodoroAjustadoSeg,
          totalTime: Math.round(trabajoSegExacto + descansoSegExacto),
          estresNvl: indiceCentroide,
        });
        const nuevoCentroide = resultado.clusters?.[indiceCentroide];
        if (nuevoCentroide) {
          // M_POMODORO.POMODORO (para la tendencia del Perfil) se muestra en
          // minutos, así que convertimos de vuelta desde los segundos del modelo.
          const centroideNuevoExactoMin = Number((nuevoCentroide[0] / 60).toFixed(2));
          await pool.query('INSERT INTO M_POMODORO (ID_USER, ID_ESTADO, FECHA, POMODORO) VALUES (?, ?, NOW(), ?)', [
            userId,
            estadoId,
            centroideNuevoExactoMin,
          ]);
          // También en segundos, por la misma razón que centroidePrevio.
          centroideInfo = { antes: centroidePrevio, despues: Math.round(nuevoCentroide[0]) };
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
       ORDER BY FECHA DESC, ID_TIEMPO DESC
       LIMIT 5`,
      [userId]
    );

    const [historicoParaInsight] = await pool.query(
      `SELECT HOUR(FECHA) AS hora, TIEMPO_TRABAJO AS tiempoTrabajo, TIEMPO_DESCANSO AS tiempoDescanso
       FROM M_TIEMPOS
       WHERE ID_USER = ?`,
      [userId]
    );

    // Un año de margen es de sobra para cualquier racha real; evita escanear
    // toda la tabla en cuentas muy antiguas.
    const [diasConSesion] = await pool.query(
      `SELECT DISTINCT DATE_FORMAT(FECHA, '%Y-%m-%d') AS fecha
       FROM M_TIEMPOS
       WHERE ID_USER = ? AND FECHA >= (CURDATE() - INTERVAL 1 YEAR)`,
      [userId]
    );

    const tiempoTrabajo = Number(hoy.tiempoTrabajo);
    const tiempoInvertido = Number(hoy.tiempoInvertido);
    const concentracion = tiempoInvertido > 0 ? Math.round((tiempoTrabajo / tiempoInvertido) * 100) : 0;
    const insight = calcularInsight(historicoParaInsight);
    const rachaDias = calcularRacha(diasConSesion.map((fila) => fila.fecha));

    return res.status(200).json({
      error: false,
      tiempoInvertidoHoy: tiempoInvertido,
      tiempoTrabajoHoy: tiempoTrabajo,
      sesionesHoy: Number(hoy.sesiones),
      concentracion,
      grafica,
      sesionesRecientes,
      insight,
      rachaDias,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: true, message: 'Error al obtener el resumen' });
  }
});

// Estadísticas semanales para la pantalla de Bio-Analytics: concentración y
// tiempo real de enfoque de los últimos 7 días, comparados contra los 7 días
// anteriores para mostrar la tendencia (p.ej. "+2.1h vs. semana pasada").
router.get('/estadisticas/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const [[semanaActual]] = await pool.query(
      `SELECT COALESCE(SUM(TIEMPO_TRABAJO), 0) AS trabajo,
              COALESCE(SUM(TIEMPO_TRABAJO + TIEMPO_DESCANSO), 0) AS total
       FROM M_TIEMPOS
       WHERE ID_USER = ? AND FECHA >= (CURDATE() - INTERVAL 6 DAY)`,
      [userId]
    );

    const [[semanaAnterior]] = await pool.query(
      `SELECT COALESCE(SUM(TIEMPO_TRABAJO), 0) AS trabajo
       FROM M_TIEMPOS
       WHERE ID_USER = ?
         AND FECHA >= (CURDATE() - INTERVAL 13 DAY)
         AND FECHA < (CURDATE() - INTERVAL 6 DAY)`,
      [userId]
    );

    const trabajoSemana = Number(semanaActual.trabajo);
    const totalSemana = Number(semanaActual.total);
    const concentracionSemana = totalSemana > 0 ? Math.round((trabajoSemana / totalSemana) * 100) : 0;

    return res.status(200).json({
      error: false,
      concentracionSemana,
      tiempoEnfoqueSemanaMin: trabajoSemana,
      tiempoEnfoqueSemanaAnteriorMin: Number(semanaAnterior.trabajo),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: true, message: 'Error al obtener las estadísticas' });
  }
});

export default router;
