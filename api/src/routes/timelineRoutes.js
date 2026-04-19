const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/timelineController');
const { autenticar } = require('../middleware/autenticar');

router.use(autenticar);

router.get('/',       ctrl.listar);
router.post('/',      ctrl.criar);
router.put('/:id',    ctrl.atualizar);
router.delete('/:id', ctrl.eliminar);

module.exports = router;
