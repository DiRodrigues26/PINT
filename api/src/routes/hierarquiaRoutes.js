const express = require('express');
const { autenticar } = require('../middleware/autenticar');
const { autorizarPerfis } = require('../middleware/autorizar');

const lp  = require('../controllers/learningPathsController');
const sl  = require('../controllers/serviceLinesController');
const ar  = require('../controllers/areasController');
const nv  = require('../controllers/niveisController');
const rq  = require('../controllers/requisitosController');

function montar(ctrl) {
  const router = express.Router();

  router.use(autenticar);
  router.get('/',    ctrl.listar);
  router.get('/:id', ctrl.obter);

  router.use(autorizarPerfis('Administrador'));
  router.post('/',       ctrl.criar);
  router.put('/:id',     ctrl.atualizar);
  router.delete('/:id',  ctrl.eliminar);

  return router;
}

module.exports = {
  learningPaths: montar(lp),
  serviceLines:  montar(sl),
  areas:         montar(ar),
  niveis:        montar(nv),
  requisitos:    montar(rq),
};
