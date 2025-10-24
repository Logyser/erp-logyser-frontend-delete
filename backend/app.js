const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const actasController = require('./controllers/actasController');
const encuestasController = require('./controllers/encuestasController');

const app = express();

app.use(cors());
app.use(bodyParser.json({ limit: '5mb' })); // para aceptar imágenes grandes en base64
app.use('/api/actas', actasController);
app.use('/api/encuestas', encuestasController);

app.listen(3000, () => console.log('API corriendo en puerto 3000'));
