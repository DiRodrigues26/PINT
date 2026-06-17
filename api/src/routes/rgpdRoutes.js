const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/rgpdController');
const { autenticar } = require('../middleware/autenticar');
const { autorizarPerfis } = require('../middleware/autorizar');

router.use(autenticar);

router.get('/politica-ativa', ctrl.obterPoliticaAtiva);

router.get('/politicas',
  autorizarPerfis('Administrador'),
  ctrl.listarPoliticas
);
router.post('/politicas',
  autorizarPerfis('Administrador'),
  ctrl.criarPolitica
);
router.put('/politicas/:id',
  autorizarPerfis('Administrador'),
  ctrl.atualizarPolitica
);
router.delete('/politicas/:id',
  autorizarPerfis('Administrador'),
  ctrl.eliminarPolitica
);

router.get('/',  ctrl.listarMeus);
router.post('/', ctrl.registar);

module.exports = router;
