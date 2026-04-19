const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/avisosController');
const { autenticar } = require('../middleware/autenticar');
const { autorizarPerfis } = require('../middleware/autorizar');

router.use(autenticar);

router.get('/', ctrl.listarAtivos);
router.get('/todos',
  autorizarPerfis('Administrador', 'Talent Manager', 'Service Line'),
  ctrl.listarTodos
);

router.use(autorizarPerfis('Administrador', 'Talent Manager', 'Service Line'));
router.post('/',       ctrl.criar);
router.put('/:id',     ctrl.atualizar);
router.delete('/:id',  ctrl.eliminar);

module.exports = router;
