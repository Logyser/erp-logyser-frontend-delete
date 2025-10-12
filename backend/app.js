const cors = require('cors');
app.use(cors());
const express = require('express');
const bodyParser = require('body-parser');
const actasController = require('./controllers/actasController');
const app = express();

app.use(bodyParser.json({ limit: '5mb' })); // para aceptar imágenes grandes en base64
app.use('/api/actas', actasController);

app.listen(3000, () => console.log('API corriendo en puerto 3000'));