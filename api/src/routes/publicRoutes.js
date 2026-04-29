const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/badgeAtribuidoController');
const slCtrl = require('../controllers/serviceLinesController');

router.get('/badges/:token', ctrl.verificarPublico);
router.get('/perfis/:slug',  ctrl.perfilPublico);
router.get('/service-lines', slCtrl.listar);

module.exports = router;
