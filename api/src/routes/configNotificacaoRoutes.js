const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/configNotificacaoController');
const { autenticar } = require('../middleware/autenticar');
const { autorizarPerfis } = require('../middleware/autorizar');

router.use(autenticar);
router.use(autorizarPerfis('Administrador'));

router.get('/',       ctrl.obter);
router.put('/',       ctrl.atualizar);
router.post('/teste', ctrl.enviarTeste);

module.exports = router;
