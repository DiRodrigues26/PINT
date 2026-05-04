const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/ficheirosController');
const { autenticar } = require('../middleware/autenticar');
const { uploadMemoria } = require('../middleware/upload');

router.use(autenticar);

router.post('/upload', uploadMemoria.single('ficheiro'), ctrl.carregar);

module.exports = router;
