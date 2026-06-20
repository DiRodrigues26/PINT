/*
 * Utilitário de notificações push (Firebase Cloud Messaging) para a app mobile.
 *
 * Credenciais: lê a service account do Firebase a partir da variável de ambiente
 *   FIREBASE_SERVICE_ACCOUNT  (o JSON completo da chave da service account).
 * Se a variável não estiver definida, o push fica simplesmente desativado e o
 * resto da aplicação continua a funcionar normalmente.
 *
 * Os tokens dos dispositivos são guardados na tabela `device_token` (criada
 * automaticamente no primeiro uso).
 */
const { pool } = require('../db/connection');

let admin = null;
let inicializado = false;
let disponivel = false;

function inicializar() {
  if (inicializado) return disponivel;
  inicializado = true;
  try {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) {
      console.log('🔕 [PUSH] FIREBASE_SERVICE_ACCOUNT não definido — push desativado.');
      return false;
    }
    admin = require('firebase-admin');
    // Aceita o JSON da service account diretamente OU codificado em base64.
    let jsonStr = raw.trim();
    if (!jsonStr.startsWith('{')) {
      jsonStr = Buffer.from(jsonStr, 'base64').toString('utf8');
    }
    const cred = JSON.parse(jsonStr);
    if (!admin.apps.length) {
      admin.initializeApp({ credential: admin.credential.cert(cred) });
    }
    disponivel = true;
    console.log('🔔 [PUSH] Firebase Admin inicializado.');
  } catch (err) {
    console.warn('⚠️ [PUSH] Não foi possível inicializar o Firebase Admin:', err.message);
    disponivel = false;
  }
  return disponivel;
}

async function garantirTabelaTokens() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS device_token (
      id_token int unsigned NOT NULL AUTO_INCREMENT,
      id_utilizador int unsigned NOT NULL,
      token varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
      plataforma varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
      created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id_token),
      UNIQUE KEY uq_device_token (token),
      KEY idx_dt_utilizador (id_utilizador),
      CONSTRAINT fk_dt_utilizador FOREIGN KEY (id_utilizador)
        REFERENCES utilizador (id_utilizador) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function guardarToken(idUtilizador, token, plataforma) {
  await garantirTabelaTokens();
  await pool.query(
    `INSERT INTO device_token (id_utilizador, token, plataforma)
       VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE
       id_utilizador = VALUES(id_utilizador),
       plataforma = VALUES(plataforma),
       updated_at = CURRENT_TIMESTAMP`,
    [idUtilizador, token, plataforma || null]
  );
}

async function removerToken(idUtilizador, token) {
  await garantirTabelaTokens();
  await pool.query(
    'DELETE FROM device_token WHERE token = ? AND id_utilizador = ?',
    [token, idUtilizador]
  );
}

async function tokensDeUtilizadores(ids) {
  if (!ids || ids.length === 0) return [];
  await garantirTabelaTokens();
  const [linhas] = await pool.query(
    `SELECT token FROM device_token WHERE id_utilizador IN (${ids.map(() => '?').join(',')})`,
    ids
  );
  return linhas.map((l) => l.token);
}

/**
 * Envia uma notificação push para todos os dispositivos dos utilizadores indicados.
 * Best-effort: nunca lança erro; tokens inválidos são removidos automaticamente.
 */
async function enviarPushParaUtilizadores(ids, { titulo, mensagem, dados = {} }) {
  if (!inicializar()) return { enviadas: 0, motivo: 'push indisponível' };

  const tokens = await tokensDeUtilizadores(ids);
  if (tokens.length === 0) return { enviadas: 0 };

  const dadosStr = {};
  for (const [k, v] of Object.entries(dados)) dadosStr[k] = String(v);

  try {
    const resp = await admin.messaging().sendEachForMulticast({
      notification: { title: titulo, body: mensagem },
      data: dadosStr,
      tokens,
    });

    // Limpar tokens que já não são válidos
    const invalidos = [];
    resp.responses.forEach((r, i) => {
      if (!r.success) {
        const code = r.error && r.error.code;
        if (
          code === 'messaging/registration-token-not-registered' ||
          code === 'messaging/invalid-argument'
        ) {
          invalidos.push(tokens[i]);
        }
      }
    });
    if (invalidos.length) {
      await pool.query(
        `DELETE FROM device_token WHERE token IN (${invalidos.map(() => '?').join(',')})`,
        invalidos
      );
    }

    return { enviadas: resp.successCount };
  } catch (err) {
    console.warn('⚠️ [PUSH] Falha ao enviar push:', err.message);
    return { enviadas: 0, erro: err.message };
  }
}

module.exports = {
  inicializar,
  garantirTabelaTokens,
  guardarToken,
  removerToken,
  tokensDeUtilizadores,
  enviarPushParaUtilizadores,
};
