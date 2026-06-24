const { pool } = require('../db/connection');

/*
 * Acesso à configuração global de notificações (tabela config_notificacao, linha id=1).
 * Determina se um determinado evento deve disparar email / notificação na plataforma,
 * combinando o flag do evento com o flag do canal.
 *
 * Os pontos de envio (authController, candidaturasController, slaController) consultam
 * estas funções antes de enviar. Cache curto em memória para evitar ir à BD a cada envio;
 * invalidarCache() é chamado quando a config é atualizada no admin.
 */

const TTL_MS = 30_000;
let cache = null;
let cacheExpira = 0;

const DEFAULTS = {
  email_confirmacao_registo: 1,
  email_redefinicao_password: 1,
  email_candidatura_badge: 1,
  notif_aprovacao_badge: 1,
  notif_rejeicao_badge: 1,
  alerta_sla_ultrapassado: 1,
  canal_email: 1,
  canal_plataforma: 1,
  canal_push: 0,
};

async function obterConfig() {
  if (cache && Date.now() < cacheExpira) return cache;
  try {
    const [linhas] = await pool.query('SELECT * FROM config_notificacao WHERE id_config = 1');
    cache = linhas[0] || { ...DEFAULTS };
  } catch (_) {
    // Em caso de falha de leitura, não bloquear envios: assumir defaults (tudo ligado).
    cache = { ...DEFAULTS };
  }
  cacheExpira = Date.now() + TTL_MS;
  return cache;
}

async function podeEnviarEmail(evento) {
  const c = await obterConfig();
  return Boolean(c.canal_email) && Boolean(c[evento]);
}

async function podeNotificarPlataforma(evento) {
  const c = await obterConfig();
  return Boolean(c.canal_plataforma) && Boolean(c[evento]);
}

async function podeEnviarPush(evento) {
  const c = await obterConfig();
  return Boolean(c.canal_push) && Boolean(c[evento]);
}

function invalidarCache() {
  cache = null;
  cacheExpira = 0;
}

module.exports = { obterConfig, podeEnviarEmail, podeNotificarPlataforma, podeEnviarPush, invalidarCache };
