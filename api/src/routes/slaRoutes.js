const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/slaController');
const { autenticar } = require('../middleware/autenticar');
const { autorizarPerfis } = require('../middleware/autorizar');

router.use(autenticar);

router.get('/',
  autorizarPerfis('Administrador', 'Talent Manager', 'Service Line'),
  ctrl.listar
);
router.get('/fora-prazo',
  autorizarPerfis('Administrador', 'Talent Manager', 'Service Line'),
  ctrl.candidaturasForaSLA
);

router.use(autorizarPerfis('Administrador'));

router.put('/:fase', ctrl.atualizar);
router.post('/:idCandidatura/notificar', ctrl.notificar);

module.exports = router;
