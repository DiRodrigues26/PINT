const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/candidaturasController');
const ev = require('../controllers/evidenciasController');
const { autenticar } = require('../middleware/autenticar');
const { autorizarPerfis } = require('../middleware/autorizar');
const { upload } = require('../middleware/upload');

router.use(autenticar);

// Consultor
router.post('/',               autorizarPerfis('Consultor', 'Administrador'), ctrl.criar);
router.get('/',                ctrl.listar);
router.get('/:id',             ctrl.obter);
router.get('/:id/historico',   ctrl.historico);

router.post('/:id/submeter',   ctrl.submeter);
router.delete('/:id',          ctrl.cancelar);

// Evidências
router.get('/:id/evidencias',                    ev.listarPorCandidatura);
router.post('/:id/evidencias', upload.single('ficheiro'), ev.carregar);
router.delete('/:id/evidencias/:idEvidencia',    ev.remover);

// Avaliações
router.post('/:id/avaliar-talent',
  autorizarPerfis('Talent Manager', 'Administrador'),
  ctrl.avaliarTalent
);
router.post('/:id/avaliar-service-line',
  autorizarPerfis('Service Line', 'Administrador'),
  ctrl.avaliarServiceLine
);

module.exports = router;
