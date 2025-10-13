/**
 * Controlador para actas de entrega: 
 * - Sube firma al bucket y actualiza Url_Firma usando IdDotación como carpeta
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
 * Recibe: { firma, idEntrega }
 * Sube la firma al bucket en la carpeta del IdDotación y actualiza Url_Firma en la base de datos.
 */
router.post('/upload-firma', async (req, res) => {
  let connection;
  try {
    const { firma, idEntrega } = req.body;
    if (!firma || !idEntrega) {
      return res.status(400).json({ error: 'Faltan datos requeridos (firma, idEntrega)' });
    }

    connection = await mysql.createConnection(dbConfig);

    // 1. Buscar el IdDotación y si ya hay firma
    const [rows] = await connection.execute(
      'SELECT IdDotación, Url_Firma FROM Dynamic_Entrega_Dotacion WHERE IdEntrega = ? LIMIT 1',
      [idEntrega]
    );

    if (!rows.length) {
      await connection.end();
      return res.status(404).json({ error: 'No se encontró el registro para ese IdEntrega.' });
    }
    if (rows[0].Url_Firma) {
      await connection.end();
      return res.status(409).json({ error: 'Acta ya firmada. No se puede volver a firmar.' });
    }
    const idDotacion = rows[0].IdDotación;

    // 2. Guardar la firma en el bucket usando IdDotación como carpeta
    const base64Data = firma.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const fileName = `firmas/${idDotacion}/${idEntrega}_firma.png`;
    const file = storage.bucket(bucketName).file(fileName);
    console.log('Recibido idEntrega:', idEntrega);
    console.log('Longitud de firma (base64):', firma.length);
    console.log('Base64 inicia:', firma.slice(0, 30));
    console.log('Buffer length:', buffer.length);

    await file.save(buffer, { contentType: 'image/png', resumable: false });
    // No llames a file.makePublic() ni uses { public: true }
    const publicUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;

    // 3. Actualizar la URL de la firma en la base de datos
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