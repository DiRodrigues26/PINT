const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/slaController');
const { autenticar } = require('../middleware/autenticar');
const { autorizarPerfis } = require('../middleware/autorizar');

router.use(autenticar, autorizarPerfis('Administrador'));

router.get('/',             ctrl.listar);
router.put('/:fase',        ctrl.atualizar);
router.get('/fora-prazo',   ctrl.candidaturasForaSLA);

module.exports = router;
