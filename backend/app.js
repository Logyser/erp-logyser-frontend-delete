const express = require('express');
const cors = require('cors');           // <-- Primero require express y luego cors
const bodyParser = require('body-parser');
const actasController = require('./controllers/actasController');
const app = express();                  // <-- Crea el objeto app aquí

app.use(cors());                        // <-- Ahora esto funciona correctamente
app.use(bodyParser.json({ limit: '5mb' })); // para aceptar imágenes grandes en base64
app.use('/api/actas', actasController);

app.listen(3000, () => console.log('API corriendo en puerto 3000'));