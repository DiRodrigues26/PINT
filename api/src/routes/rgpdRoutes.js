const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/rgpdController');
const { autenticar } = require('../middleware/autenticar');

router.use(autenticar);
router.get('/',  ctrl.listarMeus);
router.post('/', ctrl.registar);

module.exports = router;
