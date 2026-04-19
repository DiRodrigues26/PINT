const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/badgesController');
const { autenticar } = require('../middleware/autenticar');
const { autorizarPerfis } = require('../middleware/autorizar');

router.use(autenticar);

router.get('/recomendacoes', ctrl.recomendacoesParaMim);
router.get('/',       ctrl.listar);
router.get('/:id',    ctrl.obter);

router.use(autorizarPerfis('Administrador'));
router.post('/',      ctrl.criar);
router.put('/:id',    ctrl.atualizar);
router.delete('/:id', ctrl.eliminar);

module.exports = router;
