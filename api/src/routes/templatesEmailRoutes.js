const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/templatesEmailController');
const { autenticar } = require('../middleware/autenticar');
const { autorizarPerfis } = require('../middleware/autorizar');

router.use(autenticar);
router.use(autorizarPerfis('Administrador'));

router.get('/', ctrl.listar);
router.get('/:id', ctrl.obter);
router.post('/', ctrl.criar);
router.put('/:id', ctrl.atualizar);
router.delete('/:id', ctrl.eliminar);

module.exports = router;
