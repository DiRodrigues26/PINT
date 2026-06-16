/*
 * Migração não-destrutiva: cria a tabela `config_notificacao` (configuração
 * global de notificações) se ainda não existir e garante a linha única id_config=1.
 * Uso: node scripts/migrar-config-notificacao.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { pool } = require('../src/db/connection');

const DDL = `
CREATE TABLE IF NOT EXISTS \`config_notificacao\` (
  \`id_config\` int unsigned NOT NULL,
  \`email_confirmacao_registo\` tinyint(1) NOT NULL DEFAULT '1',
  \`email_redefinicao_password\` tinyint(1) NOT NULL DEFAULT '1',
  \`email_candidatura_badge\` tinyint(1) NOT NULL DEFAULT '1',
  \`notif_aprovacao_badge\` tinyint(1) NOT NULL DEFAULT '1',
  \`notif_rejeicao_badge\` tinyint(1) NOT NULL DEFAULT '1',
  \`alerta_sla_ultrapassado\` tinyint(1) NOT NULL DEFAULT '1',
  \`canal_email\` tinyint(1) NOT NULL DEFAULT '1',
  \`canal_plataforma\` tinyint(1) NOT NULL DEFAULT '1',
  \`canal_push\` tinyint(1) NOT NULL DEFAULT '0',
  \`updated_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id_config\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

(async () => {
  try {
    await pool.query(DDL);
    await pool.query('INSERT IGNORE INTO config_notificacao (id_config) VALUES (1)');
    const [linhas] = await pool.query('SELECT * FROM config_notificacao WHERE id_config = 1');
    console.log('✅ Tabela config_notificacao pronta. Linha atual:');
    console.log(linhas[0]);
    process.exit(0);
  } catch (err) {
    console.error('❌ Erro na migração:', err.message);
    process.exit(1);
  }
})();
