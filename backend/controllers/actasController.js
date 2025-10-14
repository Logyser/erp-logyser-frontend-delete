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

    // --- Agregado: consulta de ítems de la entrega ---
    const [items] = await connection.execute(
      'SELECT Elemento, Cantidad, Nota FROM Dynamic_Entrega_Dotacion_Items WHERE IdEntrega = ?',
      [idEntrega]
    );

    const itemsHtml = items.length
      ? items.map(it =>
          `<tr><td>${it.Elemento}</td><td>${it.Cantidad}</td><td>${it.Nota || ''}</td></tr>`
        ).join('')
      : '<tr><td colspan="3">Sin elementos registrados.</td></tr>';

    // --- Devuelve el acta, items y el HTML de la tabla de items ---
    res.json({
      ...rows[0],
      Items: items,
      ItemsHtml: itemsHtml
    });

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
/**
 * POST /upload-firma
 * Recibe: { firma, idEntrega }
 * Sube la firma al bucket en la carpeta del IdDotación y actualiza Firma_Empleado en la base de datos.
 */
router.post('/generar-acta-pdf', async (req, res) => {
  let connection;
  try {
    const { idEntrega } = req.body;
    console.log('Recibido POST /generar-acta-pdf', { idEntrega });
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
  return res.status(404).json({ error: 'No se encontró el registro para ese IdEntrega' });
}

const [items] = await connection.execute(
  'SELECT Elemento, Cantidad, Nota FROM Dynamic_Entrega_Dotacion_Items WHERE IdEntrega = ?',
  [idEntrega]
);

const itemsHtml = items.length
  ? items.map(it =>
      `<tr><td>${it.Elemento}</td><td>${it.Cantidad}</td><td>${it.Nota || ''}</td></tr>`
    ).join('')
  : '<tr><td colspan="3">Sin elementos registrados.</td></tr>';

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
      table { border-collapse: collapse; width: 100%; margin-top: 20px; }
      th, td { border: 1px solid #ddd; padding: 8px; }
      th { background: #000b59; color: #fff; }
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

    <!-- Aquí va la tabla de elementos entregados -->
    <table>
      <thead>
        <tr>
          <th>Elemento</th>
          <th>Cantidad</th>
          <th>Nota</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <div class="firma">
      <b>Firma del trabajador:</b><br/>
      ${acta.Firma_Empleado ? `<img class="firma" src="${acta.Firma_Empleado}"/>` : '<em>No registrada</em>'}
    </div>
  </body>
  </html>
`;

    // 3. Genera el PDF usando Puppeteer
    console.log('Abriendo Puppeteer...');
    const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
    console.log('Puppeteer lanzado, abriendo página...');
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();
    console.log('PDF generado, subiendo a bucket...');

    // 4. Guarda el PDF en Cloud Storage
    const bucketPdf = new Storage().bucket('talenthub_central');
    const pdfFileName = `${idDotacion}/${idDotacion}_ACT_${idEntrega}.pdf`;
    const file = bucketPdf.file(pdfFileName);
    await file.save(pdfBuffer, { contentType: 'application/pdf', resumable: false });
    console.log('PDF subido, actualizando BD...');

    const publicUrl = `https://storage.googleapis.com/talenthub_central/${pdfFileName}`;

    // 5. Actualiza la columna Url_Acta en la base
    await connection.execute(
      'UPDATE Dynamic_Entrega_Dotacion SET Url_Acta = ? WHERE IdEntrega = ?',
      [publicUrl, idEntrega]
    );
    console.log('Todo OK, respondiendo al cliente');

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
 * Sube la firma al bucket y actualiza Firma_Empleado en la base de datos.
 */
router.post('/upload-firma', async (req, res) => {
  let connection;
  try {
    const { firma, idEntrega } = req.body;
    if (!firma || !idEntrega) {
      return res.status(400).json({ error: 'Falta firma o idEntrega' });
    }

    connection = await mysql.createConnection(dbConfig);
    // 1. Buscar el acta para obtener IdDotación
    const [rows] = await connection.execute(
      'SELECT IdDotación FROM Dynamic_Entrega_Dotacion WHERE IdEntrega = ? LIMIT 1',
      [idEntrega]
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'No se encontró el registro para ese IdEntrega' });
    }
    const idDotacion = rows[0].IdDotación;

    // 2. Subir la firma al bucket
    // Extrae solo el contenido base64 (sin el prefijo data:image/png;base64,)
    const matches = firma.match(/^data:image\/png;base64,(.+)$/);
    if (!matches) {
      return res.status(400).json({ error: 'Formato de firma inválido' });
    }
    const buffer = Buffer.from(matches[1], 'base64');
    const fileName = `${idDotacion}/firma_${idEntrega}.png`;
    const file = storage.bucket(bucketName).file(fileName);
    await file.save(buffer, { contentType: 'image/png', resumable: false });

    const publicUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;

    // 3. Actualizar la base de datos
    await connection.execute(
      'UPDATE Dynamic_Entrega_Dotacion SET Firma_Empleado = ? WHERE IdEntrega = ?',
      [publicUrl, idEntrega]
    );

    res.json({ url: publicUrl, message: 'Firma subida correctamente' });
  } catch (err) {
    console.error('Error subiendo la firma:', err);
    res.status(500).json({ error: 'Error al subir la firma' });
  } finally {
    if (connection) await connection.end();
  }
});
module.exports = router;