const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/badgeAtribuidoController');
const { autenticar } = require('../middleware/autenticar');
const { autorizarPerfis } = require('../middleware/autorizar');

router.use(autenticar);

router.get('/meus',                    ctrl.listarMeus);
router.get('/proximos-expiracao',
  autorizarPerfis('Administrador', 'Talent Manager'),
  ctrl.badgesProximosExpiracao
);
router.get('/consultor/:id',           ctrl.listarDeConsultor);
router.post('/:id/publicar',           ctrl.publicar);
router.post('/:id/despublicar',        ctrl.despublicar);
router.post('/:id/linkedin',           ctrl.marcarPartilhadoLinkedin);

module.exports = router;
