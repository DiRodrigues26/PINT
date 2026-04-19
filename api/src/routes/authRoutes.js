const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/authController');
const { autenticar } = require('../middleware/autenticar');

router.post('/registo', ctrl.registar);
router.get('/confirmar-email', ctrl.confirmarEmail);
router.post('/login', ctrl.login);
router.post('/recuperar-password', ctrl.pedirRecuperacao);
router.post('/redefinir-password', ctrl.redefinirPassword);

router.post('/primeiro-login', autenticar, ctrl.alterarPasswordPrimeiroLogin);
router.get('/eu', autenticar, ctrl.eu);

module.exports = router;
