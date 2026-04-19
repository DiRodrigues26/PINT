const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/eventosController');
const { autenticar } = require('../middleware/autenticar');
const { autorizarPerfis } = require('../middleware/autorizar');

router.use(autenticar);

router.get('/',    ctrl.listar);
router.get('/:id', ctrl.obter);

router.use(autorizarPerfis('Administrador'));
router.post('/',                             ctrl.criar);
router.put('/:id',                           ctrl.atualizar);
router.delete('/:id',                        ctrl.eliminar);
router.post('/:id/requisitos',               ctrl.adicionarRequisito);
router.delete('/:id/requisitos/:idRequisito', ctrl.removerRequisito);

module.exports = router;
