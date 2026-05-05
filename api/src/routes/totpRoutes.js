const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/totpController');
const { autenticar } = require('../middleware/autenticar');

router.use(autenticar);

router.get('/estado',    ctrl.estado);
router.post('/setup',    ctrl.setup);
router.post('/ativar',   ctrl.ativar);
router.post('/desativar', ctrl.desativar);

module.exports = router;
