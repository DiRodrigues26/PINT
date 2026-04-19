const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/estatisticasController');
const { autenticar } = require('../middleware/autenticar');
const { autorizarPerfis } = require('../middleware/autorizar');

router.use(autenticar);

router.get('/consultor', ctrl.dashboardConsultor);
router.get('/ranking',   ctrl.rankingConsultores);
router.get('/gestor',
  autorizarPerfis('Administrador', 'Talent Manager', 'Service Line'),
  ctrl.dashboardGestor
);

module.exports = router;
