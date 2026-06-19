const { pool } = require('../db/connection');

const TOKEN_CONFIRMACAO_MS = 24 * 60 * 60 * 1000;
let colunaPreparada = false;

function dataExpiracaoConfirmacao() {
  return new Date(Date.now() + TOKEN_CONFIRMACAO_MS);
}

function tokenConfirmacaoExpirado(data) {
  return !!data && new Date(data).getTime() <= Date.now();
}

async function garantirColunaTokenConfirmacaoExpira() {
  if (colunaPreparada) return;

  const [linhas] = await pool.query(
    `SELECT COUNT(*) AS total
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'utilizador'
        AND COLUMN_NAME = 'token_confirmacao_expira'`
  );

  if (Number(linhas[0]?.total) === 0) {
    try {
      await pool.query(
        `ALTER TABLE utilizador
           ADD COLUMN token_confirmacao_expira datetime DEFAULT NULL
           AFTER token_confirmacao_email`
      );
    } catch (err) {
      if (err.code !== 'ER_DUP_FIELDNAME') throw err;
    }
  }

  colunaPreparada = true;
}

module.exports = {
  dataExpiracaoConfirmacao,
  garantirColunaTokenConfirmacaoExpira,
  tokenConfirmacaoExpirado,
};
