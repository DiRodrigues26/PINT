const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/authController');
const { autenticar } = require('../middleware/autenticar');
const { chaveIpEmail, chaveIpToken, criarRateLimit } = require('../middleware/rateLimit');

const limitarRegisto = criarRateLimit({
  janelaMs: 60 * 60 * 1000,
  max: 5,
  mensagem: 'Demasiadas tentativas de registo. Tente novamente mais tarde.',
});
const limitarLogin = criarRateLimit({
  janelaMs: 15 * 60 * 1000,
  max: 8,
  chave: chaveIpEmail,
  mensagem: 'Demasiadas tentativas de login. Tente novamente mais tarde.',
});
const limitar2FA = criarRateLimit({
  janelaMs: 5 * 60 * 1000,
  max: 6,
  chave: chaveIpToken,
  mensagem: 'Demasiadas tentativas de 2FA. Inicie sessão novamente mais tarde.',
});
const limitarRecuperacao = criarRateLimit({
  janelaMs: 15 * 60 * 1000,
  max: 3,
  chave: chaveIpEmail,
  mensagem: 'Demasiados pedidos de recuperação. Tente novamente mais tarde.',
});
const limitarToken = criarRateLimit({
  janelaMs: 15 * 60 * 1000,
  max: 8,
  chave: chaveIpToken,
  mensagem: 'Demasiadas tentativas com este token. Tente novamente mais tarde.',
});

router.post('/registo', limitarRegisto, ctrl.registar);
router.post('/confirmar-email', limitarToken, ctrl.confirmarEmail);
router.post('/completar-perfil', limitarToken, ctrl.completarPerfil);
router.post('/login', limitarLogin, ctrl.login);
router.post('/verificar-2fa', limitar2FA, ctrl.verificarDoisFatores);
router.post('/recuperar-password', limitarRecuperacao, ctrl.pedirRecuperacao);
router.post('/redefinir-password', limitarToken, ctrl.redefinirPassword);

router.post('/primeiro-login', autenticar, ctrl.alterarPasswordPrimeiroLogin);
router.get('/eu', autenticar, ctrl.eu);

module.exports = router;
