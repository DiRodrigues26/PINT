const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/preferenciasController');
const { autenticar } = require('../middleware/autenticar');

router.use(autenticar);
router.get('/',  ctrl.obterMinhas);
router.put('/',  ctrl.atualizarMinhas);

module.exports = router;
