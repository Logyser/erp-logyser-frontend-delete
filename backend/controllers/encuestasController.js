/**
 * Controller: encuestasController
 * Endpoint: POST /api/encuestas/submit
 *
 * Nota de seguridad: configura las credenciales vía variables de entorno en producción.
 */
const express = require('express');
const mysql = require('mysql2/promise');
const router = express.Router();

// Configuración de DB: preferible desde variables de entorno
const dbConfig = {
  host: process.env.DB_HOST || '34.162.109.112',
  port: process.env.DB_PORT || 3307,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || 'Logyser2025',
  database: process.env.DB_NAME || 'Desplegables',
  // opcional: connectionLimit si se usa pool
};

const pool = mysql.createPool({...dbConfig, waitForConnections:true, connectionLimit:10, queueLimit:0});

// Lista de columnas que aceptamos (en el mismo orden para el INSERT)
const surveyColumns = [
  'identificacion','regional','operacion','trabajador','fecha_ingreso','fecha_registro','mes_registro','ano_registro',
  'clima_companeros','clima_respetado','clima_seguro','clima_tranquilo','clima_herramientas','clima_carga_adecuada',
  'jefe_respeta','jefe_reconoce','jefe_escucha','jefe_apoyo','jefe_ejemplo','jefe_objetivos',
  'comunicacion_oportuna','comunicacion_turnos','comunicacion_ideas','comunicacion_instrucciones','comunicacion_canales',
  'motivacion_trabajar_diario','motivacion_logyser','motivacion_orgullo','motivacion_continuar','motivacion_formacion',
  'compensacion_justa','compensacion_puntual','compensacion_reconocimiento',
  'logyser_recomendar','logyser_gusto','logyser_mejorar','ip_origen','user_agent'
];

// POST /submit
router.post('/submit', async (req, res) => {
  const payload = req.body || {};
  if (!payload.identificacion) return res.status(400).json({ error: 'identificacion es requerida' });

  // Construir objeto con columnas que vamos a insertar (omitimos fecha_registro/mes/ano para que el trigger las calcule)
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
    // ip and user-agent: opcional; captura desde request (no desde cliente)
    ip_origen: getClientIp(req),
    user_agent: req.get('User-Agent') || null
  };

  // Verificamos que al menos haya alguna respuesta (opcional)
  try {
    const conn = await pool.getConnection();

    // Insert: construimos dinamicamente la lista de columnas/values que no son undefined
    const insertCols = [];
    const placeholders = [];
    const insertValues = [];

    // Insertamos identificacion y todas las columnas anteriores (el trigger calculará fecha_registro/mes/ano)
    for (const [k, v] of Object.entries(values)){
      if (v !== undefined) {
        insertCols.push('`' + k + '`');
        placeholders.push('?');
        insertValues.push(v);
      }
    }

    // Añadimos fecha_registro = NULL (para que trigger lo calcule). No es estrictamente necesario si trigger detecta NULL.
    // Ejecutamos INSERT
    const sql = `INSERT INTO Dynamic_Encuesta_Satisfaccion (${insertCols.join(',')}) VALUES (${placeholders.join(',')})`;
    try {
      await conn.execute(sql, insertValues);
      res.json({ message: 'Encuesta registrada' });
    } catch (err) {
      // Si falla por unique key (duplicado ident/mes/ano) devolvemos 409
      if (err && err.code === 'ER_DUP_ENTRY') {
        res.status(409).json({ error: 'Ya existe una respuesta registrada para esta identificación en el mes actual.' });
      } else {
        console.error('Error insert encuesta:', err);
        res.status(500).json({ error: 'Error al guardar la encuesta' });
      }
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error('Pool error:', err);
    res.status(500).json({ error: 'Error de conexión a la base de datos' });
  }
});

// utilitarios
function toNullableInt(v, min=1, max=5){
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  if (Number.isNaN(n)) return null;
  if (n < min || n > max) return null;
  return n;
}
function getClientIp(req){
  const xff = req.headers['x-forwarded-for'];
  if (xff) return String(xff).split(',')[0].trim();
  return req.connection?.remoteAddress || req.socket?.remoteAddress || req.ip || null;
}

module.exports = router;