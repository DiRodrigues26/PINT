const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/totpController');
const { autenticar } = require('../middleware/autenticar');
const { criarRateLimit } = require('../middleware/rateLimit');

router.use(autenticar);

const limitar2FAConta = criarRateLimit({
  janelaMs: 5 * 60 * 1000,
  max: 8,
  chave: (req) => req.utilizador?.id_utilizador || req.ip,
  mensagem: 'Demasiadas tentativas de configuração 2FA. Tente novamente mais tarde.',
});

router.get('/estado',    ctrl.estado);
router.post('/setup',    limitar2FAConta, ctrl.setup);
router.post('/ativar',   limitar2FAConta, ctrl.ativar);
router.post('/desativar', limitar2FAConta, ctrl.desativar);

module.exports = router;
