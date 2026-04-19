const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/badgeAtribuidoController');

router.get('/badges/:token', ctrl.verificarPublico);
router.get('/perfis/:slug',  ctrl.perfilPublico);

module.exports = router;
