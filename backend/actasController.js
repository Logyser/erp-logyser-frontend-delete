const { Storage } = require('@google-cloud/storage');
const express = require('express');
const router = express.Router();

// Configura tu bucket
const bucketName = 'talenthub_central';
const storage = new Storage();

router.post('/upload-firma', async (req, res) => {
  try {
    const { firma, trabajador, idEntrega } = req.body;
    if (!firma || !trabajador || !idEntrega) return res.status(400).json({ error: 'Faltan datos' });

    // Extrae solo el base64 sin el prefijo
    const base64Data = firma.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    // Carpeta por documento (suponiendo trabajador es el número de doc/identificación)
    const fileName = `firmas/${trabajador}/${idEntrega}_firma.png`;
    const file = storage.bucket(bucketName).file(fileName);

    await file.save(buffer, { contentType: 'image/png', public: true, resumable: false });

    // Opcional: hacer el archivo público si no lo es por defecto
    await file.makePublic();

    const publicUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;
    res.json({ url: publicUrl });
  } catch (err) {
    console.error('Error subiendo firma:', err);
    res.status(500).json({ error: 'Error al subir la firma' });
  }
});

module.exports = router;