const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/avisosController');
const { autenticar } = require('../middleware/autenticar');
const { autorizarPerfis } = require('../middleware/autorizar');

router.use(autenticar);

router.get('/', ctrl.listarAtivos);
router.get('/todos',
  autorizarPerfis('Administrador', 'Service Line', 'Talent Manager'),
  ctrl.listarTodos
);

// Gestão de avisos: Administrador, Service Line e Talent Manager (req. Informações/Avisos)
router.use(autorizarPerfis('Administrador', 'Service Line', 'Talent Manager'));
router.post('/',       ctrl.criar);
router.put('/:id',     ctrl.atualizar);
router.delete('/:id',  ctrl.eliminar);

module.exports = router;
