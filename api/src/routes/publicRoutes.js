const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/badgeAtribuidoController');
const badgesCtrl = require('../controllers/badgesController');
const slCtrl = require('../controllers/serviceLinesController');
const areaCtrl = require('../controllers/areasController');

router.get('/badges/:token', ctrl.verificarPublico);
router.get('/badge/:id',     badgesCtrl.badgePublico);
router.get('/perfis/:slug',  ctrl.perfilPublico);
router.get('/service-lines', slCtrl.listar);
router.get('/areas',         areaCtrl.listar);

module.exports = router;
