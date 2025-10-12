/**
 * Controlador para actas de entrega: 
 * - Sube firma al bucket y actualiza Url_Firma
 * - Expone endpoint de consulta de acta por IdEntrega (GET /detalle)
 * 
 * Responsable: Equipo backend Logyser
 * Última actualización: 2025-10-12
 */

const { Storage } = require('@google-cloud/storage');
const mysql = require('mysql2/promise');
const express = require('express');
const router = express.Router();

// Configuración del bucket y la base de datos
const bucketName = 'firmas-images';
const storage = new Storage();

const dbConfig = {
  host: '34.162.109.112',
  port: 3307,
  user: 'root',
  password: 'Logyser2025',
  database: 'Desplegables',
};

/**
 * GET /detalle?idEntrega=xxxx
 * Devuelve todos los datos del acta para el IdEntrega dado.
 */
router.get('/detalle', async (req, res) => {
  let connection;
  try {
    const { idEntrega } = req.query;
    if (!idEntrega) {
      return res.status(400).json({ error: 'Falta el parámetro idEntrega' });
    }

    connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(
      'SELECT * FROM Dynamic_Entrega_Dotacion WHERE IdEntrega = ? LIMIT 1',
      [idEntrega]
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'No se encontró el registro para ese IdEntrega' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Error consultando acta:', err);
    res.status(500).json({ error: 'Error al consultar el acta' });
  } finally {
    if (connection) await connection.end();
  }
});

/**
 * POST /upload-firma
 * Recibe: { firma, trabajador, idEntrega }
 * Sube la firma y actualiza la columna Url_Firma si no existe ya una firma.
 */
router.post('/upload-firma', async (req, res) => {
  let connection;
  try {
    const { firma, trabajador, idEntrega } = req.body;
    if (!firma || !trabajador || !idEntrega) {
      return res.status(400).json({ error: 'Faltan datos requeridos (firma, trabajador, idEntrega)' });
    }

    connection = await mysql.createConnection(dbConfig);

    // 1. Chequear si ya hay firma
    const [rows] = await connection.execute(
      'SELECT Url_Firma FROM Dynamic_Entrega_Dotacion WHERE IdEntrega = ? LIMIT 1',
      [idEntrega]
    );

    if (rows.length > 0 && rows[0].Url_Firma) {
      await connection.end();
      return res.status(409).json({ error: 'Acta ya firmada. No se puede volver a firmar.' });
    }

    // Extrae el base64 y convierte a buffer
    const base64Data = firma.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    // Ruta: firmas/{numeroDocumento}/{idEntrega}_firma.png
    const fileName = `firmas/${trabajador}/${idEntrega}_firma.png`;
    const file = storage.bucket(bucketName).file(fileName);

    // Sube la firma al bucket
    await file.save(buffer, { contentType: 'image/png', public: true, resumable: false });
    await file.makePublic();
    const publicUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;

    // Actualiza la URL de la firma en la base de datos
    const [result] = await connection.execute(
      'UPDATE Dynamic_Entrega_Dotacion SET Url_Firma = ? WHERE IdEntrega = ?',
      [publicUrl, idEntrega]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'No se encontró el registro para actualizar en Dynamic_Entrega_Dotacion.' });
    }

    res.json({ url: publicUrl, message: 'Firma cargada y URL registrada en base de datos.' });
  } catch (err) {
    console.error('Error subiendo firma o actualizando BD:', err);
    res.status(500).json({ error: 'Error al subir la firma o actualizar la base de datos.' });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
});

module.exports = router;