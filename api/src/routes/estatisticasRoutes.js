const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/estatisticasController');
const { autenticar } = require('../middleware/autenticar');
const { autorizarPerfis } = require('../middleware/autorizar');

router.use(autenticar);

router.get('/consultor', ctrl.dashboardConsultor);
router.get('/ranking',   ctrl.rankingConsultores);
router.get('/pontos',
  autorizarPerfis('Administrador'),
  ctrl.estatisticasPontos
);
router.get('/gestor',
  autorizarPerfis('Administrador', 'Talent Manager', 'Service Line'),
  ctrl.dashboardGestor
);
router.get('/service-line',
  autorizarPerfis('Administrador', 'Service Line'),
  ctrl.dashboardServiceLine
);
router.get('/service-line/historico',
  autorizarPerfis('Administrador', 'Service Line'),
  ctrl.historicoServiceLine
);
router.get('/service-line/relatorio',
  autorizarPerfis('Administrador', 'Service Line'),
  ctrl.relatorioServiceLine
);
router.get('/service-line/consultor/:id',
  autorizarPerfis('Administrador', 'Service Line'),
  ctrl.perfilConsultorSL
);
router.get('/service-line/conquistas',
  autorizarPerfis('Administrador', 'Service Line'),
  ctrl.conquistasServiceLine
);

module.exports = router;
