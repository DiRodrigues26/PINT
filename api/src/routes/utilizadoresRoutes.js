const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/utilizadoresController');
const { autenticar } = require('../middleware/autenticar');
const { autorizarPerfis } = require('../middleware/autorizar');

router.use(autenticar);

router.get('/eu/perfil', (req, res) => res.json({ utilizador: req.utilizador }));
router.put('/eu/perfil', ctrl.atualizarMeuPerfil);
router.put('/eu/password', ctrl.alterarMinhaPassword);

router.use(autorizarPerfis('Administrador'));

router.get('/',    ctrl.listar);
router.post('/',   ctrl.criar);
router.get('/:id', ctrl.obter);
router.put('/:id', ctrl.atualizar);
router.delete('/:id', ctrl.desativar);
router.put('/:id/perfis', ctrl.definirPerfis);

module.exports = router;
