const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/notificacoesController');
const { autenticar } = require('../middleware/autenticar');

router.use(autenticar);

router.get('/',               ctrl.listarMinhas);
router.post('/ler-todas',     ctrl.marcarTodasLidas);
router.post('/arquivar-lidas', ctrl.arquivarLidas);
router.post('/:id/ler',       ctrl.marcarLida);
router.delete('/:id',         ctrl.eliminar);

module.exports = router;
