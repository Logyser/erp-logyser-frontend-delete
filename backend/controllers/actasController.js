/**
 * Controlador para actas de entrega:
 * - Sube firma al bucket y actualiza Firma_Empleado usando IdDotación como carpeta
 * - Expone endpoint de consulta de acta por IdEntrega (GET /detalle)
 *
 * Responsable: Equipo backend Logyser
 * Última actualización: 2025-10-13
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
 * POST /generar-acta-pdf
 * Recibe: { idEntrega }
 * Genera el PDF del acta usando Puppeteer, lo guarda en el bucket talenthub_central en la carpeta del trabajador,
 * y actualiza la columna Url_Acta en la base de datos.
 */

const puppeteer = require('puppeteer'); // Agrega arriba junto con otros require

router.post('/generar-acta-pdf', async (req, res) => {
  let connection;
  try {
    const { idEntrega } = req.body;
    if (!idEntrega) {
      return res.status(400).json({ error: 'Falta el parámetro idEntrega' });
    }

    connection = await mysql.createConnection(dbConfig);

    // 1. Obtener los datos del acta
    const [rows] = await connection.execute(
      'SELECT * FROM Dynamic_Entrega_Dotacion WHERE IdEntrega = ? LIMIT 1',
      [idEntrega]
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'No se encontró el registro para ese IdEntrega.' });
    }
    const acta = rows[0];
    const idDotacion = acta.IdDotación;

    // 2. Renderiza el HTML del acta (puedes mejorar la plantilla)
    const html = `
      <html>
      <head>
        <meta charset="utf-8">
        <title>Acta de Entrega</title>
        <style>
          body { font-family: Arial; margin: 30px; color: #333; }
          h1 { color: #000b59; }
          .dato { margin: 6px 0; }
          .firma { margin-top: 40px; }
          img.firma { max-width: 320px; max-height: 120px; border: 1px solid #ddd; }
        </style>
      </head>
      <body>
        <h1>CONSTANCIA DE ENTREGA</h1>
        <div class="dato"><b>Trabajador:</b> ${acta.Trabajador || ""}</div>
        <div class="dato"><b>Operación:</b> ${acta.Operación || ""}</div>
        <div class="dato"><b>Fecha de Ingreso:</b> ${acta.Fecha_Ingreso ? new Date(acta.Fecha_Ingreso).toLocaleDateString('es-CO') : ""}</div>
        <div class="dato"><b>Fecha de Entrega:</b> ${acta.Fecha_Entrega ? new Date(acta.Fecha_Entrega).toLocaleDateString('es-CO') : ""}</div>
        <div class="dato"><b>IdDotación:</b> ${acta.IdDotación}</div>
        <div class="dato"><b>IdEntrega:</b> ${acta.IdEntrega}</div>
        <div class="dato"><b>Acta No.:</b> ${acta.Acta_Entrega || ""}</div>
        <div class="dato"><b>Categoría:</b> ${acta.Categoria || ""}</div>
        <div class="dato"><b>Observaciones:</b> ${acta.Observaciones || ""}</div>

        <div class="firma">
          <b>Firma del trabajador:</b><br/>
          ${acta.Firma_Empleado ? `<img class="firma" src="${acta.Firma_Empleado}"/>` : '<em>No registrada</em>'}
        </div>
      </body>
      </html>
    `;

    // 3. Genera el PDF usando Puppeteer
    const browser = await puppeteer.launch({ args: ['--no-sandbox'] }); // Cloud Run requiere --no-sandbox
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();

    // 4. Guarda el PDF en Cloud Storage
    const bucketPdf = new Storage().bucket('talenthub_central');
    const pdfFileName = `${idDotacion}/${idDotacion}_ACT_${idEntrega}.pdf`;
    const file = bucketPdf.file(pdfFileName);
    await file.save(pdfBuffer, { contentType: 'application/pdf', resumable: false, public: true });

    const publicUrl = `https://storage.googleapis.com/talenthub_central/${pdfFileName}`;

    // 5. Actualiza la columna Url_Acta en la base
    await connection.execute(
      'UPDATE Dynamic_Entrega_Dotacion SET Url_Acta = ? WHERE IdEntrega = ?',
      [publicUrl, idEntrega]
    );

    res.json({ url: publicUrl, message: `PDF generado y almacenado en ${publicUrl}` });
  } catch (err) {
    console.error('Error generando o subiendo PDF:', err);
    res.status(500).json({ error: 'Error al generar o subir el PDF.' });
  } finally {
    if (connection) await connection.end();
  }
});

/**
 * POST /upload-firma
 * Recibe: { firma, idEntrega }
 * Sube la firma al bucket en la carpeta del IdDotación y actualiza Firma_Empleado en la base de datos.
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
      'SELECT IdDotación, Firma_Empleado FROM Dynamic_Entrega_Dotacion WHERE IdEntrega = ? LIMIT 1',
      [idEntrega]
    );

    if (!rows.length) {
      await connection.end();
      return res.status(404).json({ error: 'No se encontró el registro para ese IdEntrega.' });
    }
    if (rows[0].Firma_Empleado) {
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
    const publicUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;

    // 3. Actualizar la URL de la firma en la base de datos (ahora en Firma_Empleado)
    const [result] = await connection.execute(
      'UPDATE Dynamic_Entrega_Dotacion SET Firma_Empleado = ? WHERE IdEntrega = ?',
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