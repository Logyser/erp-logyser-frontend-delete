/**
 * Controller: encuestasController
 * Rutas:
 *  - POST  /api/encuestas/submit     -> guarda respuesta (ya existente)
 *  - GET   /api/encuestas/lookup     -> busca nombre del trabajador en Maestro_Vinculación
 *  - GET   /api/encuestas/check      -> verifica si ya respondió esta identificación en el mes actual (Bogotá UTC-5)
 *
 * Nota: mover credenciales a variables de entorno en producción.
 */
const express = require('express');
const mysql = require('mysql2/promise');
const router = express.Router();

// Configuración de DB (usar variables de entorno en producción)
const dbConfig = {
  host: process.env.DB_HOST || '34.162.109.112',
  port: process.env.DB_PORT || 3307,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || 'Logyser2025',
  database: process.env.DB_NAME || 'Desplegables',
};

const pool = mysql.createPool({ ...dbConfig, waitForConnections: true, connectionLimit: 10, queueLimit: 0 });

// utilitarios
function toNullableInt(v, min = 1, max = 5) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  if (Number.isNaN(n)) return null;
  if (n < min || n > max) return null;
  return n;
}
function getClientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (xff) return String(xff).split(',')[0].trim();
  return req.connection?.remoteAddress || req.socket?.remoteAddress || req.ip || null;
}

/**
 * GET /lookup?identificacion=XXXX
 * Devuelve { trabajador: 'Nombre Apellido' } o { trabajador: null }.
 */
router.get('/lookup', async (req, res) => {
  const identificacion = (req.query.identificacion || '').trim();
  if (!identificacion) return res.status(400).json({ error: 'identificacion requerida' });

  let conn;
  try {
    conn = await pool.getConnection();
    // Ajusta nombres de tabla/columnas si tu esquema no tiene tildes/espacios.
    const [rows] = await conn.execute(
      'SELECT `Trabajador` FROM `Maestro_Vinculación` WHERE `Identificación` = ? LIMIT 1',
      [identificacion]
    );
    conn.release();
    if (rows && rows.length) {
      return res.json({ trabajador: rows[0].Trabajador || null });
    } else {
      return res.json({ trabajador: null });
    }
  } catch (err) {
    if (conn) conn.release();
    console.error('Error lookup identificacion:', err);
    return res.status(500).json({ error: 'error interno' });
  }
});

/**
 * GET /check?identificacion=XXXX
 * Verifica si ya existe una respuesta para la identificación en el mes/año actual (hora Bogotá UTC-5).
 * Devuelve { exists: true|false }
 */
router.get('/check', async (req, res) => {
  const identificacion = (req.query.identificacion || '').trim();
  if (!identificacion) return res.status(400).json({ error: 'identificacion requerida' });

  let conn;
  try {
    conn = await pool.getConnection();
    // Usamos mes_registro y ano_registro calculados por trigger (basados en UTC_TIMESTAMP() - INTERVAL 5 HOUR)
    const [rows] = await conn.execute(
      `SELECT COUNT(1) AS cnt
       FROM Dynamic_Encuesta_Satisfaccion
       WHERE identificacion = ?
         AND mes_registro = MONTH(UTC_TIMESTAMP() - INTERVAL 5 HOUR)
         AND ano_registro = YEAR(UTC_TIMESTAMP() - INTERVAL 5 HOUR)`,
      [identificacion]
    );
    conn.release();
    const exists = rows && rows[0] && rows[0].cnt > 0;
    return res.json({ exists });
  } catch (err) {
    if (conn) conn.release();
    console.error('Error check encuesta:', err);
    return res.status(500).json({ error: 'error interno' });
  }
});

/**
 * POST /submit
 * Guarda la respuesta en Dynamic_Encuesta_Satisfaccion.
 * El trigger en BD debe calcular fecha_registro, mes_registro y ano_registro.
 */
router.post('/submit', async (req, res) => {
  const payload = req.body || {};
  if (!payload.identificacion) return res.status(400).json({ error: 'identificacion es requerida' });

  const values = {
    identificacion: String(payload.identificacion).trim(),
    clima_companeros: toNullableInt(payload.clima_companeros),
    clima_respetado: toNullableInt(payload.clima_respetado),
    clima_seguro: toNullableInt(payload.clima_seguro),
    clima_tranquilo: toNullableInt(payload.clima_tranquilo),
    clima_herramientas: toNullableInt(payload.clima_herramientas),
    clima_carga_adecuada: toNullableInt(payload.clima_carga_adecuada),
    jefe_respeta: toNullableInt(payload.jefe_respeta),
    jefe_reconoce: toNullableInt(payload.jefe_reconoce),
    jefe_escucha: toNullableInt(payload.jefe_escucha),
    jefe_apoyo: toNullableInt(payload.jefe_apoyo),
    jefe_ejemplo: toNullableInt(payload.jefe_ejemplo),
    jefe_objetivos: toNullableInt(payload.jefe_objetivos),
    comunicacion_oportuna: toNullableInt(payload.comunicacion_oportuna),
    comunicacion_turnos: toNullableInt(payload.comunicacion_turnos),
    comunicacion_ideas: toNullableInt(payload.comunicacion_ideas),
    comunicacion_instrucciones: toNullableInt(payload.comunicacion_instrucciones),
    comunicacion_canales: toNullableInt(payload.comunicacion_canales),
    motivacion_trabajar_diario: toNullableInt(payload.motivacion_trabajar_diario),
    motivacion_logyser: toNullableInt(payload.motivacion_logyser),
    motivacion_orgullo: toNullableInt(payload.motivacion_orgullo),
    motivacion_continuar: toNullableInt(payload.motivacion_continuar),
    motivacion_formacion: toNullableInt(payload.motivacion_formacion),
    compensacion_justa: toNullableInt(payload.compensacion_justa),
    compensacion_puntual: toNullableInt(payload.compensacion_puntual),
    compensacion_reconocimiento: toNullableInt(payload.compensacion_reconocimiento),
    logyser_recomendar: toNullableInt(payload.logyser_recomendar, 0, 10),
    logyser_gusto: payload.logyser_gusto || null,
    logyser_mejorar: payload.logyser_mejorar || null,
    ip_origen: getClientIp(req),
    user_agent: req.get('User-Agent') || null
  };

  let conn;
  try {
    conn = await pool.getConnection();

    const insertCols = [];
    const placeholders = [];
    const insertValues = [];

    for (const [k, v] of Object.entries(values)) {
      if (v !== undefined) {
        insertCols.push('`' + k + '`');
        placeholders.push('?');
        insertValues.push(v);
      }
    }

    const sql = `INSERT INTO Dynamic_Encuesta_Satisfaccion (${insertCols.join(',')}) VALUES (${placeholders.join(',')})`;
    try {
      await conn.execute(sql, insertValues);
      conn.release();
      return res.json({ message: 'Encuesta registrada' });
    } catch (err) {
      conn.release();
      if (err && err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ error: 'Ya existe una respuesta registrada para esta identificación en el mes actual.' });
      } else {
        console.error('Error insert encuesta:', err);
        return res.status(500).json({ error: 'Error al guardar la encuesta' });
      }
    }
  } catch (err) {
    if (conn) conn.release();
    console.error('Pool error:', err);
    return res.status(500).json({ error: 'Error de conexión a la base de datos' });
  }
});

module.exports = router;